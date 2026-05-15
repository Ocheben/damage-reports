<?php

// Comma-separated list so Docker (:3000) and local dev (:3030) coexist.
$origins = array_filter(array_map(
    'trim',
    explode(',', (string) env('FRONTEND_ORIGIN', 'http://localhost:3000,http://localhost:3030')),
));

return [
    'paths' => ['api/*', 'up'],
    'allowed_methods' => ['*'],
    'allowed_origins' => $origins,
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => ['ETag', 'X-Flag-Cache'],
    'max_age' => 0,
    'supports_credentials' => false,
];
