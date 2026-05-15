<?php

namespace App\Services\FeatureFlags\Rules;

use App\Services\FeatureFlags\EvaluationContext;
use InvalidArgumentException;

/**
 * Stable hash bucket: same user lands in the same bucket so raising the
 * percentage admits new users without disturbing existing ones. Anonymous
 * traffic shares one bucket per flag (intentional — randomising per-request
 * would flip the feature mid-session).
 */
final class PercentageRolloutRule implements Rule
{
    private const RESOLUTION = 10_000;

    private const ANON_BUCKET_KEY = '__anon__';

    public function __construct(
        private readonly float $percentage,
        private readonly string $salt,
        private readonly bool $result = true,
    ) {
        if ($percentage < 0 || $percentage > 100) {
            throw new InvalidArgumentException('Percentage must be between 0 and 100');
        }
    }

    public static function type(): string
    {
        return 'percentage_rollout';
    }

    public function evaluate(EvaluationContext $context): ?bool
    {
        $threshold = (int) round($this->percentage * (self::RESOLUTION / 100));
        if ($threshold <= 0) {
            return null;
        }

        $key = $context->userKey ?? self::ANON_BUCKET_KEY;
        $bucket = crc32($this->salt.':'.$key) % self::RESOLUTION;

        return $bucket < $threshold ? $this->result : null;
    }

    public function toArray(): array
    {
        return [
            'type' => self::type(),
            'percentage' => $this->percentage,
            'salt' => $this->salt,
            'result' => $this->result,
        ];
    }
}
