<?php

use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;

return [

    // Bearer-token only; empty unless a same-origin SPA caller is added later.
    'stateful' => explode(',', (string) env('SANCTUM_STATEFUL_DOMAINS', '')),

    'guard' => ['web'],

    // Short-lived tokens bound the impact of a leak.
    'expiration' => (int) env('SANCTUM_TOKEN_EXPIRATION_MINUTES', 60),

    'middleware' => [
        'verify_csrf_token' => ValidateCsrfToken::class,
        'encrypt_cookies' => EncryptCookies::class,
    ],
];
