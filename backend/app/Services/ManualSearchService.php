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

        $prompt = <<<PROMPT
You are helping find product manuals online. Given this product:

Make: {$make}
Model: {$model}

Suggest up to 5 direct URLs where the user manual or installation guide PDF might be found.
Focus on:
1. The manufacturer's official support/documentation page
2. Known manual repository sites (manualslib.com, manualsonline.com, etc.)
3. Direct PDF links if you know them

Return ONLY a JSON array of URLs, no other text:
["https://example.com/manual.pdf", "https://example2.com/docs"]

If you don't know specific URLs, return an empty array: []
PROMPT;

        try {
            $response = $this->aiService->complete($prompt);
            if ($response) {
                // Extract JSON array from response
                if (preg_match('/\[[\s\S]*\]/', $response, $matches)) {
                    $urls = json_decode($matches[0], true);
                    if (is_array($urls)) {
                        return array_filter($urls, fn($url) => filter_var($url, FILTER_VALIDATE_URL));
                    }
                }
            }
        } catch (\Exception $e) {
            Log::warning('AI URL suggestion failed', ['error' => $e->getMessage()]);
        }

        return [];
    }

    /**
     * Search DuckDuckGo with multiple query formats using parallel requests.
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
                    ])
                    ->timeout(20)
                    ->get('https://html.duckduckgo.com/html/', ['q' => $query]),
                $queries
            ));

            $allUrls = [];
            $successfulQueries = 0;
            foreach ($responses as $index => $response) {
                if ($response->successful()) {
                    $successfulQueries++;
                    $urls = $this->extractUrlsFromHtml($response->body());
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
                'total_urls' => count($uniqueUrls)
            ]);

            return $uniqueUrls;
        } catch (\Exception $e) {
            Log::error('DuckDuckGo parallel search error', ['error' => $e->getMessage()]);

            // Fallback to sequential search on failure
            return $this->searchWithDuckDuckGoSequential($make, $model);
        }
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

            $response = Http::withHeaders([
                'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            ])->timeout(30)->get($pageUrl);

            if (!$response->successful()) {
                Log::warning('Failed to fetch page', ['url' => $pageUrl, 'status' => $response->status()]);
                return null;
            }

            $html = $response->body();
            $baseUrl = parse_url($pageUrl, PHP_URL_SCHEME) . '://' . parse_url($pageUrl, PHP_URL_HOST);

            // Special handling for ManualsLib - need to find manual detail pages first
            if (stripos($pageUrl, 'manualslib.com') !== false) {
                $pdfUrl = $this->findPdfOnManualsLib($html, $baseUrl, $make, $model);
                if ($pdfUrl) {
                    return $pdfUrl;
                }
            }

            // Find all PDF links on the page - look for .pdf extensions and download-related text
            preg_match_all('/href=["\']([^"\']*\.pdf[^"\']*)["\']|href=["\']([^"\']+)["\'][^>]*>[^<]*(?:download|pdf|manual)[^<]*/i', $html, $matches);

            $pdfUrls = array_filter(array_merge($matches[1], $matches[2]));

            // Also look for common download button patterns
            preg_match_all('/href=["\']([^"\']+)["\'][^>]*class="[^"]*download[^"]*"/i', $html, $downloadMatches);
            $pdfUrls = array_merge($pdfUrls, array_filter($downloadMatches[1]));

            // Look for data-src or data-url attributes that might contain PDFs
            preg_match_all('/data-(?:src|url|pdf|file)=["\']([^"\']+\.pdf[^"\']*)["\']|data-(?:src|url|pdf|file)=["\']([^"\']+)["\'].*?\.pdf/i', $html, $dataMatches);
            $pdfUrls = array_merge($pdfUrls, array_filter(array_merge($dataMatches[1], $dataMatches[2])));

            Log::debug('Found potential PDF URLs on page', ['count' => count($pdfUrls)]);

            $normalizedUrls = [];
            foreach ($pdfUrls as $pdfUrl) {
                // Skip empty or invalid
                if (empty($pdfUrl) || $pdfUrl === '#') continue;

                // Make absolute URL
                if (!preg_match('/^https?:\/\//', $pdfUrl)) {
                    if (strpos($pdfUrl, '/') === 0) {
                        $pdfUrl = $baseUrl . $pdfUrl;
                    } else {
                        $pdfUrl = $baseUrl . '/' . $pdfUrl;
                    }
                }

                // Skip navigation and language links
                if (preg_match('/\/(about|contact|privacy|terms|language|locale)/i', $pdfUrl)) {
                    continue;
                }

                $normalizedUrls[] = $pdfUrl;

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
     */
    public function downloadPdf(string $url): ?array
    {
        try {
            // Always try to download - verify by content, not URL
            // Some PDFs are served without .pdf extension
            return $this->downloadDirectPdf($url);
        } catch (\Exception $e) {
            Log::error('PDF download error', ['url' => $url, 'error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Download a direct PDF URL.
     */
    protected function downloadDirectPdf(string $url): ?array
    {
        try {
            Log::debug('Attempting PDF download');

            $response = Http::withHeaders([
                'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept' => 'application/pdf,*/*',
                'Accept-Language' => 'en-US,en;q=0.9',
            ])->timeout(90)->get($url);

            if (!$response->successful()) {
                Log::warning('PDF download failed', ['url' => $url, 'status' => $response->status()]);
                return null;
            }

            $body = $response->body();
            $contentType = $response->header('Content-Type') ?? '';

            // Verify it's actually a PDF by checking magic bytes or content-type
            $isPdf = (substr($body, 0, 4) === '%PDF') ||
                     (stripos($contentType, 'pdf') !== false) ||
                     (stripos($contentType, 'octet-stream') !== false && strlen($body) > 1000);

            if (!$isPdf) {
                Log::warning('Downloaded file is not a PDF', [
                    'url' => $url,
                    'content_type' => $contentType,
                    'first_bytes' => substr($body, 0, 20),
                    'size' => strlen($body)
                ]);
                return null;
            }

            // Ensure minimum size (PDFs should be at least a few KB)
            if (strlen($body) < 1000) {
                Log::warning('Downloaded file too small to be a valid PDF', [
                    'url' => $url,
                    'size' => strlen($body)
                ]);
                return null;
            }

            $filename = $this->extractFilename($url, $response->header('Content-Disposition'));

            Log::debug('PDF downloaded successfully', [
                'url' => $url,
                'filename' => $filename,
                'size' => strlen($body)
            ]);

            return [
                'content' => $body,
                'filename' => $filename,
                'size' => strlen($body),
            ];
        } catch (\Exception $e) {
            Log::error('Direct PDF download error', ['url' => $url, 'error' => $e->getMessage()]);
            return null;
        }
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
     */
    public function findAndDownloadManual(string $make, string $model): ?array
    {
        $urls = $this->searchForManual($make, $model);

        Log::debug('Manual search found URLs', ['count' => count($urls)]);

        if (empty($urls)) {
            return null;
        }

        // Try each URL until we get a valid PDF
        foreach ($urls as $url) {
            // If it's a direct PDF link
            if (stripos($url, '.pdf') !== false) {
                $result = $this->downloadDirectPdf($url);
                if ($result !== null) {
                    $result['source_url'] = $url;
                    return $result;
                }
                continue;
            }

            // Otherwise, try to find a PDF on the page
            $pdfUrl = $this->findPdfOnPage($url, $make, $model);
            if ($pdfUrl) {
                $result = $this->downloadDirectPdf($pdfUrl);
                if ($result !== null) {
                    $result['source_url'] = $pdfUrl;
                    return $result;
                }
            }
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
