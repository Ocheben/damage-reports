<?php

namespace App\Services\FeatureFlags\Rules;

use App\Services\FeatureFlags\EvaluationContext;
use InvalidArgumentException;

/**
 * Match a context attribute against a configured value. Returns null on
 * missing attribute (rather than false) so subsequent rules still get a
 * chance to fire — same semantics as LaunchDarkly/GrowthBook.
 */
final class AttributeRule implements Rule
{
    public const OPERATORS = ['equals', 'not_equals', 'in', 'not_in', 'contains'];

    public function __construct(
        private readonly string $attribute,
        private readonly string $operator,
        private readonly mixed $value,
        private readonly bool $result = true,
    ) {
        if ($attribute === '') {
            throw new InvalidArgumentException('AttributeRule requires a non-empty attribute name.');
        }
        if (! in_array($operator, self::OPERATORS, strict: true)) {
            throw new InvalidArgumentException(
                'AttributeRule operator must be one of: '.implode(', ', self::OPERATORS),
            );
        }
        if (in_array($operator, ['in', 'not_in'], strict: true) && ! is_array($value)) {
            throw new InvalidArgumentException("AttributeRule operator '{$operator}' requires an array value.");
        }
    }

    public static function type(): string
    {
        return 'attribute';
    }

    public function evaluate(EvaluationContext $context): ?bool
    {
        $actual = $context->attribute($this->attribute);
        if ($actual === null) {
            return null;
        }

        return $this->matches($actual) ? $this->result : null;
    }

    private function matches(mixed $actual): bool
    {
        $stringEquals = is_scalar($actual) && is_scalar($this->value) && (string) $actual === (string) $this->value;

        return match ($this->operator) {
            'equals' => $actual === $this->value || $stringEquals,
            'not_equals' => ! ($actual === $this->value || $stringEquals),
            'in' => in_array($actual, (array) $this->value, strict: false),
            'not_in' => ! in_array($actual, (array) $this->value, strict: false),
            'contains' => is_string($actual) && is_string($this->value) && str_contains($actual, $this->value),
            // Unreachable (constructor validates), but PHPStan needs it.
            default => false,
        };
    }

    public function toArray(): array
    {
        return [
            'type' => self::type(),
            'attribute' => $this->attribute,
            'operator' => $this->operator,
            'value' => $this->value,
            'result' => $this->result,
        ];
    }
}
