<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Authorize role=admin. Runs after `auth:sanctum`, so a missing user is the
 * defensive 401; the typical failure mode here is 403 for non-admins.
 */
class AdminRole
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user === null) {
            return new JsonResponse(['error' => 'unauthorized'], 401);
        }

        if (($user->role ?? null) !== 'admin') {
            return new JsonResponse(['error' => 'forbidden'], 403);
        }

        return $next($request);
    }
}
