<?php

namespace Tests\Feature;

use App\Models\FeatureFlag;
use App\Models\FeatureFlagDecision;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminStatsTest extends TestCase
{
    use RefreshDatabase;

    private function actAsAdmin(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
    }

    public function test_stats_endpoint_requires_authentication(): void
    {
        $this->getJson('/api/admin/stats')->assertStatus(401);
    }

    public function test_stats_endpoint_rejects_non_admin(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'customer']));
        $this->getJson('/api/admin/stats')->assertStatus(403);
    }

    public function test_stats_endpoint_returns_overview(): void
    {
        FeatureFlag::create([
            'key' => 'flag-a', 'name' => 'A',
            'enabled' => true, 'default_value' => true,
            'rules' => [
                ['type' => 'percentage_rollout', 'percentage' => 50, 'salt' => 'x', 'result' => true],
            ],
        ]);
        FeatureFlag::create([
            'key' => 'flag-b', 'name' => 'B',
            'enabled' => false, 'default_value' => false, 'rules' => [],
            'starts_at' => now()->addDays(2),
        ]);

        FeatureFlagDecision::create([
            'flag_key' => 'flag-a', 'result' => true, 'reason' => 'default',
            'user_key' => 'u', 'attributes' => null, 'decided_at' => now()->subHours(2),
        ]);

        $this->actAsAdmin();

        $body = $this->getJson('/api/admin/stats')
            ->assertOk()
            ->json();

        $this->assertSame(2, $body['total_flags']);
        $this->assertSame(1, $body['active_rollouts']);
        $this->assertSame(1, $body['scheduled']);
        $this->assertSame('flag-b', $body['next_scheduled_key']);
        $this->assertGreaterThanOrEqual(1, $body['evaluations_24h']);
        $this->assertArrayHasKey('flag-a', $body['evaluations_24h_by_flag']);
        $this->assertSame(900, $body['cache']['ttl_seconds']);
        $this->assertSame('ok', $body['cache']['status']);
    }
}
