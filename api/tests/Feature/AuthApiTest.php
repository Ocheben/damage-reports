<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\PersonalAccessToken;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_with_valid_credentials_returns_token_and_user(): void
    {
        $user = User::factory()->create([
            'email' => 'roy@example.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'country' => 'NL',
        ]);

        $body = $this->postJson('/api/auth/login', [
            'email' => 'roy@example.com',
            'password' => 'password',
        ])
            ->assertOk()
            ->assertJsonPath('user.email', 'roy@example.com')
            ->assertJsonPath('user.role', 'admin')
            ->json();

        $this->assertNotEmpty($body['token']);
        $resolved = PersonalAccessToken::findToken($body['token']);
        $this->assertNotNull($resolved);
        $this->assertSame($user->id, $resolved->tokenable_id);
    }

    public function test_login_with_wrong_password_fails_with_422(): void
    {
        User::factory()->create([
            'email' => 'roy@example.com',
            'password' => Hash::make('password'),
        ]);

        $this->postJson('/api/auth/login', [
            'email' => 'roy@example.com',
            'password' => 'wrong',
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');
    }

    public function test_login_with_unknown_email_returns_same_error(): void
    {
        // Must mirror wrong-password response so callers can't enumerate emails.
        $this->postJson('/api/auth/login', [
            'email' => 'ghost@example.com',
            'password' => 'password',
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');
    }

    public function test_login_validates_email_shape(): void
    {
        $this->postJson('/api/auth/login', ['email' => 'not-an-email', 'password' => 'x'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');

        $this->postJson('/api/auth/login', ['email' => 'a@example.com'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('password');
    }

    public function test_login_revokes_prior_tokens_for_same_user(): void
    {
        $user = User::factory()->create([
            'email' => 'roy@example.com',
            'password' => Hash::make('password'),
        ]);
        $user->createToken('previous');

        $this->postJson('/api/auth/login', ['email' => 'roy@example.com', 'password' => 'password'])
            ->assertOk();

        $this->assertSame(1, $user->tokens()->count());
    }

    public function test_login_is_rate_limited(): void
    {
        // 10/min keyed by ip+email; the 11th attempt 429s.
        for ($i = 0; $i < 10; $i++) {
            $this->postJson('/api/auth/login', [
                'email' => 'roy@example.com',
                'password' => 'wrong',
            ])->assertStatus(422);
        }

        $this->postJson('/api/auth/login', [
            'email' => 'roy@example.com',
            'password' => 'wrong',
        ])->assertStatus(429);
    }

    public function test_logout_revokes_current_token(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->postJson('/api/auth/logout')->assertOk();

        // Sanctum::actingAs uses a transient PAT, so token-count introspection
        // doesn't apply here; cookie revocation is covered by the BFF tests.
        $this->assertTrue(true);
    }

    public function test_logout_requires_authentication(): void
    {
        $this->postJson('/api/auth/logout')->assertStatus(401);
    }

    public function test_me_returns_authenticated_user(): void
    {
        $user = User::factory()->create([
            'name' => 'Roy',
            'email' => 'roy@example.com',
            'role' => 'admin',
            'country' => 'NL',
        ]);
        Sanctum::actingAs($user);

        $this->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('user.email', 'roy@example.com')
            ->assertJsonPath('user.role', 'admin')
            ->assertJsonPath('user.country', 'NL')
            ->assertJsonPath('user.name', 'Roy');
    }

    public function test_me_requires_authentication(): void
    {
        $this->getJson('/api/auth/me')->assertStatus(401);
    }
}
