<?php

namespace App\Services\FeatureFlags;

use App\Models\FeatureFlagDecision;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Buffers evaluation decisions and flushes them in one bulk INSERT during the
 * terminable middleware phase, so writes never block the response. Per-decision
 * sampling caps high-traffic flags; flush failures are logged and swallowed
 * because logging must never break evaluation.
 */
final class DecisionLogger
{
    /** @var array<int, array<string, mixed>> */
    private array $buffer = [];

    public function __construct(
        private readonly float $sampleRate = 1.0,
    ) {}

    public function record(string $flagKey, EvaluationResult $result, EvaluationContext $context): void
    {
        if ($this->sampleRate < 1.0 && mt_rand() / mt_getrandmax() > $this->sampleRate) {
            return;
        }

        $this->buffer[] = [
            'flag_key' => $flagKey,
            'result' => $result->value,
            'reason' => $result->reason,
            'user_key' => $context->userKey,
            'attributes' => $context->attributes === [] ? null : json_encode($context->attributes),
            'decided_at' => now(),
        ];
    }

    public function flush(): void
    {
        if ($this->buffer === []) {
            return;
        }

        try {
            FeatureFlagDecision::query()->insert($this->buffer);
        } catch (Throwable $e) {
            Log::warning('decision log flush failed', [
                'exception' => $e::class,
                'message' => $e->getMessage(),
                'buffered' => count($this->buffer),
            ]);
        } finally {
            $this->buffer = [];
        }
    }

    /** Test seam: inspect the buffer without hitting the DB. */
    public function bufferedCount(): int
    {
        return count($this->buffer);
    }
}
