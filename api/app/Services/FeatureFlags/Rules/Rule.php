<?php

namespace App\Services\FeatureFlags\Rules;

use App\Services\FeatureFlags\EvaluationContext;

interface Rule
{
    public static function type(): string;

    /** Returns the rule's verdict, or null when it doesn't apply. */
    public function evaluate(EvaluationContext $context): ?bool;

    /** @return array<string, mixed> */
    public function toArray(): array;
}
