<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Debug timing middleware - runs FIRST to measure full request time
        $middleware->prependToGroup('api', \App\Http\Middleware\DebugTiming::class);
        $middleware->appendToGroup('api', EnsureFrontendRequestsAreStateful::class);
        $middleware->appendToGroup('api', \App\Http\Middleware\AddCacheHeaders::class);
        
        // Exclude SSE streaming endpoint from CSRF (already protected by Sanctum auth)
        $middleware->validateCsrfTokens(except: [
            'api/items/analyze-image-stream',
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Handle authentication exceptions for API requests
        $exceptions->render(function (\Illuminate\Auth\AuthenticationException $e, \Illuminate\Http\Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'message' => 'Unauthenticated.',
                ], 401);
            }
        });
    })->create();
