<?php

namespace App\Services\FeatureFlags;

use App\Models\FeatureFlag;
use Illuminate\Support\Collection;

final class FeatureFlagService
{
    public function __construct(
        private readonly Evaluator $evaluator,
        private readonly FlagCache $cache,
        private readonly DecisionLogger $decisions,
    ) {}

    public function evaluate(string $key, EvaluationContext $context): EvaluationResult
    {
        $flag = $this->all()->get($key);
        $result = $flag === null
            ? new EvaluationResult(false, 'unknown_flag')
            : $this->evaluator->evaluate($flag, $context);

        $this->decisions->record($key, $result, $context);

        return $result;
    }

    /** @return array<string, EvaluationResult> */
    public function evaluateAll(EvaluationContext $context): array
    {
        $out = [];
        foreach ($this->all() as $key => $flag) {
            $result = $this->evaluator->evaluate($flag, $context);
            $this->decisions->record($key, $result, $context);
            $out[$key] = $result;
        }

        return $out;
    }

    /** @return Collection<string, FeatureFlag> */
    public function all(): Collection
    {
        return $this->cache->all();
    }
}
