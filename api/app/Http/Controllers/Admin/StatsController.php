<?php

namespace App\Http\Controllers\Admin;

use App\Models\FeatureFlag;
use App\Models\FeatureFlagDecision;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Throwable;

/**
 * Admin sidebar/header overview. Each counter is one indexed query; if the
 * cache store is down we degrade `cache.status` instead of failing — this
 * endpoint runs on every admin page load.
 */
class StatsController
{
    public function __invoke(): JsonResponse
    {
        $now = CarbonImmutable::now();
        $monthStart = $now->startOfMonth();
        $dayAgo = $now->subDay();
        $twoDaysAgo = $now->subDays(2);

        $totalFlags = FeatureFlag::query()->count();
        $addedThisMonth = FeatureFlag::query()->where('created_at', '>=', $monthStart)->count();
        $activeRollouts = FeatureFlag::query()
            ->where('enabled', true)
            ->whereNotNull('rules')
            ->whereRaw('json_array_length(rules) > 0')
            ->count();
        $scheduledCount = FeatureFlag::query()
            ->where(fn ($q) => $q->whereNotNull('starts_at')->orWhereNotNull('ends_at'))
            ->count();

        $nextScheduled = FeatureFlag::query()
            ->whereNotNull('starts_at')
            ->where('starts_at', '>', $now)
            ->orderBy('starts_at')
            ->first(['key', 'starts_at']);

        $evals24h = FeatureFlagDecision::query()
            ->where('decided_at', '>=', $dayAgo)
            ->count();
        $evalsPrior24h = FeatureFlagDecision::query()
            ->whereBetween('decided_at', [$twoDaysAgo, $dayAgo])
            ->count();
        $evals24hDelta = $evalsPrior24h > 0 ? $evals24h - $evalsPrior24h : null;

        $byFlag = FeatureFlagDecision::query()
            ->where('decided_at', '>=', $dayAgo)
            ->selectRaw('flag_key, COUNT(*) as c')
            ->groupBy('flag_key')
            ->pluck('c', 'flag_key')
            ->map(fn ($v) => (int) $v)
            ->all();

        return response()->json([
            'total_flags' => $totalFlags,
            'added_this_month' => $addedThisMonth,
            'active_rollouts' => $activeRollouts,
            'scheduled' => $scheduledCount,
            'next_scheduled_at' => optional($nextScheduled?->starts_at)->toIso8601String(),
            'next_scheduled_key' => $nextScheduled?->key,
            'evaluations_24h' => $evals24h,
            'evaluations_24h_delta' => $evals24hDelta,
            'evaluations_24h_by_flag' => $byFlag,
            'cache' => $this->cacheStats(),
        ]);
    }

    private function cacheStats(): array
    {
        $ttl = (int) config('feature_flags.cache_ttl', 900);
        // Cheap ping with a dummy key; throw means store is unavailable.
        try {
            Cache::has('feature-flags:probe');
            $status = 'ok';
        } catch (Throwable) {
            $status = 'unavailable';
        }

        return [
            // null = unknown; real hit-rate tracking is out of scope for the demo.
            'hit_rate' => null,
            'ttl_seconds' => $ttl,
            'status' => $status,
        ];
    }
}
