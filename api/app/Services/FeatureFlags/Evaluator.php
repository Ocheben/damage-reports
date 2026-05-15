<?php

namespace App\Services\FeatureFlags;

use App\Models\FeatureFlag;
use Carbon\CarbonImmutable;

final class Evaluator
{
    public function __construct(
        private readonly ?CarbonImmutable $now = null,
    ) {}

    public function evaluate(FeatureFlag $flag, EvaluationContext $context): EvaluationResult
    {
        $now = $this->now ?? CarbonImmutable::now();

        if (! $flag->enabled) {
            return new EvaluationResult(false, 'disabled');
        }

        if (! $flag->isWithinSchedule($now)) {
            $reason = $flag->starts_at !== null && $now->lt($flag->starts_at)
                ? 'scheduled_not_yet_active'
                : 'scheduled_expired';

            return new EvaluationResult(false, $reason);
        }

        foreach ($flag->hydratedRules() as $rule) {
            $verdict = $rule->evaluate($context);
            if ($verdict !== null) {
                return new EvaluationResult($verdict, 'matched:'.$rule::type());
            }
        }

        return new EvaluationResult($flag->default_value, 'default');
    }
}
