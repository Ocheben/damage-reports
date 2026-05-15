<?php

namespace App\Http\Controllers\Admin;

use App\Models\User;
use Illuminate\Http\JsonResponse;

/**
 * Seeded demo personas for the client switcher. Admin-gated because in a
 * real deployment the user list isn't a public endpoint.
 */
class PersonaController
{
    public function __invoke(): JsonResponse
    {
        $users = User::query()
            ->orderBy('id')
            ->get(['id', 'name', 'email', 'role', 'country'])
            ->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'role' => $u->role,
                'country' => $u->country,
            ]);

        return response()->json(['data' => $users]);
    }
}
