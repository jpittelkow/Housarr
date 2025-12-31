<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Service for interacting with OpenStreetMap Nominatim API.
 * 
 * Nominatim is a free geocoding service that requires:
 * - Max 1 request per second (handled via rate limiting)
 * - User-Agent header identifying the application
 * - No heavy usage or bulk requests
 */
class NominatimService
{
    protected const BASE_URL = 'https://nominatim.openstreetmap.org';
    protected const CACHE_TTL = 3600; // 1 hour cache for results
    protected const RATE_LIMIT_KEY = 'nominatim_last_request';
    protected const USER_AGENT = 'Housarr/1.0 (Home Management App)';

    /**
     * Search for addresses matching a query.
     *
     * @param string $query The search query
     * @param int $limit Maximum number of results (max 10)
     * @param string|null $countrycodes Comma-separated country codes to limit search
     * @return array
     */
    public function search(string $query, int $limit = 5, ?string $countrycodes = null): array
    {
        if (empty(trim($query)) || strlen($query) < 3) {
            return [];
        }

        $cacheKey = 'nominatim_search_' . md5($query . $limit . ($countrycodes ?? ''));
        
        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($query, $limit, $countrycodes) {
            $this->enforceRateLimit();
            
            try {
                $params = [
                    'q' => $query,
                    'format' => 'json',
                    'addressdetails' => 1,
                    'limit' => min($limit, 10),
                ];

                if ($countrycodes) {
                    $params['countrycodes'] = $countrycodes;
                }

                $response = Http::withHeaders([
                    'User-Agent' => self::USER_AGENT,
                ])->timeout(10)->get(self::BASE_URL . '/search', $params);

                if (!$response->successful()) {
                    Log::warning('Nominatim search failed', [
                        'status' => $response->status(),
                        'query' => $query,
                    ]);
                    return [];
                }

                $results = $response->json();
                
                return array_map(fn($item) => $this->formatResult($item), $results);
            } catch (\Exception $e) {
                Log::error('Nominatim search error', [
                    'error' => $e->getMessage(),
                    'query' => $query,
                ]);
                return [];
            }
        });
    }

    /**
     * Reverse geocode coordinates to an address.
     *
     * @param float $lat Latitude
     * @param float $lon Longitude
     * @return array|null
     */
    public function reverse(float $lat, float $lon): ?array
    {
        $cacheKey = 'nominatim_reverse_' . md5("{$lat},{$lon}");

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($lat, $lon) {
            $this->enforceRateLimit();

            try {
                $response = Http::withHeaders([
                    'User-Agent' => self::USER_AGENT,
                ])->timeout(10)->get(self::BASE_URL . '/reverse', [
                    'lat' => $lat,
                    'lon' => $lon,
                    'format' => 'json',
                    'addressdetails' => 1,
                ]);

                if (!$response->successful()) {
                    Log::warning('Nominatim reverse geocode failed', [
                        'status' => $response->status(),
                        'lat' => $lat,
                        'lon' => $lon,
                    ]);
                    return null;
                }

                $result = $response->json();
                
                if (empty($result) || isset($result['error'])) {
                    return null;
                }

                return $this->formatResult($result);
            } catch (\Exception $e) {
                Log::error('Nominatim reverse geocode error', [
                    'error' => $e->getMessage(),
                    'lat' => $lat,
                    'lon' => $lon,
                ]);
                return null;
            }
        });
    }

    /**
     * Format a Nominatim result into a consistent structure.
     */
    protected function formatResult(array $item): array
    {
        $address = $item['address'] ?? [];

        return [
            'place_id' => $item['place_id'] ?? null,
            'display_name' => $item['display_name'] ?? '',
            'lat' => $item['lat'] ?? null,
            'lon' => $item['lon'] ?? null,
            'type' => $item['type'] ?? null,
            'importance' => $item['importance'] ?? 0,
            'address' => [
                'house_number' => $address['house_number'] ?? null,
                'road' => $address['road'] ?? null,
                'neighbourhood' => $address['neighbourhood'] ?? $address['suburb'] ?? null,
                'city' => $address['city'] ?? $address['town'] ?? $address['village'] ?? $address['municipality'] ?? null,
                'county' => $address['county'] ?? null,
                'state' => $address['state'] ?? null,
                'postcode' => $address['postcode'] ?? null,
                'country' => $address['country'] ?? null,
                'country_code' => $address['country_code'] ?? null,
            ],
        ];
    }

    /**
     * Enforce rate limiting (max 1 request per second to Nominatim).
     */
    protected function enforceRateLimit(): void
    {
        $lastRequest = Cache::get(self::RATE_LIMIT_KEY, 0);
        $now = microtime(true);
        $timeSinceLastRequest = $now - $lastRequest;

        // If less than 1 second since last request, wait
        if ($timeSinceLastRequest < 1) {
            usleep((int) ((1 - $timeSinceLastRequest) * 1000000));
        }

        Cache::put(self::RATE_LIMIT_KEY, microtime(true), 60);
    }
}
