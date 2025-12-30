<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Product Image Search Service
 * 
 * Note: Complex image search has been disabled for performance reasons.
 * External image search (DuckDuckGo, retailer sites, etc.) causes timeouts
 * and reliability issues. The frontend now uses brand-based placeholders.
 * 
 * This service is kept as a stub for potential future implementation
 * with a proper image search API (e.g., Google Custom Search, Bing Image Search).
 */
class ProductImageSearchService
{
    /**
     * Search for product images.
     * Currently returns empty array - frontend uses brand-based placeholders.
     */
    public function searchForImages(string $make, string $model, string $type = ''): array
    {
        return [];
    }

    /**
     * Get the best product image URL.
     * Currently returns null - frontend uses brand-based placeholders.
     */
    public function getBestImage(string $make, string $model, string $type = ''): ?string
    {
        return null;
    }

    /**
     * Search for a part image using the search term.
     * Tries to find images from Amazon product pages.
     * Falls back to null if no image found - frontend will use placeholders.
     */
    public function searchForPartImage(string $searchTerm): ?string
    {
        try {
            // Try to get an Amazon product image
            $amazonUrl = $this->searchAmazonForImage($searchTerm);
            if ($amazonUrl) {
                return $amazonUrl;
            }
        } catch (\Exception $e) {
            Log::debug('ProductImageSearchService: Part image search failed', [
                'search_term' => $searchTerm,
                'error' => $e->getMessage(),
            ]);
        }

        return null;
    }

    /**
     * Search Amazon for a product image.
     * Uses DuckDuckGo to find Amazon product URLs, then extracts image.
     */
    private function searchAmazonForImage(string $searchTerm): ?string
    {
        try {
            // Search for Amazon product pages via DuckDuckGo HTML
            $query = urlencode($searchTerm . ' site:amazon.com');
            $response = Http::timeout(5)
                ->withHeaders([
                    'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                ])
                ->get("https://html.duckduckgo.com/html/?q={$query}");

            if (!$response->successful()) {
                return null;
            }

            $html = $response->body();

            // Extract Amazon product URLs
            if (preg_match_all('/https?:\/\/(?:www\.)?amazon\.com\/[^"\'<>\s]+\/dp\/[A-Z0-9]{10}/i', $html, $matches)) {
                $asin = null;
                foreach ($matches[0] as $url) {
                    if (preg_match('/\/dp\/([A-Z0-9]{10})/i', $url, $asinMatch)) {
                        $asin = $asinMatch[1];
                        break;
                    }
                }

                if ($asin) {
                    // Amazon image URL pattern - returns product image
                    return "https://m.media-amazon.com/images/I/{$asin}._AC_SX300_.jpg";
                }
            }
        } catch (\Exception $e) {
            Log::debug('ProductImageSearchService: Amazon search failed', [
                'search_term' => $searchTerm,
                'error' => $e->getMessage(),
            ]);
        }

        return null;
    }
}
