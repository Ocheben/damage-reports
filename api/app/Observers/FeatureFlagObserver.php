<?php

namespace App\Observers;

use App\Models\FeatureFlag;
use App\Services\FeatureFlags\FlagCache;

/**
 * Busts the single flag-set cache key on any mutation; the next read repopulates
 * it under the stampede lock. Soft-delete/restore are handled explicitly.
 */
class FeatureFlagObserver
{
    public function __construct(private readonly FlagCache $cache) {}

    public function saved(FeatureFlag $flag): void
    {
        $this->cache->forget();
    }

    public function deleted(FeatureFlag $flag): void
    {
        $this->cache->forget();
    }

    public function restored(FeatureFlag $flag): void
    {
        $this->cache->forget();
    }

    public function forceDeleted(FeatureFlag $flag): void
    {
        $this->cache->forget();
    }
}
