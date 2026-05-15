<?php

namespace Tests\Feature;

use App\Models\FeatureFlag;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FeatureFlagApiTest extends TestCase
{
    use RefreshDatabase;

    private function actAsAdmin(): User
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        return $admin;
    }

    public function test_admin_endpoints_require_authentication(): void
    {
        $this->getJson('/api/admin/flags')->assertStatus(401);
    }

    public function test_admin_endpoints_reject_non_admin_user(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'customer']));
        $this->getJson('/api/admin/flags')->assertStatus(403);
    }

    public function test_public_evaluate_allows_anonymous_callers(): void
    {
        FeatureFlag::create([
            'key' => 'flag-a', 'name' => 'A',
            'enabled' => true, 'default_value' => true, 'rules' => [],
        ]);

        $this->postJson('/api/v1/flags/evaluate')
            ->assertOk()
            ->assertJsonPath('flags.flag-a.value', true)
            ->assertJsonPath('flags.flag-a.reason', 'default');
    }

    public function test_admin_can_create_flag_with_rules(): void
    {
        $this->actAsAdmin();

        $payload = [
            'key' => 'beta-feature',
            'name' => 'Beta feature',
            'description' => 'Test',
            'enabled' => true,
            'default_value' => false,
            'rules' => [
                ['type' => 'percentage_rollout', 'percentage' => 50, 'salt' => 'beta-feature', 'result' => true],
            ],
        ];
        $this->postJson('/api/admin/flags', $payload)
            ->assertCreated()
            ->assertJsonPath('data.key', 'beta-feature')
            ->assertJsonPath('data.rules.0.type', 'percentage_rollout');
    }

    public function test_admin_can_create_flag_with_attribute_rule(): void
    {
        $this->actAsAdmin();

        $payload = [
            'key' => 'staff-only',
            'name' => 'Staff only',
            'enabled' => true,
            'default_value' => false,
            'rules' => [
                ['type' => 'attribute', 'attribute' => 'role', 'operator' => 'in', 'value' => ['staff', 'admin'], 'result' => true],
            ],
        ];
        $this->postJson('/api/admin/flags', $payload)
            ->assertCreated()
            ->assertJsonPath('data.rules.0.operator', 'in')
            ->assertJsonPath('data.rules.0.value.0', 'staff');
    }

    public function test_admin_create_rejects_unknown_rule_type(): void
    {
        $this->actAsAdmin();

        $payload = [
            'key' => 'bad-flag',
            'name' => 'Bad',
            'enabled' => true,
            'default_value' => false,
            'rules' => [['type' => 'unknown_type']],
        ];
        $this->postJson('/api/admin/flags', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors('rules.0.type');
    }

    public function test_admin_create_rejects_invalid_percentage(): void
    {
        $this->actAsAdmin();

        $payload = [
            'key' => 'bad-pct',
            'name' => 'Bad pct',
            'enabled' => true,
            'default_value' => false,
            'rules' => [
                ['type' => 'percentage_rollout', 'percentage' => 250, 'salt' => 'x', 'result' => true],
            ],
        ];
        $this->postJson('/api/admin/flags', $payload)
            ->assertStatus(422);
    }

    public function test_admin_create_rejects_invalid_attribute_operator(): void
    {
        $this->actAsAdmin();

        $payload = [
            'key' => 'bad-attr',
            'name' => 'Bad',
            'enabled' => true,
            'default_value' => false,
            'rules' => [
                ['type' => 'attribute', 'attribute' => 'role', 'operator' => 'matches', 'value' => 'x'],
            ],
        ];
        $this->postJson('/api/admin/flags', $payload)
            ->assertStatus(422);
    }

    public function test_admin_can_update_flag(): void
    {
        $this->actAsAdmin();

        $flag = FeatureFlag::create([
            'key' => 'flag-a', 'name' => 'Flag A',
            'enabled' => true, 'default_value' => false, 'rules' => [],
        ]);
        $this->patchJson("/api/admin/flags/{$flag->id}", [
            'enabled' => false,
            'description' => 'Disabled for now',
        ])
            ->assertOk()
            ->assertJsonPath('data.enabled', false)
            ->assertJsonPath('data.description', 'Disabled for now');
    }

    public function test_admin_delete_is_soft(): void
    {
        $this->actAsAdmin();

        $flag = FeatureFlag::create([
            'key' => 'flag-x', 'name' => 'Flag X',
            'enabled' => true, 'default_value' => false, 'rules' => [],
        ]);
        $this->deleteJson("/api/admin/flags/{$flag->id}")
            ->assertNoContent();

        $this->assertSoftDeleted('feature_flags', ['id' => $flag->id]);
        $this->assertNull(FeatureFlag::find($flag->id));
        $this->assertNotNull(FeatureFlag::withTrashed()->find($flag->id));
    }

    public function test_soft_deleted_flag_is_excluded_from_evaluation(): void
    {
        $flag = FeatureFlag::create([
            'key' => 'flag-a', 'name' => 'A',
            'enabled' => true, 'default_value' => true, 'rules' => [],
        ]);
        $flag->delete();

        $this->postJson('/api/v1/flags/evaluate')
            ->assertOk()
            ->assertJsonMissingPath('flags.flag-a');
    }

    public function test_public_evaluate_uses_authenticated_user_attributes(): void
    {
        FeatureFlag::create([
            'key' => 'staff-only', 'name' => 'Staff only',
            'enabled' => true, 'default_value' => false,
            'rules' => [
                ['type' => 'attribute', 'attribute' => 'role', 'operator' => 'in', 'value' => ['staff'], 'result' => true],
            ],
        ]);

        $staff = User::factory()->create(['role' => 'staff', 'country' => 'NL']);
        $customer = User::factory()->create(['role' => 'customer', 'country' => 'NL']);

        Sanctum::actingAs($staff);
        $this->postJson('/api/v1/flags/evaluate')
            ->assertOk()
            ->assertJsonPath('flags.staff-only.value', true)
            ->assertJsonPath('flags.staff-only.reason', 'matched:attribute');

        Sanctum::actingAs($customer);
        $this->postJson('/api/v1/flags/evaluate')
            ->assertOk()
            ->assertJsonPath('flags.staff-only.value', false);
    }

    public function test_client_cannot_assert_role_via_header(): void
    {
        // Regression: role must come from the DB row, never from headers.
        FeatureFlag::create([
            'key' => 'staff-only', 'name' => 'Staff only',
            'enabled' => true, 'default_value' => false,
            'rules' => [
                ['type' => 'attribute', 'attribute' => 'role', 'operator' => 'in', 'value' => ['staff'], 'result' => true],
            ],
        ]);

        $customer = User::factory()->create(['role' => 'customer']);
        Sanctum::actingAs($customer);

        $this->postJson('/api/v1/flags/evaluate', [], ['X-User-Role' => 'staff'])
            ->assertOk()
            ->assertJsonPath('flags.staff-only.value', false);
    }

    public function test_public_evaluate_returns_304_on_matching_etag(): void
    {
        FeatureFlag::create([
            'key' => 'flag-a', 'name' => 'A',
            'enabled' => true, 'default_value' => true, 'rules' => [],
        ]);

        $first = $this->postJson('/api/v1/flags/evaluate');
        $etag = $first->headers->get('ETag');
        $this->assertNotNull($etag);

        $this->postJson('/api/v1/flags/evaluate', [], ['If-None-Match' => $etag])
            ->assertStatus(304);
    }

    public function test_etag_changes_when_flag_changes(): void
    {
        $flag = FeatureFlag::create([
            'key' => 'flag-a', 'name' => 'A',
            'enabled' => true, 'default_value' => true, 'rules' => [],
        ]);

        $first = $this->postJson('/api/v1/flags/evaluate');
        $firstEtag = $first->headers->get('ETag');

        $flag->update(['enabled' => false]);

        $second = $this->postJson('/api/v1/flags/evaluate');
        $this->assertNotEquals($firstEtag, $second->headers->get('ETag'));
    }

    public function test_etag_changes_when_user_changes(): void
    {
        FeatureFlag::create([
            'key' => 'flag-a', 'name' => 'A',
            'enabled' => true, 'default_value' => false,
            'rules' => [
                ['type' => 'attribute', 'attribute' => 'role', 'operator' => 'in', 'value' => ['staff'], 'result' => true],
            ],
        ]);

        $staff = User::factory()->create(['role' => 'staff']);
        $customer = User::factory()->create(['role' => 'customer']);

        Sanctum::actingAs($staff);
        $a = $this->postJson('/api/v1/flags/evaluate');

        Sanctum::actingAs($customer);
        $b = $this->postJson('/api/v1/flags/evaluate');

        $this->assertNotEquals($a->headers->get('ETag'), $b->headers->get('ETag'));
    }
}
