<?php

namespace App\Console\Commands;

use App\Models\FeatureFlagDecision;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;

class PurgeDecisions extends Command
{
    protected $signature = 'flags:purge-decisions {--days= : Retention in days; defaults to feature_flags.decision_log.retention_days}';

    protected $description = 'Delete feature_flag_decisions rows older than the retention window.';

    public function handle(): int
    {
        $days = (int) ($this->option('days') ?? config('feature_flags.decision_log.retention_days', 30));
        $cutoff = CarbonImmutable::now()->subDays(max(1, $days));

        $deleted = FeatureFlagDecision::query()
            ->where('decided_at', '<', $cutoff)
            ->delete();

        $this->info("Purged {$deleted} decision row(s) older than {$days} day(s) (before {$cutoff->toIso8601String()}).");

        return self::SUCCESS;
    }
}
