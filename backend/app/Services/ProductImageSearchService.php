<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Product Image Search Service
 * 
 * Searches for product images using DuckDuckGo and Google Images to extract
 * actual image URLs from search results. Uses lazy-loading pattern - frontend
 * requests images after initial results load.
 * 
 * Implementation Strategy:
 * 1. Primary: DuckDuckGo Image Search - Extracts image URLs directly from HTML
 * 2. Fallback: Google Images - Used when DuckDuckGo doesn't return results
 * 
 * Important: Does NOT construct Amazon URLs from ASINs (which would fail with 400 errors).
 * Instead, extracts actual working image URLs from search engine results.
 * 
 * @see ADR-014 for detailed implementation and architecture decisions
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
            // Use the new image search method that extracts actual URLs
            $imageUrl = $this->searchDuckDuckGoImages($searchTerm);
            
            if ($imageUrl) {
                return [$imageUrl];
            }
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
        
        Log::debug('ProductImageSearchService: getBestImage started', [
            'make' => $make,
            'model' => $model,
            'type' => $type,
            'search_term' => $searchTerm,
        ]);
        
        try {
            $imageUrl = $this->searchAmazonForImage($searchTerm);
            
            Log::debug('ProductImageSearchService: getBestImage result', [
                'search_term' => $searchTerm,
                'image_url' => $imageUrl,
                'found' => $imageUrl !== null,
            ]);
            
            return $imageUrl;
        } catch (\Exception $e) {
            Log::warning('ProductImageSearchService: getBestImage failed', [
                'make' => $make,
                'model' => $model,
                'type' => $type,
                'search_term' => $searchTerm,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
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
     * Validate ASIN format more strictly.
     * ASINs are 10 characters, typically start with B (books) or 0-9 (other products).
     * This is a basic validation - real ASINs have checksums but we can't validate those easily.
     */
    protected function isValidAsinFormat(string $asin): bool
    {
        // Basic validation: 10 alphanumeric characters
        if (strlen($asin) !== 10) {
            return false;
        }
        
        // ASINs typically don't have all the same character
        if (count(array_unique(str_split($asin))) < 3) {
            return false;
        }
        
        // ASINs typically have a mix of letters and numbers, not all one type
        $hasLetters = preg_match('/[A-Z]/', $asin);
        $hasNumbers = preg_match('/[0-9]/', $asin);
        
        // Most ASINs have both, but some are all numbers or all letters
        // Just ensure it's not obviously invalid
        return true;
    }

    /**
     * Build an Amazon image URL from an ASIN.
     * NOTE: This method is deprecated - Amazon image URLs cannot be reliably constructed from ASINs.
     * The image identifiers in Amazon's CDN are encoded differently and are not the ASINs themselves.
     * This method should not be used - use searchDuckDuckGoImages instead to get actual image URLs.
     * 
     * @deprecated Use searchDuckDuckGoImages() instead
     */
    protected function buildAmazonImageUrl(string $asin): string
    {
        // This method should not be used - Amazon URLs can't be constructed from ASINs
        // Keeping for backward compatibility but it will likely return 400 errors
        Log::warning('ProductImageSearchService: buildAmazonImageUrl called - this method is deprecated and unreliable', [
            'asin' => $asin,
        ]);
        return "https://m.media-amazon.com/images/I/{$asin}._AC_SX300_.jpg";
    }

    /**
     * Search Amazon for multiple ASINs.
     */
    protected function searchAmazonForASINs(string $searchTerm, int $limit = 1): array
    {
        $query = urlencode($searchTerm . ' site:amazon.com');
        $url = "https://html.duckduckgo.com/html/?q={$query}";
        
        Log::debug('ProductImageSearchService: Searching DuckDuckGo', [
            'search_term' => $searchTerm,
            'query' => $query,
            'url' => $url,
        ]);
        
        try {
            $response = Http::timeout(10)
                ->withHeaders([
                    'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language' => 'en-US,en;q=0.5',
                ])
                ->get($url);

            $statusCode = $response->status();
            $isSuccessful = $response->successful();
            
            Log::debug('ProductImageSearchService: DuckDuckGo response', [
                'status_code' => $statusCode,
                'successful' => $isSuccessful,
                'body_length' => strlen($response->body()),
            ]);

            if (!$isSuccessful) {
                Log::warning('ProductImageSearchService: DuckDuckGo request failed', [
                    'status_code' => $statusCode,
                    'search_term' => $searchTerm,
                ]);
                return [];
            }

            $html = $response->body();
            $asins = [];

            // Log a sample of the HTML to debug parsing issues
            $htmlSample = substr($html, 0, 2000);
            Log::debug('ProductImageSearchService: HTML sample', [
                'html_length' => strlen($html),
                'html_sample' => $htmlSample,
            ]);

            // Extract Amazon product URLs and ASINs - improved regex patterns
            // Try multiple patterns to catch different Amazon URL formats
            $patterns = [
                // Standard /dp/ format (most common)
                '/https?:\/\/(?:www\.)?amazon\.(?:com|co\.uk|de|fr|it|es|ca|com\.au|co\.jp)\/[^"\'<>\s]*\/dp\/([A-Z0-9]{10})/i',
                // /gp/product/ format
                '/https?:\/\/(?:www\.)?amazon\.(?:com|co\.uk|de|fr|it|es|ca|com\.au|co\.jp)\/[^"\'<>\s]*\/gp\/product\/([A-Z0-9]{10})/i',
                // Direct /dp/ ASIN (without full URL)
                '/\/dp\/([A-Z0-9]{10})/i',
                '/\/gp\/product\/([A-Z0-9]{10})/i',
                // ASIN in href attributes
                '/href=["\']([^"\']*\/dp\/([A-Z0-9]{10})[^"\']*)["\']/i',
                '/href=["\']([^"\']*\/gp\/product\/([A-Z0-9]{10})[^"\']*)["\']/i',
            ];

            foreach ($patterns as $patternIndex => $pattern) {
                if (preg_match_all($pattern, $html, $matches)) {
                    // For patterns with multiple capture groups, use the ASIN group
                    $asinGroup = count($matches) > 2 ? 2 : 1;
                    
                    foreach ($matches[$asinGroup] as $asin) {
                        // Validate ASIN format (10 alphanumeric characters)
                        // ASINs typically start with B (books), 0 (other products), or other letters
                        // They are always exactly 10 characters, alphanumeric
                        $asin = strtoupper(trim($asin));
                        if (preg_match('/^[A-Z0-9]{10}$/i', $asin) && $this->isValidAsinFormat($asin) && !in_array($asin, $asins)) {
                            $asins[] = $asin;
                            Log::debug('ProductImageSearchService: Found ASIN', [
                                'asin' => $asin,
                                'pattern_index' => $patternIndex,
                            ]);
                            if (count($asins) >= $limit) {
                                break 2; // Break out of both loops
                            }
                        }
                    }
                }
            }

            // If no ASINs found, try a more aggressive search for any 10-character alphanumeric codes
            // that might be ASINs near Amazon URLs
            if (empty($asins)) {
                // Look for Amazon domain mentions followed by potential ASINs
                if (preg_match_all('/amazon\.(?:com|co\.uk|de|fr|it|es|ca|com\.au|co\.jp)[^"\'<>\s]*([A-Z0-9]{10})/i', $html, $potentialMatches)) {
                    foreach ($potentialMatches[1] as $potentialAsin) {
                        $potentialAsin = strtoupper(trim($potentialAsin));
                        if (preg_match('/^[A-Z0-9]{10}$/i', $potentialAsin) && $this->isValidAsinFormat($potentialAsin) && !in_array($potentialAsin, $asins)) {
                            $asins[] = $potentialAsin;
                            Log::debug('ProductImageSearchService: Found potential ASIN (aggressive search)', [
                                'asin' => $potentialAsin,
                            ]);
                            if (count($asins) >= $limit) {
                                break;
                            }
                        }
                    }
                }
            }

            Log::debug('ProductImageSearchService: ASIN extraction result', [
                'search_term' => $searchTerm,
                'asins_found' => count($asins),
                'asins' => $asins,
                'html_contains_amazon' => stripos($html, 'amazon') !== false,
            ]);

            return $asins;
        } catch (\Exception $e) {
            Log::warning('ProductImageSearchService: searchAmazonForASINs exception', [
                'search_term' => $searchTerm,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return [];
        }
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
     * Uses DuckDuckGo to find Amazon product URLs, then tries to extract image URLs directly.
     * Falls back to Google search if DuckDuckGo fails.
     */
    protected function searchAmazonForImage(string $searchTerm): ?string
    {
        // Try to extract image URLs directly from DuckDuckGo image search
        $imageUrl = $this->searchDuckDuckGoImages($searchTerm);
        
        if ($imageUrl) {
            return $imageUrl;
        }
        
        // Fallback: Try Google Images
        Log::debug('ProductImageSearchService: DuckDuckGo failed, trying Google Images', [
            'search_term' => $searchTerm,
        ]);
        
        $imageUrl = $this->searchGoogleImages($searchTerm);
        
        if ($imageUrl) {
            return $imageUrl;
        }
        
        Log::debug('ProductImageSearchService: No images found via any search method', [
            'search_term' => $searchTerm,
        ]);

        return null;
    }

    /**
     * Search DuckDuckGo images directly for product images.
     * Uses DuckDuckGo's image search API endpoint.
     */
    protected function searchDuckDuckGoImages(string $searchTerm): ?string
    {
        $query = urlencode($searchTerm);
        
        // Try DuckDuckGo's image search API (simpler than HTML parsing)
        $apiUrl = "https://duckduckgo.com/?q={$query}&iax=images&ia=images";
        
        Log::debug('ProductImageSearchService: Searching DuckDuckGo Images', [
            'search_term' => $searchTerm,
            'url' => $apiUrl,
        ]);
        
        try {
            $response = Http::timeout(10)
                ->withHeaders([
                    'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language' => 'en-US,en;q=0.5',
                ])
                ->get($apiUrl);

            if (!$response->successful()) {
                Log::warning('ProductImageSearchService: DuckDuckGo Images request failed', [
                    'status_code' => $response->status(),
                    'search_term' => $searchTerm,
                ]);
                return null;
            }

            $html = $response->body();
            
            // Log HTML sample for debugging
            $htmlSample = substr($html, 0, 3000);
            Log::debug('ProductImageSearchService: DuckDuckGo Images HTML sample', [
                'html_length' => strlen($html),
                'html_sample' => $htmlSample,
            ]);
            
            // DuckDuckGo image results use different structures
            // Try multiple patterns to find image URLs
            $imagePatterns = [
                // Look for image URLs in data attributes
                '/data-src=["\']([^"\']*\.(?:jpg|jpeg|png|webp)[^"\']*)["\']/i',
                // Look for image URLs in src attributes
                '/src=["\']([^"\']*\.(?:jpg|jpeg|png|webp)[^"\']*)["\']/i',
                // Look for Amazon image URLs specifically
                '/https?:\/\/[^"\'\s<>]*amazon[^"\'\s<>]*\.(?:jpg|jpeg|png|webp)/i',
                // Look for any image URL
                '/(https?:\/\/[^"\'\s<>]*\.(?:jpg|jpeg|png|webp)[^"\'\s<>]*)/i',
            ];

            $foundUrls = [];
            
            foreach ($imagePatterns as $patternIndex => $pattern) {
                if (preg_match_all($pattern, $html, $matches)) {
                    $urlGroup = count($matches) > 1 ? 1 : 0;
                    foreach ($matches[$urlGroup] as $imgUrl) {
                        $imgUrl = trim(html_entity_decode($imgUrl));
                        
                        // Skip data URLs and relative URLs
                        if (stripos($imgUrl, 'data:') === 0 || stripos($imgUrl, '//') === 0) {
                            continue;
                        }
                        
                        // Prefer absolute URLs
                        if (stripos($imgUrl, 'http') === 0 && filter_var($imgUrl, FILTER_VALIDATE_URL)) {
                            // Prefer Amazon/product images
                            if (stripos($imgUrl, 'amazon') !== false || 
                                stripos($imgUrl, 'product') !== false ||
                                stripos($imgUrl, 'media') !== false) {
                                Log::debug('ProductImageSearchService: Found preferred image URL', [
                                    'search_term' => $searchTerm,
                                    'image_url' => $imgUrl,
                                    'pattern_index' => $patternIndex,
                                ]);
                                return $imgUrl;
                            }
                            
                            // Store for fallback
                            if (!in_array($imgUrl, $foundUrls)) {
                                $foundUrls[] = $imgUrl;
                            }
                        }
                    }
                }
            }

            // Return first valid URL if no preferred URL found
            if (!empty($foundUrls)) {
                $fallbackUrl = $foundUrls[0];
                Log::debug('ProductImageSearchService: Using fallback image URL', [
                    'search_term' => $searchTerm,
                    'image_url' => $fallbackUrl,
                ]);
                return $fallbackUrl;
            }

            Log::debug('ProductImageSearchService: No image URLs found in DuckDuckGo results', [
                'search_term' => $searchTerm,
                'html_contains_image' => stripos($html, 'img') !== false,
            ]);

            return null;
        } catch (\Exception $e) {
            Log::warning('ProductImageSearchService: DuckDuckGo Images search exception', [
                'search_term' => $searchTerm,
                'error' => $e->getMessage(),
                'trace' => substr($e->getTraceAsString(), 0, 500),
            ]);
            return null;
        }
    }

    /**
     * Search Google Images for product images.
     * Fallback method when DuckDuckGo doesn't return results.
     */
    protected function searchGoogleImages(string $searchTerm): ?string
    {
        $query = urlencode($searchTerm);
        $url = "https://www.google.com/search?q={$query}&tbm=isch";
        
        Log::debug('ProductImageSearchService: Searching Google Images', [
            'search_term' => $searchTerm,
            'url' => $url,
        ]);
        
        try {
            $response = Http::timeout(10)
                ->withHeaders([
                    'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language' => 'en-US,en;q=0.5',
                ])
                ->get($url);

            if (!$response->successful()) {
                Log::warning('ProductImageSearchService: Google Images request failed', [
                    'status_code' => $response->status(),
                    'search_term' => $searchTerm,
                ]);
                return null;
            }

            $html = $response->body();
            
            // Google Images uses data-src or src attributes
            // Look for actual image URLs in the HTML
            $imagePatterns = [
                // Google Images often uses data-src
                '/data-src=["\']([^"\']*\.(?:jpg|jpeg|png|webp)[^"\']*)["\']/i',
                // Standard src attributes
                '/src=["\']([^"\']*\.(?:jpg|jpeg|png|webp)[^"\']*)["\']/i',
                // Look for image URLs in JSON data
                '/"(https?:\/\/[^"\']*\.(?:jpg|jpeg|png|webp)[^"\']*)"/i',
            ];

            $foundUrls = [];
            
            foreach ($imagePatterns as $patternIndex => $pattern) {
                if (preg_match_all($pattern, $html, $matches)) {
                    $urlGroup = count($matches) > 1 ? 1 : 0;
                    foreach ($matches[$urlGroup] as $imgUrl) {
                        $imgUrl = trim(html_entity_decode($imgUrl));
                        
                        // Skip data URLs, base64, and relative URLs
                        if (stripos($imgUrl, 'data:') === 0 || 
                            stripos($imgUrl, '//') === 0 ||
                            stripos($imgUrl, 'base64') !== false) {
                            continue;
                        }
                        
                        // Prefer absolute URLs
                        if (stripos($imgUrl, 'http') === 0 && filter_var($imgUrl, FILTER_VALIDATE_URL)) {
                            // Prefer product/e-commerce images
                            if (stripos($imgUrl, 'amazon') !== false || 
                                stripos($imgUrl, 'product') !== false ||
                                stripos($imgUrl, 'media') !== false ||
                                stripos($imgUrl, 'shop') !== false) {
                                Log::debug('ProductImageSearchService: Found preferred image URL from Google', [
                                    'search_term' => $searchTerm,
                                    'image_url' => $imgUrl,
                                ]);
                                return $imgUrl;
                            }
                            
                            // Store for fallback
                            if (!in_array($imgUrl, $foundUrls)) {
                                $foundUrls[] = $imgUrl;
                            }
                        }
                    }
                }
            }

            // Return first valid URL if no preferred URL found
            if (!empty($foundUrls)) {
                $fallbackUrl = $foundUrls[0];
                Log::debug('ProductImageSearchService: Using fallback image URL from Google', [
                    'search_term' => $searchTerm,
                    'image_url' => $fallbackUrl,
                ]);
                return $fallbackUrl;
            }

            Log::debug('ProductImageSearchService: No image URLs found in Google Images results', [
                'search_term' => $searchTerm,
            ]);

            return null;
        } catch (\Exception $e) {
            Log::warning('ProductImageSearchService: Google Images search exception', [
                'search_term' => $searchTerm,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * Search Amazon for ASINs using Google search as fallback.
     */
    protected function searchAmazonForASINsViaGoogle(string $searchTerm, int $limit = 1): array
    {
        $query = urlencode($searchTerm . ' site:amazon.com');
        $url = "https://www.google.com/search?q={$query}";
        
        Log::debug('ProductImageSearchService: Searching Google', [
            'search_term' => $searchTerm,
            'query' => $query,
            'url' => $url,
        ]);
        
        try {
            $response = Http::timeout(10)
                ->withHeaders([
                    'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language' => 'en-US,en;q=0.5',
                ])
                ->get($url);

            if (!$response->successful()) {
                Log::warning('ProductImageSearchService: Google request failed', [
                    'status_code' => $response->status(),
                    'search_term' => $searchTerm,
                ]);
                return [];
            }

            $html = $response->body();
            $asins = [];

            // Extract ASINs from Google search results
            $patterns = [
                '/https?:\/\/(?:www\.)?amazon\.(?:com|co\.uk|de|fr|it|es|ca|com\.au|co\.jp)\/[^"\'<>\s]*\/dp\/([A-Z0-9]{10})/i',
                '/\/dp\/([A-Z0-9]{10})/i',
            ];

            foreach ($patterns as $pattern) {
                if (preg_match_all($pattern, $html, $matches)) {
                    $asinGroup = count($matches) > 1 ? 1 : 0;
                    foreach ($matches[$asinGroup] as $asin) {
                        if (preg_match('/^[A-Z0-9]{10}$/i', $asin) && !in_array(strtoupper($asin), $asins)) {
                            $asins[] = strtoupper($asin);
                            if (count($asins) >= $limit) {
                                break 2;
                            }
                        }
                    }
                }
            }

            Log::debug('ProductImageSearchService: Google ASIN extraction result', [
                'search_term' => $searchTerm,
                'asins_found' => count($asins),
                'asins' => $asins,
            ]);

            return $asins;
        } catch (\Exception $e) {
            Log::warning('ProductImageSearchService: Google search exception', [
                'search_term' => $searchTerm,
                'error' => $e->getMessage(),
            ]);
            return [];
        }
    }
}
