<?php

namespace App\Services\FeatureFlags\Rules;

use App\Services\FeatureFlags\EvaluationContext;

final class UserTargetingRule implements Rule
{
    /** @param array<int, string> $userKeys */
    public function __construct(
        private readonly array $userKeys,
        private readonly bool $result = true,
    ) {}

    public static function type(): string
    {
        return 'user_targeting';
    }

    public function evaluate(EvaluationContext $context): ?bool
    {
        if ($context->userKey === null) {
            return null;
        }

        return in_array($context->userKey, $this->userKeys, strict: true)
            ? $this->result
            : null;
    }

    public function toArray(): array
    {
        return [
            'type' => self::type(),
            'user_keys' => $this->userKeys,
            'result' => $this->result,
        ];
    }
}
