<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Demo personas chosen so each one makes a different rule in FeatureFlagSeeder
 * fire (customer/QA/staff/admin × NL/US, plus alice/bob landing on opposite
 * sides of the ai-damage-analysis 35% bucket). Idempotent via updateOrCreate
 * on email; all personas share the password `password`.
 */
class UserSeeder extends Seeder
{
    public const DEMO_PASSWORD = 'password';

    public function run(): void
    {
        $personas = [
            ['name' => 'Alice (Customer NL)', 'email' => 'alice@example.com',    'role' => 'customer', 'country' => 'NL'],
            ['name' => 'Bob (Customer US)',   'email' => 'bob@example.com',      'role' => 'customer', 'country' => 'US'],
            ['name' => 'QA — Alice',          'email' => 'qa.alice@example.com', 'role' => 'qa',       'country' => 'NL'],
            ['name' => 'QA — Bob',            'email' => 'qa.bob@example.com',   'role' => 'qa',       'country' => 'NL'],
            ['name' => 'Mona (Staff)',        'email' => 'mona@example.com',     'role' => 'staff',    'country' => 'NL'],
            ['name' => 'Roy (Admin)',         'email' => 'roy@example.com',      'role' => 'admin',    'country' => 'NL'],
        ];

        foreach ($personas as $p) {
            User::updateOrCreate(
                ['email' => $p['email']],
                [
                    'name' => $p['name'],
                    'role' => $p['role'],
                    'country' => $p['country'],
                    'password' => Hash::make(self::DEMO_PASSWORD),
                ],
            );
        }
    }
}
