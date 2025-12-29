<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AddCacheHeaders
{
    /**
     * Handle an incoming request.
     *
     * Add ETag-based caching headers for GET requests to improve performance.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Only apply to successful GET requests with content
        if ($request->isMethod('GET') && $response->isSuccessful() && $response->getContent()) {
            // Generate ETag from response content
            $etag = md5($response->getContent());
            $response->setEtag($etag);

            // Check if client has matching ETag (304 Not Modified)
            if ($response->isNotModified($request)) {
                return $response;
            }

            // Add cache control headers for cacheable responses
            // Only cache static data endpoints, not user-specific data
            if ($this->isCacheable($request)) {
                $response->header('Cache-Control', 'public, max-age=300'); // 5 minutes
            } else {
                $response->header('Cache-Control', 'no-cache, must-revalidate');
            }
        }

        return $response;
    }

    /**
     * Determine if the request should be cached.
     */
    private function isCacheable(Request $request): bool
    {
        // Cache static data endpoints like categories, locations (when not filtered)
        $cacheablePaths = [
            '/api/categories',
            '/api/locations',
        ];

        $path = $request->path();

        foreach ($cacheablePaths as $cacheablePath) {
            if (str_starts_with($path, $cacheablePath) && !$request->hasAny(['search', 'filter'])) {
                return true;
            }
        }

        return false;
    }
}
