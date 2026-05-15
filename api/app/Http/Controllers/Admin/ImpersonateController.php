<?php

namespace App\Http\Controllers\Admin;

use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Mints a Sanctum token for the requested user. Admin-gated. The acting
 * admin's token is untouched — the BFF stashes it so "stop impersonating"
 * restores the admin session without re-login.
 */
class ImpersonateController
{
    public function __invoke(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $actor = $request->user();

        // Self-impersonation would wipe the admin's own token below.
        if ($actor !== null && strcasecmp($actor->email, $data['email']) === 0) {
            return response()->json(['error' => 'cannot_impersonate_self'], 422);
        }

        $user = User::query()->where('email', $data['email'])->first();
        if ($user === null) {
            return response()->json(['error' => 'unknown_user'], 404);
        }

        // One active session per persona.
        $user->tokens()->delete();

        $token = $user->createToken('impersonation', expiresAt: now()->addMinutes(
            (int) config('sanctum.expiration', 60),
        ));

        return response()->json([
            'token' => $token->plainTextToken,
            'expires_at' => optional($token->accessToken->expires_at)->toIso8601String(),
            'user' => UserResource::make($user),
        ]);
    }
}
