<?php

namespace Tests\Feature;

use App\Models\DamageReport;
use App\Models\FeatureFlag;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DamageReportApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_mutating_endpoints_require_authentication(): void
    {
        $this->postJson('/api/v1/reports', [])->assertStatus(401);
        $this->postJson('/api/v1/reports/bulk-delete', ['ids' => []])->assertStatus(401);
        $this->postJson('/api/v1/reports/1/export-pdf')->assertStatus(401);
    }

    public function test_read_endpoints_allow_anonymous(): void
    {
        DamageReport::create([
            'reporter_name' => 'A', 'reporter_email' => 'a@example.com',
            'vehicle_registration' => 'X', 'damage_type' => 'dent', 'severity' => 'minor',
            'description' => 'd',
        ]);

        $this->getJson('/api/v1/reports')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [['id', 'reference', 'reporter_email', 'vehicle_registration']],
                'links' => ['first', 'last', 'prev', 'next'],
                'meta' => ['current_page', 'last_page', 'per_page', 'total'],
            ]);
    }

    public function test_index_supports_pagination(): void
    {
        for ($i = 0; $i < 25; $i++) {
            DamageReport::create([
                'reporter_name' => "Reporter $i", 'reporter_email' => "r$i@example.com",
                'vehicle_registration' => "REG-$i", 'damage_type' => 'dent', 'severity' => 'minor',
                'description' => "report $i",
            ]);
        }

        $page1 = $this->getJson('/api/v1/reports?per_page=10')->assertOk()->json();
        $this->assertCount(10, $page1['data']);
        $this->assertSame(25, $page1['meta']['total']);
        $this->assertSame(3, $page1['meta']['last_page']);

        $this->getJson('/api/v1/reports?per_page=10&page=3')
            ->assertOk()
            ->assertJsonPath('meta.current_page', 3)
            ->assertJsonCount(5, 'data');
    }

    public function test_index_filters_by_status_and_search(): void
    {
        DamageReport::create([
            'reporter_name' => 'Alice', 'reporter_email' => 'alice@example.com',
            'vehicle_registration' => 'AB-12-CD', 'damage_type' => 'dent', 'severity' => 'minor',
            'description' => 'd', 'status' => 'approved',
        ]);
        DamageReport::create([
            'reporter_name' => 'Bob', 'reporter_email' => 'bob@example.com',
            'vehicle_registration' => 'XY-99-ZZ', 'damage_type' => 'scratch', 'severity' => 'severe',
            'description' => 'd', 'status' => 'submitted',
        ]);

        $this->getJson('/api/v1/reports?status=approved')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.reporter_name', 'Alice');

        $this->getJson('/api/v1/reports?search=alice')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.reporter_email', 'alice@example.com');

        $this->getJson('/api/v1/reports?severity=severe')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.reporter_name', 'Bob');
    }

    public function test_store_rejects_invalid_payload_with_422(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/v1/reports', [
            'reporter_email' => 'not-an-email',
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors([
                'reporter_name',
                'reporter_email',
                'vehicle_registration',
                'damage_type',
                'severity',
                'description',
            ]);
    }

    public function test_bulk_delete_rejects_unknown_ids(): void
    {
        FeatureFlag::create([
            'key' => 'bulk-actions', 'name' => 'Bulk',
            'enabled' => true, 'default_value' => true, 'rules' => [],
        ]);
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/v1/reports/bulk-delete', ['ids' => [9999]])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['ids.0']);
    }

    public function test_bulk_delete_requires_at_least_one_id(): void
    {
        FeatureFlag::create([
            'key' => 'bulk-actions', 'name' => 'Bulk',
            'enabled' => true, 'default_value' => true, 'rules' => [],
        ]);
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/v1/reports/bulk-delete', ['ids' => []])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['ids']);
    }

    public function test_authenticated_user_can_create_a_basic_report(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/v1/reports', [
            'reporter_name' => 'Alice',
            'reporter_email' => 'alice@example.com',
            'vehicle_registration' => 'AB-12-CD',
            'damage_type' => 'dent',
            'severity' => 'minor',
            'description' => 'Tiny dent on the rear bumper.',
        ])
            ->assertCreated()
            ->assertJsonPath('data.reporter_email', 'alice@example.com')
            ->assertJsonPath('data.status', 'submitted');
    }

    public function test_photos_are_dropped_when_flag_is_off(): void
    {
        FeatureFlag::create([
            'key' => 'report-photos', 'name' => 'Photos',
            'enabled' => false, 'default_value' => false, 'rules' => [],
        ]);
        Sanctum::actingAs(User::factory()->create());

        $r = $this->postJson('/api/v1/reports', [
            'reporter_name' => 'A',
            'reporter_email' => 'a@example.com',
            'vehicle_registration' => 'X',
            'damage_type' => 'dent',
            'severity' => 'minor',
            'description' => 'd',
            'photos' => [['url' => 'https://example.com/p.jpg', 'caption' => 'x']],
        ]);

        $r->assertCreated();
        $this->assertEmpty($r->json('data.photos'));
    }

    public function test_bulk_delete_returns_403_when_flag_off(): void
    {
        FeatureFlag::create([
            'key' => 'bulk-actions', 'name' => 'Bulk',
            'enabled' => false, 'default_value' => false, 'rules' => [],
        ]);
        $report = DamageReport::create([
            'reporter_name' => 'A', 'reporter_email' => 'a@example.com',
            'vehicle_registration' => 'X', 'damage_type' => 'dent', 'severity' => 'minor',
            'description' => 'd',
        ]);
        Sanctum::actingAs(User::factory()->create(['role' => 'staff']));

        $this->postJson('/api/v1/reports/bulk-delete', ['ids' => [$report->id]])
            ->assertStatus(403)
            ->assertJsonPath('error', 'feature_disabled')
            ->assertJsonPath('flag', 'bulk-actions');
        $this->assertDatabaseHas('damage_reports', ['id' => $report->id]);
    }

    public function test_bulk_delete_works_when_flag_on(): void
    {
        FeatureFlag::create([
            'key' => 'bulk-actions', 'name' => 'Bulk',
            'enabled' => true, 'default_value' => true, 'rules' => [],
        ]);
        $report = DamageReport::create([
            'reporter_name' => 'A', 'reporter_email' => 'a@example.com',
            'vehicle_registration' => 'X', 'damage_type' => 'dent', 'severity' => 'minor',
            'description' => 'd',
        ]);
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/v1/reports/bulk-delete', ['ids' => [$report->id]])
            ->assertOk();
        $this->assertDatabaseMissing('damage_reports', ['id' => $report->id]);
    }

    public function test_bulk_delete_respects_role_attribute_from_authenticated_user(): void
    {
        // Staff-only via attribute rule; role comes from the DB, not headers.
        FeatureFlag::create([
            'key' => 'bulk-actions', 'name' => 'Bulk',
            'enabled' => true, 'default_value' => false,
            'rules' => [
                ['type' => 'attribute', 'attribute' => 'role', 'operator' => 'in', 'value' => ['staff', 'admin'], 'result' => true],
            ],
        ]);
        $report = DamageReport::create([
            'reporter_name' => 'A', 'reporter_email' => 'a@example.com',
            'vehicle_registration' => 'X', 'damage_type' => 'dent', 'severity' => 'minor',
            'description' => 'd',
        ]);

        $customer = User::factory()->create(['role' => 'customer']);
        $staff = User::factory()->create(['role' => 'staff']);

        // Spoofed header doesn't help.
        Sanctum::actingAs($customer);
        $this->postJson('/api/v1/reports/bulk-delete', ['ids' => [$report->id]], ['X-User-Role' => 'staff'])
            ->assertStatus(403);

        Sanctum::actingAs($staff);
        $this->postJson('/api/v1/reports/bulk-delete', ['ids' => [$report->id]])
            ->assertOk();
    }

    public function test_export_pdf_returns_403_when_flag_off(): void
    {
        FeatureFlag::create([
            'key' => 'export-pdf', 'name' => 'PDF',
            'enabled' => false, 'default_value' => false, 'rules' => [],
        ]);
        $report = DamageReport::create([
            'reporter_name' => 'A', 'reporter_email' => 'a@example.com',
            'vehicle_registration' => 'X', 'damage_type' => 'dent', 'severity' => 'minor',
            'description' => 'd',
        ]);
        Sanctum::actingAs(User::factory()->create());

        $this->postJson("/api/v1/reports/{$report->id}/export-pdf")
            ->assertStatus(403)
            ->assertJsonPath('flag', 'export-pdf');
    }
}
