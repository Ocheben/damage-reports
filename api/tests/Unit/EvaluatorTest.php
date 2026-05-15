<?php

namespace Tests\Unit;

use App\Models\FeatureFlag;
use App\Services\FeatureFlags\EvaluationContext;
use App\Services\FeatureFlags\Evaluator;
use Carbon\CarbonImmutable;
use Tests\TestCase;

class EvaluatorTest extends TestCase
{
    private function makeFlag(array $overrides = []): FeatureFlag
    {
        return new FeatureFlag(array_merge([
            'key' => 'test-flag',
            'name' => 'Test',
            'enabled' => true,
            'default_value' => false,
            'rules' => [],
            'starts_at' => null,
            'ends_at' => null,
        ], $overrides));
    }

    public function test_disabled_flag_returns_false_with_disabled_reason(): void
    {
        $flag = $this->makeFlag(['enabled' => false, 'default_value' => true]);
        $result = (new Evaluator)->evaluate($flag, new EvaluationContext('user-1'));
        $this->assertFalse($result->value);
        $this->assertSame('disabled', $result->reason);
    }

    public function test_default_value_returned_when_no_rules_match(): void
    {
        $flag = $this->makeFlag(['default_value' => true]);
        $result = (new Evaluator)->evaluate($flag, new EvaluationContext('user-1'));
        $this->assertTrue($result->value);
        $this->assertSame('default', $result->reason);
    }

    public function test_user_targeting_rule_matches(): void
    {
        $flag = $this->makeFlag([
            'rules' => [
                ['type' => 'user_targeting', 'user_keys' => ['vip-1', 'vip-2'], 'result' => true],
            ],
        ]);
        $hit = (new Evaluator)->evaluate($flag, new EvaluationContext('vip-1'));
        $miss = (new Evaluator)->evaluate($flag, new EvaluationContext('regular-99'));
        $this->assertTrue($hit->value);
        $this->assertSame('matched:user_targeting', $hit->reason);
        $this->assertFalse($miss->value);
        $this->assertSame('default', $miss->reason);
    }

    public function test_percentage_rollout_is_deterministic(): void
    {
        $flag = $this->makeFlag([
            'rules' => [
                ['type' => 'percentage_rollout', 'percentage' => 25, 'salt' => 'test-flag', 'result' => true],
            ],
        ]);
        $eval = new Evaluator;
        $first = $eval->evaluate($flag, new EvaluationContext('user-7'));
        $second = $eval->evaluate($flag, new EvaluationContext('user-7'));
        $this->assertSame($first->value, $second->value);
    }

    public function test_percentage_rollout_distributes_close_to_target(): void
    {
        $flag = $this->makeFlag([
            'rules' => [
                ['type' => 'percentage_rollout', 'percentage' => 25, 'salt' => 'test-flag', 'result' => true],
            ],
        ]);
        $eval = new Evaluator;
        $hits = 0;
        $n = 5000;
        for ($i = 0; $i < $n; $i++) {
            if ($eval->evaluate($flag, new EvaluationContext('user-'.$i))->value) {
                $hits++;
            }
        }
        $observed = $hits / $n;
        $this->assertGreaterThan(0.21, $observed);
        $this->assertLessThan(0.29, $observed);
    }

    public function test_first_matching_rule_wins(): void
    {
        $flag = $this->makeFlag([
            'rules' => [
                ['type' => 'user_targeting', 'user_keys' => ['vip-1'], 'result' => true],
                ['type' => 'percentage_rollout', 'percentage' => 0, 'salt' => 'x', 'result' => false],
            ],
        ]);
        $result = (new Evaluator)->evaluate($flag, new EvaluationContext('vip-1'));
        $this->assertTrue($result->value);
        $this->assertSame('matched:user_targeting', $result->reason);
    }

    public function test_schedule_window_before_start_returns_false(): void
    {
        $flag = $this->makeFlag([
            'default_value' => true,
            'starts_at' => CarbonImmutable::parse('2030-01-01T00:00:00Z'),
        ]);
        $eval = new Evaluator(now: CarbonImmutable::parse('2029-12-31T23:00:00Z'));
        $result = $eval->evaluate($flag, new EvaluationContext('u'));
        $this->assertFalse($result->value);
        $this->assertSame('scheduled_not_yet_active', $result->reason);
    }

    public function test_schedule_window_after_end_returns_false(): void
    {
        $flag = $this->makeFlag([
            'default_value' => true,
            'ends_at' => CarbonImmutable::parse('2020-01-01T00:00:00Z'),
        ]);
        $eval = new Evaluator(now: CarbonImmutable::parse('2024-06-01T00:00:00Z'));
        $result = $eval->evaluate($flag, new EvaluationContext('u'));
        $this->assertFalse($result->value);
        $this->assertSame('scheduled_expired', $result->reason);
    }

    public function test_anonymous_users_share_one_stable_bucket(): void
    {
        // Anonymous traffic shares one bucket: deterministic, not excluded.
        $on = $this->makeFlag([
            'default_value' => false,
            'rules' => [
                ['type' => 'percentage_rollout', 'percentage' => 100, 'salt' => 'x', 'result' => true],
            ],
        ]);
        $off = $this->makeFlag([
            'default_value' => false,
            'rules' => [
                ['type' => 'percentage_rollout', 'percentage' => 0, 'salt' => 'x', 'result' => true],
            ],
        ]);
        $eval = new Evaluator;
        $this->assertTrue($eval->evaluate($on, new EvaluationContext(null))->value);
        $this->assertFalse($eval->evaluate($off, new EvaluationContext(null))->value);
    }

    public function test_attribute_rule_equals(): void
    {
        $flag = $this->makeFlag([
            'rules' => [
                ['type' => 'attribute', 'attribute' => 'role', 'operator' => 'equals', 'value' => 'staff', 'result' => true],
            ],
        ]);
        $eval = new Evaluator;
        $staff = $eval->evaluate($flag, new EvaluationContext('u', ['role' => 'staff']));
        $customer = $eval->evaluate($flag, new EvaluationContext('u', ['role' => 'customer']));
        $this->assertTrue($staff->value);
        $this->assertSame('matched:attribute', $staff->reason);
        $this->assertFalse($customer->value);
        $this->assertSame('default', $customer->reason);
    }

    public function test_attribute_rule_in_set(): void
    {
        $flag = $this->makeFlag([
            'rules' => [
                ['type' => 'attribute', 'attribute' => 'country', 'operator' => 'in', 'value' => ['NL', 'BE'], 'result' => true],
            ],
        ]);
        $eval = new Evaluator;
        $this->assertTrue($eval->evaluate($flag, new EvaluationContext('u', ['country' => 'NL']))->value);
        $this->assertFalse($eval->evaluate($flag, new EvaluationContext('u', ['country' => 'US']))->value);
    }

    public function test_attribute_rule_missing_attribute_is_skipped(): void
    {
        // Missing attribute → rule abstains; default decides.
        $flag = $this->makeFlag([
            'default_value' => true,
            'rules' => [
                ['type' => 'attribute', 'attribute' => 'role', 'operator' => 'equals', 'value' => 'staff', 'result' => false],
            ],
        ]);
        $result = (new Evaluator)->evaluate($flag, new EvaluationContext('u'));
        $this->assertTrue($result->value);
        $this->assertSame('default', $result->reason);
    }
}
