<?php

namespace Tests\Feature;

use App\Models\FeatureFlag;
use App\Models\FeatureFlagDecision;
use App\Models\User;
use App\Services\FeatureFlags\DecisionLogger;
use App\Services\FeatureFlags\EvaluationContext;
use App\Services\FeatureFlags\EvaluationResult;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DecisionLogTest extends TestCase
{
    use RefreshDatabase;

    private function actAsAdmin(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
    }

    public function test_evaluation_writes_decisions_after_response(): void
    {
        FeatureFlag::create([
            'key' => 'flag-a', 'name' => 'A',
            'enabled' => true, 'default_value' => true, 'rules' => [],
        ]);

        $user = User::factory()->create(['email' => 'u1@example.com']);
        Sanctum::actingAs($user);

        $this->postJson('/api/v1/flags/evaluate')
            ->assertOk();

        $this->assertDatabaseHas('feature_flag_decisions', [
            'flag_key' => 'flag-a',
            'user_key' => 'u1@example.com',
            'result' => true,
            'reason' => 'default',
        ]);
    }

    public function test_admin_decisions_endpoint_requires_admin_role(): void
    {
        $this->getJson('/api/admin/decisions')->assertStatus(401);

        Sanctum::actingAs(User::factory()->create(['role' => 'customer']));
        $this->getJson('/api/admin/decisions')->assertStatus(403);
    }

    public function test_admin_decisions_endpoint_returns_rows_and_aggregates(): void
    {
        FeatureFlag::create([
            'key' => 'flag-a', 'name' => 'A',
            'enabled' => true, 'default_value' => true, 'rules' => [],
        ]);
        FeatureFlag::create([
            'key' => 'flag-b', 'name' => 'B',
            'enabled' => false, 'default_value' => false, 'rules' => [],
        ]);

        $u1 = User::factory()->create();
        $u2 = User::factory()->create();

        Sanctum::actingAs($u1);
        $this->postJson('/api/v1/flags/evaluate');
        Sanctum::actingAs($u2);
        $this->postJson('/api/v1/flags/evaluate');

        $this->actAsAdmin();

        $body = $this->getJson('/api/admin/decisions')
            ->assertOk()
            ->json();

        $this->assertGreaterThanOrEqual(4, $body['aggregates']['total']);
        $this->assertArrayHasKey('default', $body['aggregates']['by_reason']);
        $this->assertArrayHasKey('disabled', $body['aggregates']['by_reason']);
        $this->assertSame(2, $body['aggregates']['by_result']['true'] ?? 0);
        $this->assertSame(2, $body['aggregates']['by_result']['false'] ?? 0);
        $this->assertNotEmpty($body['data']);
    }

    public function test_admin_decisions_filter_by_flag(): void
    {
        FeatureFlag::create([
            'key' => 'flag-a', 'name' => 'A',
            'enabled' => true, 'default_value' => true, 'rules' => [],
        ]);
        FeatureFlag::create([
            'key' => 'flag-b', 'name' => 'B',
            'enabled' => true, 'default_value' => true, 'rules' => [],
        ]);

        Sanctum::actingAs(User::factory()->create());
        $this->postJson('/api/v1/flags/evaluate');

        $this->actAsAdmin();

        $this->getJson('/api/admin/decisions?flag_key=flag-a')
            ->assertOk()
            ->assertJsonPath('aggregates.total', 1)
            ->assertJsonPath('data.0.flag_key', 'flag-a');
    }

    public function test_sampling_skips_writes(): void
    {
        $logger = new DecisionLogger(sampleRate: 0.0);
        $ctx = new EvaluationContext('u');
        $result = new EvaluationResult(true, 'default');
        for ($i = 0; $i < 50; $i++) {
            $logger->record('flag-a', $result, $ctx);
        }
        $this->assertSame(0, $logger->bufferedCount());
    }

    public function test_purge_command_removes_old_rows(): void
    {
        FeatureFlagDecision::create([
            'flag_key' => 'flag-a', 'result' => true, 'reason' => 'default',
            'user_key' => 'u', 'attributes' => null,
            'decided_at' => now()->subDays(40),
        ]);
        FeatureFlagDecision::create([
            'flag_key' => 'flag-a', 'result' => true, 'reason' => 'default',
            'user_key' => 'u', 'attributes' => null,
            'decided_at' => now()->subDays(2),
        ]);

        $this->artisan('flags:purge-decisions', ['--days' => 30])->assertOk();

        $this->assertSame(1, FeatureFlagDecision::count());
    }
}
