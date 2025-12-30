<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class DebugTiming
{
    public function handle(Request $request, Closure $next): Response
    {
        $logPath = storage_path('logs/debug.log');
        $start = microtime(true);
        
        // Log request start with full middleware timing
        file_put_contents($logPath, json_encode([
            'location' => 'DebugTiming:handle',
            'message' => 'request started (before all middleware)',
            'data' => ['path' => $request->path(), 'method' => $request->method()],
            'timestamp' => round(microtime(true) * 1000),
            'sessionId' => 'debug-session',
            'hypothesisId' => 'MIDDLEWARE'
        ]) . "\n", FILE_APPEND);
        
        $response = $next($request);
        
        $duration = round((microtime(true) - $start) * 1000);
        
        file_put_contents($logPath, json_encode([
            'location' => 'DebugTiming:handle',
            'message' => 'request completed (after all middleware + controller)',
            'data' => ['path' => $request->path(), 'durationMs' => $duration],
            'timestamp' => round(microtime(true) * 1000),
            'sessionId' => 'debug-session',
            'hypothesisId' => 'MIDDLEWARE'
        ]) . "\n", FILE_APPEND);
        
        return $response;
    }
}
