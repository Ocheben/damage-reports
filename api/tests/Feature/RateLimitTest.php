<?php

namespace Tests\Feature;

use App\Models\FeatureFlag;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RateLimitTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Override the high default in phpunit.xml just for this test.
        config()->set('feature_flags.evaluate_rate_limit_per_minute', 3);

        FeatureFlag::create([
            'key' => 'flag-a', 'name' => 'A',
            'enabled' => true, 'default_value' => true, 'rules' => [],
        ]);
    }

    public function test_evaluate_returns_429_after_burst(): void
    {
        for ($i = 0; $i < 3; $i++) {
            $this->postJson('/api/v1/flags/evaluate')->assertOk();
        }

        $this->postJson('/api/v1/flags/evaluate')
            ->assertStatus(429)
            ->assertHeader('Retry-After');
    }
}
