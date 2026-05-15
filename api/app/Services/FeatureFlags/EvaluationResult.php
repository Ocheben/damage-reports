<?php

namespace App\Services\FeatureFlags;

final class EvaluationResult
{
    public function __construct(
        public readonly bool $value,
        public readonly string $reason,
    ) {}

    public function toArray(): array
    {
        return ['value' => $this->value, 'reason' => $this->reason];
    }
}
