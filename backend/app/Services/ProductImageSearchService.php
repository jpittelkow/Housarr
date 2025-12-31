<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Product Image Search Service
 * 
 * Searches for product images using DuckDuckGo to find Amazon product pages.
 * Uses lazy-loading pattern - frontend requests images after initial results load.
 * 
 * @see ADR-014 for implementation details
 */
class ProductImageSearchService
{
    /**
     * Search for product images and return multiple URLs.
     * Returns array of image URLs found.
     */
    public function searchForImages(string $make, string $model, string $type = ''): array
    {
        $searchTerm = $this->buildSearchTerm($make, $model, $type);
        
        try {
            $asins = $this->searchAmazonForASINs($searchTerm, 3);
            
            return array_map(function ($asin) {
                return $this->buildAmazonImageUrl($asin);
            }, $asins);
        } catch (\Exception $e) {
            Log::debug('ProductImageSearchService: Image search failed', [
                'make' => $make,
                'model' => $model,
                'type' => $type,
                'error' => $e->getMessage(),
            ]);
        }

        return [];
    }

    /**
     * Get the best product image URL for a make/model.
     * Uses DuckDuckGo to search Amazon and extract product image.
     */
    public function getBestImage(string $make, string $model, string $type = ''): ?string
    {
        $searchTerm = $this->buildSearchTerm($make, $model, $type);
        
        try {
            return $this->searchAmazonForImage($searchTerm);
        } catch (\Exception $e) {
            Log::debug('ProductImageSearchService: getBestImage failed', [
                'make' => $make,
                'model' => $model,
                'type' => $type,
                'error' => $e->getMessage(),
            ]);
        }

        return null;
    }

    /**
     * Build a search term from make, model, and type.
     */
    protected function buildSearchTerm(string $make, string $model, string $type = ''): string
    {
        $parts = array_filter([$make, $model, $type], fn($p) => !empty(trim($p)));
        return implode(' ', $parts);
    }

    /**
     * Build an Amazon image URL from an ASIN.
     */
    protected function buildAmazonImageUrl(string $asin): string
    {
        return "https://m.media-amazon.com/images/I/{$asin}._AC_SX300_.jpg";
    }

    /**
     * Search Amazon for multiple ASINs.
     */
    protected function searchAmazonForASINs(string $searchTerm, int $limit = 1): array
    {
        $query = urlencode($searchTerm . ' site:amazon.com');
        $response = Http::timeout(5)
            ->withHeaders([
                'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            ])
            ->get("https://html.duckduckgo.com/html/?q={$query}");

        if (!$response->successful()) {
            return [];
        }

        $html = $response->body();
        $asins = [];

        // Extract Amazon product URLs and ASINs
        if (preg_match_all('/https?:\/\/(?:www\.)?amazon\.com\/[^"\'<>\s]+\/dp\/([A-Z0-9]{10})/i', $html, $matches)) {
            foreach ($matches[1] as $asin) {
                if (!in_array($asin, $asins)) {
                    $asins[] = $asin;
                    if (count($asins) >= $limit) {
                        break;
                    }
                }
            }
        }

        return $asins;
    }

    /**
     * Search for a part image using the search term.
     * Tries to find images from Amazon product pages.
     * Falls back to null if no image found - frontend will use placeholders.
     */
    public function searchForPartImage(string $searchTerm): ?string
    {
        try {
            return $this->searchAmazonForImage($searchTerm);
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
    protected function searchAmazonForImage(string $searchTerm): ?string
    {
        $asins = $this->searchAmazonForASINs($searchTerm, 1);
        
        if (!empty($asins)) {
            return $this->buildAmazonImageUrl($asins[0]);
        }

        return null;
    }
}
