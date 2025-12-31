<?php

use Laravel\Sanctum\Sanctum;

// Extract host from APP_URL for stateful domains
$appUrlHost = parse_url(env('APP_URL', ''), PHP_URL_HOST) ?: '';
$appUrlPort = parse_url(env('APP_URL', ''), PHP_URL_PORT);
$appUrlWithPort = $appUrlHost . ($appUrlPort ? ':' . $appUrlPort : '');

return [
    // Auto-configured from APP_URL + common local network patterns
    // Users can override with SANCTUM_STATEFUL_DOMAINS env var
    'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', implode(',', array_filter([
        'localhost',
        'localhost:*',
        '127.0.0.1',
        '127.0.0.1:*',
        '::1',
        // Common private network ranges for self-hosted deployments
        '192.168.*.*',
        '192.168.*.*:*',
        '10.*.*.*',
        '10.*.*.*:*',
        '172.16.*.*',
        '172.16.*.*:*',
        // Auto-add from APP_URL
        $appUrlHost,
        $appUrlWithPort,
    ])))),

    'guard' => ['web'],

    'expiration' => 60 * 24 * 7, // Tokens expire after 7 days

    'token_prefix' => env('SANCTUM_TOKEN_PREFIX', ''),

    'middleware' => [
        'authenticate_session' => Laravel\Sanctum\Http\Middleware\AuthenticateSession::class,
        'encrypt_cookies' => Illuminate\Cookie\Middleware\EncryptCookies::class,
        'validate_csrf_token' => Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class,
    ],
];
