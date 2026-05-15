<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\LoginRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * Password auth issuing short-lived Sanctum tokens stored by the Next.js BFF
 * in a cookie. Replaces the demo-only static admin token.
 */
class AuthController
{
    public function login(LoginRequest $request): JsonResponse
    {
        $data = $request->validated();
        $user = User::query()->where('email', $data['email'])->first();

        if ($user === null || ! Hash::check($data['password'], $user->password)) {
            // Identical message either way: don't leak which emails exist.
            throw ValidationException::withMessages([
                'email' => ['Invalid email or password.'],
            ]);
        }

        // One active session per user; matches ImpersonateController so the
        // admin always has exactly one outstanding token to stash/restore.
        $user->tokens()->delete();

        $token = $user->createToken('auth', expiresAt: now()->addMinutes(
            (int) config('sanctum.expiration', 60),
        ));

        return response()->json([
            'token' => $token->plainTextToken,
            'expires_at' => optional($token->accessToken->expires_at)->toIso8601String(),
            'user' => UserResource::make($user),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $token = $request->user()?->currentAccessToken();
        if ($token !== null) {
            $token->delete();
        }

        return response()->json(['ok' => true]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => UserResource::make($request->user()),
        ]);
    }
}
