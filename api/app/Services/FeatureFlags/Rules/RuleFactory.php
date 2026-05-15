<?php

namespace App\Services\FeatureFlags\Rules;

use InvalidArgumentException;

final class RuleFactory
{
    /** @return array<int, string> */
    public static function supportedTypes(): array
    {
        return [
            UserTargetingRule::type(),
            PercentageRolloutRule::type(),
            AttributeRule::type(),
        ];
    }

    /** @param array<string, mixed> $definition */
    public static function fromArray(array $definition): Rule
    {
        return match ($definition['type'] ?? null) {
            UserTargetingRule::type() => new UserTargetingRule(
                userKeys: array_values($definition['user_keys'] ?? []),
                result: (bool) ($definition['result'] ?? true),
            ),
            PercentageRolloutRule::type() => new PercentageRolloutRule(
                percentage: (float) ($definition['percentage'] ?? 0),
                salt: (string) ($definition['salt'] ?? ''),
                result: (bool) ($definition['result'] ?? true),
            ),
            AttributeRule::type() => new AttributeRule(
                attribute: (string) ($definition['attribute'] ?? ''),
                operator: (string) ($definition['operator'] ?? ''),
                value: $definition['value'] ?? null,
                result: (bool) ($definition['result'] ?? true),
            ),
            default => throw new InvalidArgumentException(
                'Unknown rule type: '.($definition['type'] ?? 'null'),
            ),
        };
    }
}
