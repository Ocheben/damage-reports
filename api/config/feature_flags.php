<?php

return [
    'cache_ttl' => (int) env('FLAG_CACHE_TTL', 900),
    'public_response_cache_seconds' => (int) env('FLAG_PUBLIC_RESPONSE_CACHE_SECONDS', 15),

    // Per-user (or per-IP) budget for /api/v1/flags/evaluate.
    'evaluate_rate_limit_per_minute' => (int) env('FLAG_EVALUATE_RATE_LIMIT', 60),

    'decision_log' => [
        // 0.0–1.0: chance any single decision is recorded.
        'sample_rate' => (float) env('FLAG_DECISION_LOG_SAMPLE_RATE', 1.0),
        // Older rows purged by flags:purge-decisions.
        'retention_days' => (int) env('FLAG_DECISION_LOG_RETENTION_DAYS', 30),
    ],

    // Stampede protection: one worker repopulates while others wait briefly.
    'cache_lock' => [
        'ttl' => (int) env('FLAG_CACHE_LOCK_TTL', 5),
        'wait' => (int) env('FLAG_CACHE_LOCK_WAIT', 3),
    ],
];
