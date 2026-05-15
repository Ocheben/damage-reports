<?php

namespace App\Providers;

use App\Models\FeatureFlag;
use App\Observers\FeatureFlagObserver;
use App\Services\FeatureFlags\DecisionLogger;
use App\Services\FeatureFlags\Evaluator;
use App\Services\FeatureFlags\FeatureFlagService;
use App\Services\FeatureFlags\FlagCache;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(FlagCache::class, fn () => new FlagCache(
            ttl: (int) config('feature_flags.cache_ttl', 900),
            lockTtl: (int) config('feature_flags.cache_lock.ttl', 5),
            lockWait: (int) config('feature_flags.cache_lock.wait', 3),
        ));

        // Per-request decision buffer; container is rebuilt per HTTP request.
        $this->app->singleton(DecisionLogger::class, fn () => new DecisionLogger(
            sampleRate: (float) config('feature_flags.decision_log.sample_rate', 1.0),
        ));

        $this->app->singleton(FeatureFlagService::class, fn ($app) => new FeatureFlagService(
            evaluator: new Evaluator,
            cache: $app->make(FlagCache::class),
            decisions: $app->make(DecisionLogger::class),
        ));
    }

    public function boot(): void
    {
        FeatureFlag::observe(FeatureFlagObserver::class);

        // Keyed by user id when authenticated, IP otherwise. Limit configured in
        // config/feature_flags.php (bumped in tests to avoid flakes).
        RateLimiter::for('flag-evaluate', function (Request $request) {
            $perMinute = (int) config('feature_flags.evaluate_rate_limit_per_minute', 60);
            $key = $request->user()?->getAuthIdentifier()
                ? 'user:'.$request->user()->getAuthIdentifier()
                : 'ip:'.$request->ip();

            return Limit::perMinute($perMinute)->by($key);
        });

        // Keyed by IP + email so an attacker can't lock a known user out by
        // hammering with bad passwords from any one IP.
        RateLimiter::for('auth-login', function (Request $request) {
            $email = (string) $request->input('email', '');

            return Limit::perMinute(10)->by($request->ip().'|'.strtolower($email));
        });
    }
}
