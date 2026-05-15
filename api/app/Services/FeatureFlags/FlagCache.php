<?php

namespace App\Services\FeatureFlags;

use App\Models\FeatureFlag;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Database\QueryException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Caching layer for the flag set. Steady-state reads hit Redis only; cold
 * misses use a stampede lock so just one worker repopulates from the DB; a
 * dead cache store degrades to a direct DB read instead of 5xx.
 */
final class FlagCache
{
    public function __construct(
        private readonly int $ttl,
        private readonly int $lockTtl,
        private readonly int $lockWait,
    ) {}

    /** @return Collection<string, FeatureFlag> */
    public function all(): Collection
    {
        try {
            $cached = Cache::get(FeatureFlag::CACHE_KEY);
            if ($cached !== null) {
                return $this->hydrate($cached);
            }
        } catch (Throwable $e) {
            // Cache store unavailable (e.g. Redis down): degrade to DB.
            Log::warning('flag cache unavailable on read, falling back to DB', [
                'exception' => $e::class,
                'message' => $e->getMessage(),
            ]);

            return $this->loadFromDb();
        }

        // Stampede lock: one worker repopulates while others block briefly.
        $lock = Cache::lock(FeatureFlag::CACHE_KEY.':lock', $this->lockTtl);

        try {
            if ($lock->block($this->lockWait)) {
                try {
                    // Double-check after acquiring: a peer may have populated.
                    $cached = Cache::get(FeatureFlag::CACHE_KEY);
                    if ($cached !== null) {
                        return $this->hydrate($cached);
                    }

                    $fresh = $this->loadFromDb();
                    Cache::put(FeatureFlag::CACHE_KEY, $this->serialise($fresh), $this->ttl);

                    return $fresh;
                } finally {
                    optional($lock)->release();
                }
            }
        } catch (LockTimeoutException) {
            // Fall through to the DB.
        } catch (Throwable $e) {
            Log::warning('flag cache lock failed, falling back to DB', [
                'exception' => $e::class,
                'message' => $e->getMessage(),
            ]);
        }

        return $this->loadFromDb();
    }

    public function forget(): void
    {
        try {
            Cache::forget(FeatureFlag::CACHE_KEY);
        } catch (Throwable $e) {
            Log::warning('flag cache forget failed', [
                'exception' => $e::class,
                'message' => $e->getMessage(),
            ]);
        }
    }

    /** @return Collection<string, FeatureFlag> */
    private function loadFromDb(): Collection
    {
        try {
            return FeatureFlag::query()->orderBy('key')->get()->keyBy('key');
        } catch (QueryException $e) {
            Log::error('flag DB load failed; serving empty flag set (fail-open)', [
                'message' => $e->getMessage(),
            ]);

            return collect();
        }
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     * @return Collection<string, FeatureFlag>
     */
    private function hydrate(array $rows): Collection
    {
        return collect($rows)
            ->map(fn (array $attrs) => (new FeatureFlag)->newFromBuilder($attrs))
            ->keyBy('key');
    }

    /**
     * Store raw attribute arrays so the cache format isn't tied to the
     * Eloquent model graph (brittle across PHP upgrades).
     *
     * @return array<int, array<string, mixed>>
     */
    private function serialise(Collection $flags): array
    {
        return $flags->values()->map(fn (FeatureFlag $f) => $f->getAttributes())->all();
    }
}
