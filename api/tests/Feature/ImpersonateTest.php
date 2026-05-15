<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\PersonalAccessToken;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ImpersonateTest extends TestCase
{
    use RefreshDatabase;

    private function actAsAdmin(): User
    {
        $admin = User::factory()->create(['email' => 'admin@example.com', 'role' => 'admin']);
        Sanctum::actingAs($admin);

        return $admin;
    }

    public function test_impersonate_requires_authentication(): void
    {
        $this->postJson('/api/admin/impersonate', ['email' => 'a@example.com'])
            ->assertStatus(401);
    }

    public function test_impersonate_rejects_non_admin_user(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'customer']));
        $this->postJson('/api/admin/impersonate', ['email' => 'a@example.com'])
            ->assertStatus(403);
    }

    public function test_impersonate_returns_a_fresh_token_for_the_user(): void
    {
        $this->actAsAdmin();
        $user = User::factory()->create(['email' => 'alice@example.com', 'role' => 'staff']);

        $body = $this->postJson('/api/admin/impersonate', ['email' => 'alice@example.com'])
            ->assertOk()
            ->assertJsonPath('user.email', 'alice@example.com')
            ->assertJsonPath('user.role', 'staff')
            ->json();

        $this->assertArrayHasKey('token', $body);
        $this->assertNotEmpty($body['token']);

        $resolved = PersonalAccessToken::findToken($body['token']);
        $this->assertNotNull($resolved);
        $this->assertSame($user->id, $resolved->tokenable_id);
    }

    public function test_impersonate_revokes_previous_tokens_for_target_user_only(): void
    {
        $admin = $this->actAsAdmin();
        $adminTokensBefore = $admin->tokens()->count();

        $user = User::factory()->create(['email' => 'alice@example.com']);
        $user->createToken('previous-session');
        $this->assertSame(1, $user->tokens()->count());

        $this->postJson('/api/admin/impersonate', ['email' => 'alice@example.com'])
            ->assertOk();

        // Only the freshly-minted token remains for the target user.
        $this->assertSame(1, $user->tokens()->count());

        // Admin's tokens are untouched — the BFF stash relies on this.
        $this->assertSame($adminTokensBefore, $admin->tokens()->count());
    }

    public function test_impersonate_returns_404_for_unknown_user(): void
    {
        $this->actAsAdmin();
        $this->postJson('/api/admin/impersonate', ['email' => 'ghost@example.com'])
            ->assertStatus(404)
            ->assertJsonPath('error', 'unknown_user');
    }

    public function test_impersonate_blocks_self_impersonation(): void
    {
        $this->actAsAdmin();
        $this->postJson('/api/admin/impersonate', ['email' => 'admin@example.com'])
            ->assertStatus(422)
            ->assertJsonPath('error', 'cannot_impersonate_self');
    }

    public function test_persona_list_returns_seeded_users(): void
    {
        $this->actAsAdmin();
        User::factory()->create(['email' => 'alice@example.com', 'role' => 'staff', 'country' => 'NL']);
        User::factory()->create(['email' => 'bob@example.com',   'role' => 'customer', 'country' => 'US']);

        $body = $this->getJson('/api/admin/personas')
            ->assertOk()
            ->json();

        // Admin actor + the two created above.
        $this->assertGreaterThanOrEqual(3, count($body['data']));
        $emails = array_column($body['data'], 'email');
        $this->assertContains('alice@example.com', $emails);
        $this->assertContains('bob@example.com', $emails);
    }

    public function test_persona_list_rejects_non_admin(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'customer']));
        $this->getJson('/api/admin/personas')->assertStatus(403);
    }
}
