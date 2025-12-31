<?php

namespace App\Services;

use Illuminate\Http\Client\Pool;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ManualSearchService
{
    private const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    protected ?AIService $aiService = null;
    protected int $householdId;

    public function __construct(?int $householdId = null)
    {
        $this->householdId = $householdId ?? 0;
        if ($householdId) {
            $this->aiService = AIService::forHousehold($householdId);
        }
    }

    /**
     * Set the household ID for AI service.
     */
    public function setHouseholdId(int $householdId): self
    {
        $this->householdId = $householdId;
        $this->aiService = AIService::forHousehold($householdId);
        return $this;
    }

    /**
     * Search for a product manual using multiple strategies.
     */
    public function searchForManual(string $make, string $model): array
    {
        $allUrls = [];

        // Strategy 1: Known manual repository sites
        $repositoryUrls = $this->searchManualRepositories($make, $model);
        $allUrls = array_merge($allUrls, $repositoryUrls);

        // Strategy 2: AI-assisted URL suggestions
        if ($this->aiService && $this->aiService->isAvailable()) {
            $aiUrls = $this->getAISuggestedUrls($make, $model);
            $allUrls = array_merge($allUrls, $aiUrls);
        }

        // Strategy 3: DuckDuckGo search with multiple query formats
        $searchUrls = $this->searchWithDuckDuckGo($make, $model);
        $allUrls = array_merge($allUrls, $searchUrls);

        // Remove duplicates and prioritize
        $allUrls = array_unique($allUrls);
        $allUrls = $this->prioritizeUrls($allUrls, $make, $model);

        return array_slice($allUrls, 0, 10);
    }

    /**
     * Public method to search manual repositories.
     */
    public function searchManualRepositoriesPublic(string $make, string $model): array
    {
        return $this->searchManualRepositories($make, $model);
    }

    /**
     * Public method to get AI-suggested URLs.
     */
    public function getAISuggestedUrlsPublic(string $make, string $model): array
    {
        return $this->getAISuggestedUrls($make, $model);
    }

    /**
     * Public method to search with DuckDuckGo.
     */
    public function searchWithDuckDuckGoPublic(string $make, string $model): array
    {
        return $this->searchWithDuckDuckGo($make, $model);
    }

    /**
     * Search known manual repository sites.
     */
    protected function searchManualRepositories(string $make, string $model): array
    {
        $urls = [];
        $makeSlug = strtolower(preg_replace('/[^a-zA-Z0-9]/', '-', $make));
        $modelSlug = strtolower(preg_replace('/[^a-zA-Z0-9]/', '-', $model));
        $modelEncoded = urlencode($model);
        $makeEncoded = urlencode($make);

        // ManualsLib - large manual repository
        $urls[] = "https://www.manualslib.com/manual/search/{$makeEncoded}+{$modelEncoded}";

        // Manufacturer-specific patterns
        $manufacturerPatterns = [
            'carrier' => "https://www.carrier.com/residential/en/us/products/search/?q={$modelEncoded}+manual",
            'trane' => "https://www.trane.com/residential/en/resources/library/?q={$modelEncoded}",
            'lennox' => "https://www.lennox.com/search?q={$modelEncoded}+manual",
            'rheem' => "https://www.rheem.com/search/?q={$modelEncoded}",
            'honeywell' => "https://customer.honeywell.com/resources/techlit/TechLitDocuments.html",
            'ge' => "https://www.geappliances.com/ge/service-and-support/manuals.htm",
            'whirlpool' => "https://www.whirlpool.com/support/product-manuals.html",
            'samsung' => "https://www.samsung.com/us/support/downloads/",
            'lg' => "https://www.lg.com/us/support/manuals-documents",
            'bosch' => "https://www.bosch-home.com/us/support/manuals",
        ];

        $makeLower = strtolower($make);
        foreach ($manufacturerPatterns as $brand => $pattern) {
            if (stripos($makeLower, $brand) !== false) {
                $urls[] = $pattern;
                break;
            }
        }

        return $urls;
    }

    /**
     * Use AI to suggest manual URLs.
     */
    protected function getAISuggestedUrls(string $make, string $model): array
    {
        if (!$this->aiService || !$this->aiService->isAvailable()) {
            return [];
        }

        // Map common brands to their EXACT support URL patterns
        $brandPatterns = [
            'ge' => "https://products.geappliances.com/appliance/gea-specs/{MODEL}/support",
            'ge profile' => "https://products.geappliances.com/appliance/gea-specs/{MODEL}/support",
            'general electric' => "https://products.geappliances.com/appliance/gea-specs/{MODEL}/support",
            'lg' => "https://www.lg.com/us/support/products/{MODEL}",
            'samsung' => "https://www.samsung.com/us/support/model/{MODEL}/",
            'whirlpool' => "https://www.whirlpool.com/services/product-details.{MODEL}.html",
            'carrier' => "https://www.carrier.com/residential/en/us/products/{MODEL}/",
            'trane' => "https://www.trane.com/residential/en/products/{MODEL}/",
            'honeywell' => "https://customer.resideo.com/en-US/support/product-support/",
            'bosch' => "https://www.bosch-home.com/us/support/product-details/{MODEL}",
            'kitchenaid' => "https://www.kitchenaid.com/services/product-details.{MODEL}.html",
            'maytag' => "https://www.maytag.com/services/product-details.{MODEL}.html",
            'frigidaire' => "https://www.frigidaire.com/support/product/{MODEL}/",
            'dyson' => "https://www.dyson.com/support/journey/register/{MODEL}",
        ];

        $makeLower = strtolower($make);
        $knownUrl = '';
        foreach ($brandPatterns as $brand => $pattern) {
            if (stripos($makeLower, $brand) !== false) {
                $knownUrl = str_replace('{MODEL}', $model, $pattern);
                break;
            }
        }

        $prompt = <<<PROMPT
Find the EXACT product support page URL for this product:

Make: {$make}
Model: {$model}

KNOWN URL PATTERNS FOR THIS BRAND:
- GE/GE Profile: https://products.geappliances.com/appliance/gea-specs/MODEL/support
- LG: https://www.lg.com/us/support/products/MODEL
- Samsung: https://www.samsung.com/us/support/model/MODEL/
- Whirlpool/KitchenAid/Maytag: https://www.BRAND.com/services/product-details.MODEL.html

For the model "{$model}", provide:
1. The EXACT manufacturer support page URL using the pattern above
2. The direct PDF manual download URL if you know it
3. ManualsLib URL: https://www.manualslib.com/products/Make-Model-XXX.html

Return ONLY a JSON array of 1-3 URLs, no explanation:
["https://products.geappliances.com/appliance/gea-specs/{$model}/support"]

Do NOT make up URLs. Use the exact patterns shown above.
PROMPT;

        try {
            $response = $this->aiService->complete($prompt);
            if ($response) {
                // Extract JSON array from response
                if (preg_match('/\[[\s\S]*\]/', $response, $matches)) {
                    $urls = json_decode($matches[0], true);
                    if (is_array($urls)) {
                        $validUrls = array_filter($urls, fn($url) => filter_var($url, FILTER_VALIDATE_URL));
                        Log::debug('AI suggested URLs', ['count' => count($validUrls), 'urls' => $validUrls]);
                        return $validUrls;
                    }
                }
            }
        } catch (\Exception $e) {
            Log::warning('AI URL suggestion failed', ['error' => $e->getMessage()]);
        }

        // Fallback: return known URL pattern if we have one
        if ($knownUrl) {
            Log::debug('Using known brand URL pattern', ['url' => $knownUrl]);
            return [$knownUrl];
        }

        return [];
    }

    /**
     * Search DuckDuckGo with multiple query formats using parallel requests.
     * 
     * NOTE: DuckDuckGo has implemented bot detection that often blocks automated
     * requests with CAPTCHAs. This method may return empty results. As a fallback,
     * we return pre-constructed search URLs that users can visit manually.
     */
    protected function searchWithDuckDuckGo(string $make, string $model): array
    {
        // Build search queries - prioritize PDF-specific searches
        $queries = [
            "{$make} {$model} owner's manual PDF",
            "{$make} {$model} user manual filetype:pdf",
            "{$make} {$model} installation guide PDF",
            "site:manualslib.com {$make} {$model}",
            "{$make} {$model} service manual PDF",
        ];

        Log::debug('Starting DuckDuckGo search', ['make' => $make, 'model' => $model]);

        try {
            // Execute all searches in parallel for better performance
            $responses = Http::pool(fn (Pool $pool) => array_map(
                fn ($query) => $pool
                    ->withHeaders([
                        'User-Agent' => self::USER_AGENT,
                        'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        'Accept-Language' => 'en-US,en;q=0.5',
                        'DNT' => '1',
                        'Sec-Fetch-Dest' => 'document',
                        'Sec-Fetch-Mode' => 'navigate',
                        'Sec-Fetch-Site' => 'none',
                    ])
                    ->timeout(20)
                    ->get('https://html.duckduckgo.com/html/', ['q' => $query]),
                $queries
            ));

            $allUrls = [];
            $successfulQueries = 0;
            $blockedByBot = false;
            
            foreach ($responses as $index => $response) {
                if ($response->successful()) {
                    $body = $response->body();
                    
                    // Check if we hit bot detection
                    if (stripos($body, 'anomaly-modal') !== false || stripos($body, 'bots use DuckDuckGo') !== false) {
                        Log::warning('DuckDuckGo bot detection triggered');
                        $blockedByBot = true;
                        continue;
                    }
                    
                    $successfulQueries++;
                    $urls = $this->extractUrlsFromHtml($body);
                    Log::debug('DuckDuckGo query results', [
                        'query' => $queries[$index] ?? 'unknown',
                        'urls_found' => count($urls)
                    ]);
                    $allUrls = array_merge($allUrls, $urls);
                } else {
                    Log::warning('DuckDuckGo query failed', [
                        'query' => $queries[$index] ?? 'unknown',
                        'status' => $response->status()
                    ]);
                }
            }

            $uniqueUrls = array_unique($allUrls);
            Log::debug('DuckDuckGo search complete', [
                'successful_queries' => $successfulQueries,
                'total_urls' => count($uniqueUrls),
                'blocked_by_bot' => $blockedByBot
            ]);

            // If blocked or no results, return structured data with search links
            if ($blockedByBot || empty($uniqueUrls)) {
                Log::info('DuckDuckGo blocked - returning search links for manual access');
                return [
                    'urls' => [],
                    'search_links' => $this->getSearchLinks($make, $model),
                ];
            }

            return [
                'urls' => $uniqueUrls,
                'search_links' => [],
            ];
        } catch (\Exception $e) {
            Log::error('DuckDuckGo parallel search error', ['error' => $e->getMessage()]);
            
            // Return search links as fallback
            return [
                'urls' => [],
                'search_links' => $this->getSearchLinks($make, $model),
            ];
        }
    }
    
    /**
     * Get labeled search links that user can visit manually.
     * Returns array of objects with 'url' and 'label' keys.
     */
    protected function getSearchLinks(string $make, string $model): array
    {
        $makeModel = urlencode("{$make} {$model}");
        
        return [
            [
                'url' => "https://www.google.com/search?q={$makeModel}+manual+PDF+filetype:pdf",
                'label' => "Google: {$make} {$model} manual PDF"
            ],
            [
                'url' => "https://www.google.com/search?q=site:manualslib.com+{$makeModel}",
                'label' => "ManualsLib: {$make} {$model}"
            ],
            [
                'url' => "https://duckduckgo.com/?q={$makeModel}+owner%27s+manual+PDF",
                'label' => "DuckDuckGo: {$make} {$model} manual"
            ],
        ];
    }

    /**
     * Sequential fallback for DuckDuckGo search.
     */
    protected function searchWithDuckDuckGoSequential(string $make, string $model): array
    {
        $allUrls = [];

        $queries = [
            "{$make} {$model} owner's manual PDF",
            "{$make} {$model} user guide PDF filetype:pdf",
            "{$make} {$model} installation manual PDF",
            "site:manualslib.com {$make} {$model}",
        ];

        foreach ($queries as $query) {
            $urls = $this->duckDuckGoSearch($query);
            $allUrls = array_merge($allUrls, $urls);

            if (count($allUrls) >= 5) {
                break;
            }
        }

        return array_unique($allUrls);
    }

    /**
     * Perform DuckDuckGo HTML search.
     */
    protected function duckDuckGoSearch(string $query): array
    {
        try {
            $response = Http::withHeaders([
                'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language' => 'en-US,en;q=0.5',
            ])->timeout(20)->get('https://html.duckduckgo.com/html/', [
                'q' => $query,
            ]);

            if (!$response->successful()) {
                Log::warning('DuckDuckGo search failed', ['status' => $response->status(), 'query' => $query]);
                return [];
            }

            return $this->extractUrlsFromHtml($response->body());
        } catch (\Exception $e) {
            Log::error('DuckDuckGo search error', ['error' => $e->getMessage()]);
            return [];
        }
    }

    /**
     * Extract URLs from DuckDuckGo HTML response.
     */
    protected function extractUrlsFromHtml(string $html): array
    {
        $urls = [];

        // Log a sample of the HTML to debug structure
        // Removed HTML sample logging to reduce log noise

        // Extract uddg redirect links (DuckDuckGo's tracking redirects)
        // These contain the actual destination URLs
        preg_match_all('/uddg=([^&"\']+)/i', $html, $uddgMatches);
        foreach ($uddgMatches[1] as $encoded) {
            $url = urldecode($encoded);
            if ($this->isValidUrl($url)) {
                $urls[] = $url;
            }
        }

        // Also extract href attributes that might contain PDF links directly
        preg_match_all('/href="([^"]*\.pdf[^"]*)"/i', $html, $pdfMatches);
        foreach ($pdfMatches[1] as $url) {
            if ($this->isValidUrl($url)) {
                $urls[] = $url;
            }
        }

        // Look for direct links in result snippets (class="result__url")
        preg_match_all('/class="result__url"[^>]*>([^<]+)</i', $html, $resultUrls);
        foreach ($resultUrls[1] as $urlText) {
            $url = trim($urlText);
            if (!preg_match('/^https?:\/\//', $url)) {
                $url = 'https://' . $url;
            }
            if ($this->isValidUrl($url)) {
                $urls[] = $url;
            }
        }

        // Also try to extract from result__a links
        preg_match_all('/class="result__a"[^>]*href="([^"]+)"/i', $html, $resultLinks);
        foreach ($resultLinks[1] as $url) {
            // These are often DuckDuckGo redirects - try to extract actual URL
            if (preg_match('/uddg=([^&]+)/', $url, $uddgMatch)) {
                $url = urldecode($uddgMatch[1]);
            }
            if ($this->isValidUrl($url)) {
                $urls[] = $url;
            }
        }

        // NEW: Try extracting from data attributes and generic anchor tags
        // DuckDuckGo may have changed their HTML structure
        preg_match_all('/data-link="([^"]+)"/i', $html, $dataLinks);
        foreach ($dataLinks[1] as $url) {
            if ($this->isValidUrl($url)) {
                $urls[] = $url;
            }
        }

        // Try href with http/https starting URLs
        preg_match_all('/href="(https?:\/\/[^"]+)"/i', $html, $hrefMatches);
        foreach ($hrefMatches[1] as $url) {
            // Skip DuckDuckGo internal links
            if (stripos($url, 'duckduckgo.com') !== false) {
                continue;
            }
            if ($this->isValidUrl($url)) {
                $urls[] = $url;
            }
        }

        $uniqueUrls = array_unique($urls);
        Log::debug('Extracted URLs from DuckDuckGo HTML', ['count' => count($uniqueUrls), 'urls' => array_slice($uniqueUrls, 0, 5)]);

        return $uniqueUrls;
    }

    /**
     * Check if URL is valid and potentially useful.
     */
    protected function isValidUrl(string $url): bool
    {
        if (!filter_var($url, FILTER_VALIDATE_URL)) {
            return false;
        }

        // Avoid social media and video sites
        $badDomains = ['facebook.com', 'twitter.com', 'youtube.com', 'instagram.com', 'tiktok.com', 'pinterest.com'];
        foreach ($badDomains as $domain) {
            if (stripos($url, $domain) !== false) {
                return false;
            }
        }

        return true;
    }

    /**
     * Prioritize URLs based on likelihood of having manuals.
     */
    protected function prioritizeUrls(array $urls, string $make, string $model): array
    {
        usort($urls, function ($a, $b) use ($make, $model) {
            $aScore = $this->scoreUrl($a, $make, $model);
            $bScore = $this->scoreUrl($b, $make, $model);
            return $bScore - $aScore;
        });

        return $urls;
    }

    /**
     * Score a URL based on how likely it is to contain a manual.
     */
    protected function scoreUrl(string $url, string $make, string $model): int
    {
        $score = 0;

        // Direct PDF links get highest priority
        if (stripos($url, '.pdf') !== false) {
            $score += 10;
        }

        // URLs containing the model number
        if (stripos($url, $model) !== false) {
            $score += 8;
        }

        // URLs containing the make
        if (stripos($url, $make) !== false) {
            $score += 4;
        }

        // Known manual sites
        $manualSites = ['manualslib.com', 'manualsonline.com', 'manualsdir.com', 'manualowl.com'];
        foreach ($manualSites as $site) {
            if (stripos($url, $site) !== false) {
                $score += 7;
                break;
            }
        }

        // Manufacturer domains
        $makeLower = strtolower($make);
        if (stripos($url, $makeLower) !== false) {
            $score += 6;
        }

        // URLs with manual-related keywords
        $keywords = ['manual', 'guide', 'documentation', 'support', 'docs', 'literature'];
        foreach ($keywords as $keyword) {
            if (stripos($url, $keyword) !== false) {
                $score += 2;
                break;
            }
        }

        return $score;
    }

    /**
     * Try to find a direct PDF URL from a page URL.
     */
    public function findPdfOnPage(string $pageUrl, string $make, string $model): ?string
    {
        try {
            Log::debug('Searching for PDF links on page', ['url' => $pageUrl]);

            // Follow redirects when checking pages
            $response = Http::withHeaders([
                'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            ])->withOptions([
                'allow_redirects' => true,
                'max_redirects' => 5,
            ])->timeout(30)->get($pageUrl);

            if (!$response->successful()) {
                Log::warning('Failed to fetch page', ['url' => $pageUrl, 'status' => $response->status()]);
                return null;
            }

            $html = $response->body();
            $baseUrl = parse_url($pageUrl, PHP_URL_SCHEME) . '://' . parse_url($pageUrl, PHP_URL_HOST);

            // Special handling for cloud storage links
            if (preg_match('/(?:drive\.google\.com|dropbox\.com|onedrive\.live\.com|sharepoint\.com)/i', $pageUrl)) {
                $pdfUrl = $this->handleCloudStorageLink($pageUrl, $html);
                if ($pdfUrl) {
                    return $pdfUrl;
                }
            }

            // Special handling for archive.org
            if (stripos($pageUrl, 'archive.org') !== false) {
                $pdfUrl = $this->handleArchiveOrgLink($pageUrl, $html);
                if ($pdfUrl) {
                    return $pdfUrl;
                }
            }

            // Special handling for ManualsLib - need to find manual detail pages first
            if (stripos($pageUrl, 'manualslib.com') !== false) {
                $pdfUrl = $this->findPdfOnManualsLib($html, $baseUrl, $make, $model);
                if ($pdfUrl) {
                    return $pdfUrl;
                }
            }

            // Special handling for GE Appliances - look for their specific PDF patterns
            if (stripos($pageUrl, 'geappliances.com') !== false || stripos($pageUrl, 'products.ge') !== false) {
                // GE uses a specific pattern for manuals: look for links containing "manual" and "pdf"
                preg_match_all('/href=["\']([^"\']+)["\'][^>]*>[^<]*(?:manual|owner|guide)[^<]*/i', $html, $geManuals);
                foreach ($geManuals[1] ?? [] as $link) {
                    if (!empty($link) && stripos($link, 'pdf') !== false) {
                        if (!preg_match('/^https?:\/\//', $link)) {
                            $link = $baseUrl . $link;
                        }
                        Log::debug('Found GE manual link', ['url' => $link]);
                        return $link;
                    }
                }
                
                // Also look for data-href attributes (GE sometimes uses these)
                preg_match_all('/data-href=["\']([^"\']+\.pdf[^"\']*)["\']/', $html, $dataHrefMatches);
                foreach ($dataHrefMatches[1] ?? [] as $link) {
                    if (!preg_match('/^https?:\/\//', $link)) {
                        $link = $baseUrl . $link;
                    }
                    Log::debug('Found GE data-href PDF link', ['url' => $link]);
                    return $link;
                }
                
                // Try looking for any link with the model number and .pdf
                preg_match_all('/href=["\']([^"\']*' . preg_quote($model, '/') . '[^"\']*\.pdf[^"\']*)["\']|href=["\']([^"\']*\.pdf[^"\']*' . preg_quote($model, '/') . '[^"\']*)["\']/', $html, $modelPdfMatches);
                $modelPdfs = array_filter(array_merge($modelPdfMatches[1] ?? [], $modelPdfMatches[2] ?? []));
                foreach ($modelPdfs as $link) {
                    if (!preg_match('/^https?:\/\//', $link)) {
                        $link = $baseUrl . $link;
                    }
                    Log::debug('Found GE model-specific PDF link', ['url' => $link]);
                    return $link;
                }
            }

            // Find all PDF links on the page - look for .pdf extensions and download-related text
            preg_match_all('/href=["\']([^"\']*\.pdf[^"\']*)["\']|href=["\']([^"\']+)["\'][^>]*>[^<]*(?:download|pdf|manual)[^<]*/i', $html, $matches);

            $pdfUrls = array_filter(array_merge($matches[1], $matches[2]));

            // Also look for common download button patterns
            preg_match_all('/href=["\']([^"\']+)["\'][^>]*class="[^"]*download[^"]*"/i', $html, $downloadMatches);
            $pdfUrls = array_merge($pdfUrls, array_filter($downloadMatches[1]));

            // Look for data-src or data-url attributes that might contain PDFs
            preg_match_all('/data-(?:src|url|pdf|file|manual)=["\']([^"\']+\.pdf[^"\']*)["\']|data-(?:src|url|pdf|file|manual)=["\']([^"\']+)["\'].*?\.pdf/i', $html, $dataMatches);
            $pdfUrls = array_merge($pdfUrls, array_filter(array_merge($dataMatches[1], $dataMatches[2])));

            // Look for JavaScript variables containing PDF URLs
            preg_match_all('/(?:pdfUrl|manualUrl|downloadUrl|fileUrl|documentUrl)\s*[=:]\s*["\']([^"\']+\.pdf[^"\']*)["\']/i', $html, $jsMatches);
            $pdfUrls = array_merge($pdfUrls, array_filter($jsMatches[1] ?? []));

            // Look for base64-encoded PDFs in data attributes (less common but possible)
            preg_match_all('/data:application\/pdf;base64,([A-Za-z0-9+\/=]+)/i', $html, $base64Matches);
            // Note: We skip base64 PDFs as they're embedded, not downloadable URLs

            // Extract from iframes - some sites embed PDFs in iframes
            preg_match_all('/<iframe[^>]+src=["\']([^"\']+\.pdf[^"\']*)["\']/i', $html, $iframeMatches);
            $pdfUrls = array_merge($pdfUrls, array_filter($iframeMatches[1] ?? []));

            // Look for object/embed tags with PDF sources
            preg_match_all('/(?:<object|<embed)[^>]+(?:src|data)=["\']([^"\']+\.pdf[^"\']*)["\']/i', $html, $objectMatches);
            $pdfUrls = array_merge($pdfUrls, array_filter($objectMatches[1] ?? []));

            Log::debug('Found potential PDF URLs on page', ['count' => count($pdfUrls)]);

            $normalizedUrls = [];
            foreach ($pdfUrls as $pdfUrl) {
                // Skip empty or invalid
                if (empty($pdfUrl) || $pdfUrl === '#') continue;

                // Decode HTML entities
                $pdfUrl = html_entity_decode($pdfUrl, ENT_QUOTES | ENT_HTML5, 'UTF-8');

                // Remove query parameters that might interfere (but keep important ones)
                // Some sites use query params for tracking, but we'll try the base URL too
                $basePdfUrl = preg_replace('/\?.*$/', '', $pdfUrl);

                // Make absolute URL - handle various formats
                if (!preg_match('/^https?:\/\//', $pdfUrl)) {
                    if (strpos($pdfUrl, '//') === 0) {
                        // Protocol-relative URL
                        $pdfUrl = parse_url($pageUrl, PHP_URL_SCHEME) . ':' . $pdfUrl;
                    } elseif (strpos($pdfUrl, '/') === 0) {
                        // Absolute path
                        $pdfUrl = $baseUrl . $pdfUrl;
                    } else {
                        // Relative path
                        $pagePath = parse_url($pageUrl, PHP_URL_PATH);
                        $pageDir = dirname($pagePath === '/' ? '' : $pagePath);
                        $pdfUrl = $baseUrl . $pageDir . '/' . ltrim($pdfUrl, '/');
                    }
                }

                // Normalize URL (remove duplicate slashes, etc.)
                $pdfUrl = preg_replace('#([^:])//+#', '$1/', $pdfUrl);

                // Skip navigation and language links
                if (preg_match('/\/(about|contact|privacy|terms|language|locale|help|faq)/i', $pdfUrl)) {
                    continue;
                }

                // Try both with and without query parameters
                $normalizedUrls[] = $pdfUrl;
                if ($basePdfUrl !== $pdfUrl && !in_array($basePdfUrl, $normalizedUrls)) {
                    $normalizedUrls[] = $basePdfUrl;
                }

                // Prefer URLs with the model number
                if (stripos($pdfUrl, $model) !== false && stripos($pdfUrl, '.pdf') !== false) {
                    Log::debug('Found PDF URL matching model', ['url' => $pdfUrl]);
                    return $pdfUrl;
                }
            }

            // Return first PDF-looking URL if no model match
            foreach ($normalizedUrls as $url) {
                if (stripos($url, '.pdf') !== false) {
                    Log::debug('Returning first PDF URL');
                    return $url;
                }
            }

            Log::debug('No suitable PDF URL found on page');
            return null;
        } catch (\Exception $e) {
            Log::warning('Failed to find PDF on page', ['url' => $pageUrl, 'error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Download a PDF from URL and return the content.
     * Tries to download even if URL doesn't end in .pdf, verifying by content.
     * Includes retry logic for transient failures.
     */
    public function downloadPdf(string $url): ?array
    {
        $maxRetries = 3;
        $baseDelay = 1; // seconds

        for ($attempt = 1; $attempt <= $maxRetries; $attempt++) {
            try {
                $result = $this->downloadDirectPdf($url);
                
                if ($result !== null) {
                    if ($attempt > 1) {
                        Log::info('PDF download succeeded after retry', [
                            'url' => $url,
                            'attempt' => $attempt,
                        ]);
                    }
                    return $result;
                }

                // If downloadDirectPdf returns null, it's likely a validation failure
                // Don't retry validation failures
                if ($attempt === 1) {
                    Log::debug('PDF download failed validation, not retrying', ['url' => $url]);
                    return null;
                }
            } catch (\Exception $e) {
                $errorMessage = $e->getMessage();
                $isTransient = $this->isTransientError($e, $errorMessage);
                
                if (!$isTransient) {
                    // Permanent failure, don't retry
                    Log::warning('PDF download permanent failure, not retrying', [
                        'url' => $url,
                        'error' => $errorMessage,
                    ]);
                    return null;
                }

                // Transient failure - retry with exponential backoff
                if ($attempt < $maxRetries) {
                    $delay = $baseDelay * pow(2, $attempt - 1); // 1s, 2s, 4s
                    Log::debug('PDF download transient failure, retrying', [
                        'url' => $url,
                        'attempt' => $attempt,
                        'max_retries' => $maxRetries,
                        'delay_seconds' => $delay,
                        'error' => $errorMessage,
                    ]);
                    
                    // Sleep with exponential backoff
                    sleep($delay);
                } else {
                    Log::error('PDF download failed after all retries', [
                        'url' => $url,
                        'attempts' => $maxRetries,
                        'error' => $errorMessage,
                    ]);
                }
            }
        }

        return null;
    }

    /**
     * Determine if an error is transient (should retry) or permanent (should not retry).
     */
    protected function isTransientError(\Exception $e, string $errorMessage): bool
    {
        // Timeout errors are transient
        if (
            stripos($errorMessage, 'timeout') !== false ||
            stripos($errorMessage, 'timed out') !== false ||
            stripos($errorMessage, 'connection') !== false ||
            $e->getCode() === CURLE_OPERATION_TIMEOUTED ||
            $e->getCode() === CURLE_COULDNT_CONNECT
        ) {
            return true;
        }

        // 5xx server errors are transient
        if (preg_match('/\b(50[0-9]|502|503|504)\b/', $errorMessage)) {
            return true;
        }

        // Network errors are transient
        if (
            stripos($errorMessage, 'network') !== false ||
            stripos($errorMessage, 'dns') !== false ||
            stripos($errorMessage, 'resolve') !== false
        ) {
            return true;
        }

        // 404, 403, 401 are permanent
        if (preg_match('/\b(404|403|401)\b/', $errorMessage)) {
            return false;
        }

        // Validation failures are permanent
        if (
            stripos($errorMessage, 'not a PDF') !== false ||
            stripos($errorMessage, 'validation') !== false
        ) {
            return false;
        }

        // Default: assume transient for unknown errors
        return true;
    }

    /**
     * Download a direct PDF URL.
     */
    protected function downloadDirectPdf(string $url): ?array
    {
        try {
            Log::debug('Attempting PDF download', ['url' => $url]);

            // Follow redirects explicitly with max 5 redirects
            $response = Http::withHeaders([
                'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept' => 'application/pdf,*/*',
                'Accept-Language' => 'en-US,en;q=0.9',
            ])->withOptions([
                'allow_redirects' => true,
                'max_redirects' => 5,
            ])->timeout(90)->get($url);

            if (!$response->successful()) {
                Log::warning('PDF download failed', [
                    'url' => $url,
                    'status' => $response->status(),
                    'headers' => $response->headers(),
                ]);
                return null;
            }

            $body = $response->body();
            $contentType = $response->header('Content-Type') ?? '';
            $contentLength = strlen($body);

            // Enhanced PDF validation with multiple checks
            $hasPdfMagicBytes = substr($body, 0, 4) === '%PDF';
            $hasPdfContentType = stripos($contentType, 'pdf') !== false;
            $isOctetStream = stripos($contentType, 'octet-stream') !== false;
            
            // Check for PDF structure markers in first 1KB
            $hasPdfStructure = false;
            if ($contentLength > 100) {
                $first1KB = substr($body, 0, min(1024, $contentLength));
                $hasPdfStructure = (
                    strpos($first1KB, '/Type') !== false ||
                    strpos($first1KB, '/Catalog') !== false ||
                    strpos($first1KB, '/Pages') !== false ||
                    strpos($first1KB, '/PDF') !== false
                );
            }

            // Accept PDF if any of these conditions are met:
            // 1. Has PDF magic bytes (most reliable)
            // 2. Has PDF content-type header
            // 3. Is octet-stream with reasonable size and PDF structure
            // 4. Has PDF structure markers even without magic bytes (some PDFs have headers)
            $isPdf = $hasPdfMagicBytes ||
                     $hasPdfContentType ||
                     ($isOctetStream && $contentLength > 1000 && $hasPdfStructure) ||
                     ($contentLength > 1000 && $hasPdfStructure && !$this->isHtmlContent($body));

            if (!$isPdf) {
                Log::warning('Downloaded file is not a PDF', [
                    'url' => $url,
                    'content_type' => $contentType,
                    'content_length' => $contentLength,
                    'has_magic_bytes' => $hasPdfMagicBytes,
                    'has_pdf_structure' => $hasPdfStructure,
                    'first_bytes' => substr($body, 0, min(100, $contentLength)),
                    'validation_reason' => 'Failed all PDF validation checks',
                ]);
                return null;
            }

            // Ensure minimum size (PDFs should be at least a few KB)
            if ($contentLength < 1000) {
                Log::warning('Downloaded file too small to be a valid PDF', [
                    'url' => $url,
                    'size' => $contentLength,
                    'content_type' => $contentType,
                ]);
                return null;
            }

            $filename = $this->extractFilename($url, $response->header('Content-Disposition'));

            Log::debug('PDF downloaded successfully', [
                'url' => $url,
                'filename' => $filename,
                'size' => $contentLength,
                'content_type' => $contentType,
            ]);

            return [
                'content' => $body,
                'filename' => $filename,
                'size' => $contentLength,
            ];
        } catch (\Exception $e) {
            // Re-throw transient errors so retry logic can handle them
            // Validation errors return null (handled above)
            $errorMessage = $e->getMessage();
            if ($this->isTransientError($e, $errorMessage)) {
                Log::debug('Direct PDF download transient error, will retry', [
                    'url' => $url,
                    'error' => $errorMessage,
                ]);
                throw $e; // Re-throw for retry logic
            }
            
            // Permanent errors - log and return null
            Log::error('Direct PDF download permanent error', [
                'url' => $url,
                'error' => $errorMessage,
                'trace' => substr($e->getTraceAsString(), 0, 500),
            ]);
            return null;
        }
    }

    /**
     * Check if content appears to be HTML (not PDF).
     */
    protected function isHtmlContent(string $content): bool
    {
        if (strlen($content) < 10) {
            return false;
        }
        
        $trimmed = trim($content);
        return (
            stripos($trimmed, '<html') === 0 ||
            stripos($trimmed, '<!doctype') === 0 ||
            stripos($trimmed, '<!DOCTYPE') === 0 ||
            (stripos($trimmed, '<') === 0 && stripos($trimmed, '</') !== false)
        );
    }

    /**
     * Extract filename from URL or Content-Disposition header.
     */
    protected function extractFilename(string $url, ?string $contentDisposition): string
    {
        // Try Content-Disposition header first
        if ($contentDisposition && preg_match('/filename[^;=\n]*=((["\']).*?\2|[^;\n]*)/', $contentDisposition, $matches)) {
            return trim($matches[1], '"\'');
        }

        // Extract from URL
        $path = parse_url($url, PHP_URL_PATH);
        $filename = basename($path);

        // Ensure it has .pdf extension
        if (stripos($filename, '.pdf') === false) {
            $filename .= '.pdf';
        }

        return $filename ?: 'manual.pdf';
    }

    /**
     * Search for manual and download the best match.
     * Tries multiple strategies per URL and accumulates error information.
     */
    public function findAndDownloadManual(string $make, string $model): ?array
    {
        $urls = $this->searchForManual($make, $model);

        Log::debug('Manual search found URLs', ['count' => count($urls), 'make' => $make, 'model' => $model]);

        if (empty($urls)) {
            return null;
        }

        $errors = [];
        $attemptedUrls = [];

        // Try each URL with multiple strategies
        foreach ($urls as $url) {
            $attemptedUrls[] = $url;
            
            // Strategy 1: Direct download if URL contains .pdf
            if (stripos($url, '.pdf') !== false) {
                $result = $this->downloadPdf($url);
                if ($result !== null) {
                    $result['source_url'] = $url;
                    Log::info('Manual downloaded successfully via direct PDF link', [
                        'url' => $url,
                        'make' => $make,
                        'model' => $model,
                    ]);
                    return $result;
                }
                $errors[] = "Direct download failed for: {$url}";
                
                // Try common PDF path variations
                $variations = $this->getPdfPathVariations($url);
                foreach ($variations as $variation) {
                    $result = $this->downloadPdf($variation);
                    if ($result !== null) {
                        $result['source_url'] = $variation;
                        Log::info('Manual downloaded successfully via path variation', [
                            'original_url' => $url,
                            'variation' => $variation,
                            'make' => $make,
                            'model' => $model,
                        ]);
                        return $result;
                    }
                }
                continue;
            }

            // Strategy 2: Find PDF on the page
            $pdfUrl = $this->findPdfOnPage($url, $make, $model);
            if ($pdfUrl) {
                $result = $this->downloadPdf($pdfUrl);
                if ($result !== null) {
                    $result['source_url'] = $pdfUrl;
                    Log::info('Manual downloaded successfully via page extraction', [
                        'page_url' => $url,
                        'pdf_url' => $pdfUrl,
                        'make' => $make,
                        'model' => $model,
                    ]);
                    return $result;
                }
                $errors[] = "PDF found on page but download failed: {$pdfUrl} (from {$url})";
            } else {
                $errors[] = "No PDF found on page: {$url}";
            }

            // Strategy 3: Try common PDF path variations for HTML pages
            $variations = $this->getPdfPathVariations($url);
            foreach ($variations as $variation) {
                $result = $this->downloadPdf($variation);
                if ($result !== null) {
                    $result['source_url'] = $variation;
                    Log::info('Manual downloaded successfully via path variation', [
                        'original_url' => $url,
                        'variation' => $variation,
                        'make' => $make,
                        'model' => $model,
                    ]);
                    return $result;
                }
            }
        }

        // All URLs failed - log detailed error information
        Log::warning('Manual download failed for all URLs', [
            'make' => $make,
            'model' => $model,
            'urls_attempted' => count($attemptedUrls),
            'errors' => array_slice($errors, 0, 10), // Limit to first 10 errors
        ]);

        return null;
    }

    /**
     * Generate common PDF path variations for a given URL.
     */
    protected function getPdfPathVariations(string $url): array
    {
        $variations = [];
        $parsed = parse_url($url);
        
        if (!isset($parsed['path'])) {
            return $variations;
        }

        $basePath = dirname($parsed['path']);
        $baseUrl = ($parsed['scheme'] ?? 'https') . '://' . ($parsed['host'] ?? '');
        
        // Common PDF path patterns
        $pdfPaths = [
            '/manual.pdf',
            '/download.pdf',
            '/user-manual.pdf',
            '/owners-manual.pdf',
            '/installation-manual.pdf',
            '/service-manual.pdf',
            '/product-manual.pdf',
        ];

        foreach ($pdfPaths as $pdfPath) {
            $variations[] = $baseUrl . $basePath . $pdfPath;
            $variations[] = $baseUrl . $pdfPath;
        }

        return array_unique($variations);
    }

    /**
     * Handle cloud storage links (Google Drive, Dropbox, OneDrive, SharePoint).
     */
    protected function handleCloudStorageLink(string $url, string $html): ?string
    {
        // Google Drive - try to extract direct download link
        if (preg_match('/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/', $url, $matches)) {
            $fileId = $matches[1];
            // Google Drive direct download URL format
            return "https://drive.google.com/uc?export=download&id={$fileId}";
        }

        // Dropbox - try to convert share link to direct download
        if (preg_match('/dropbox\.com\/(?:s|sh)\/([a-zA-Z0-9_-]+)/', $url, $matches)) {
            $shareId = $matches[1];
            // Try to extract from HTML or construct direct link
            if (preg_match('/href="([^"]*dropbox[^"]*\.pdf[^"]*)"/i', $html, $pdfMatch)) {
                return $pdfMatch[1];
            }
        }

        // OneDrive/SharePoint - look for direct download links in HTML
        if (preg_match('/onedrive\.live\.com|sharepoint\.com/i', $url)) {
            // Look for download buttons or direct links
            if (preg_match('/href="([^"]*download[^"]*\.pdf[^"]*)"/i', $html, $downloadMatch)) {
                return $downloadMatch[1];
            }
        }

        return null;
    }

    /**
     * Handle archive.org links.
     */
    protected function handleArchiveOrgLink(string $url, string $html): ?string
    {
        // Archive.org often has direct PDF links in the page
        // Look for download links or direct PDF references
        if (preg_match('/href="([^"]*archive\.org[^"]*\.pdf[^"]*)"/i', $html, $matches)) {
            $pdfUrl = $matches[1];
            // Make absolute if relative
            if (!preg_match('/^https?:\/\//', $pdfUrl)) {
                $baseUrl = parse_url($url, PHP_URL_SCHEME) . '://' . parse_url($url, PHP_URL_HOST);
                $pdfUrl = $baseUrl . $pdfUrl;
            }
            return $pdfUrl;
        }

        // Try to construct direct download URL from archive.org item URL
        if (preg_match('/archive\.org\/(?:details|download)\/([^\/\?]+)/', $url, $matches)) {
            $itemId = $matches[1];
            // Archive.org direct download format (may not always work)
            $directUrl = "https://archive.org/download/{$itemId}/{$itemId}.pdf";
            return $directUrl;
        }

        return null;
    }

    /**
     * Special handler for ManualsLib which requires navigating to manual detail pages.
     */
    protected function findPdfOnManualsLib(string $html, string $baseUrl, string $make, string $model): ?string
    {
        Log::debug('Attempting ManualsLib-specific PDF extraction');

        // ManualsLib search results show links to individual manual pages
        // Pattern: /manual/[number]/[make]-[model]-[type]-manual.html
        preg_match_all('/href="(\/manual\/\d+\/[^"]+\.html)"/i', $html, $manualPages);

        $manualUrls = array_filter($manualPages[1]);
        Log::debug('Found ManualsLib manual pages', ['count' => count($manualUrls)]);

        if (empty($manualUrls)) {
            // Try alternative pattern for manual links
            preg_match_all('/href="([^"]*manualslib\.com\/[^"]*manual[^"]*\.html)"/i', $html, $altMatches);
            $manualUrls = array_filter($altMatches[1]);
        }

        // Score and sort manual pages by relevance to model
        $scoredUrls = [];
        foreach ($manualUrls as $url) {
            $score = 0;
            if (stripos($url, strtolower($model)) !== false) {
                $score += 10;
            }
            if (stripos($url, strtolower($make)) !== false) {
                $score += 5;
            }
            // Prefer user-manual and owner-manual
            if (stripos($url, 'user-manual') !== false || stripos($url, 'owner') !== false) {
                $score += 3;
            }
            $scoredUrls[] = ['url' => $url, 'score' => $score];
        }

        usort($scoredUrls, fn ($a, $b) => $b['score'] - $a['score']);

        // Try top 3 manual pages
        foreach (array_slice($scoredUrls, 0, 3) as $item) {
            $manualPageUrl = $item['url'];
            if (strpos($manualPageUrl, 'http') !== 0) {
                $manualPageUrl = 'https://www.manualslib.com' . $manualPageUrl;
            }

            Log::debug('Fetching ManualsLib manual page');

            try {
                $response = Http::withHeaders([
                    'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                ])->timeout(20)->get($manualPageUrl);

                if (!$response->successful()) {
                    continue;
                }

                $manualHtml = $response->body();

                // Look for PDF download link on the manual page
                // ManualsLib uses patterns like: /download/[id]/[name].pdf or /pdf/[id]
                preg_match_all('/href="([^"]*\.pdf[^"]*)"/i', $manualHtml, $pdfMatches);
                preg_match_all('/href="(\/pdf\/[^"]+)"/i', $manualHtml, $pdfIdMatches);
                preg_match_all('/href="(\/download\/[^"]+)"/i', $manualHtml, $downloadMatches);

                $pdfUrls = array_merge(
                    array_filter($pdfMatches[1] ?? []),
                    array_filter($pdfIdMatches[1] ?? []),
                    array_filter($downloadMatches[1] ?? [])
                );

                foreach ($pdfUrls as $pdfUrl) {
                    if (strpos($pdfUrl, 'http') !== 0) {
                        $pdfUrl = 'https://www.manualslib.com' . $pdfUrl;
                    }
                    Log::debug('Found PDF URL on ManualsLib');
                    return $pdfUrl;
                }
            } catch (\Exception $e) {
                Log::warning('Failed to fetch ManualsLib manual page', ['url' => $manualPageUrl, 'error' => $e->getMessage()]);
            }
        }

        return null;
    }
}
