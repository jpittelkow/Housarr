<?php

namespace App\Http\Controllers\Api;

use App\Actions\Items\AnalyzeItemImageAction;
use App\Actions\Items\DownloadItemManualAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreItemRequest;
use App\Http\Requests\Api\UpdateItemRequest;
use App\Http\Resources\FileResource;
use App\Http\Resources\ItemResource;
use App\Models\Item;
use App\Services\AIAgentOrchestrator;
use App\Services\AIService;
use App\Services\ManualSearchService;
use App\Services\PdfTextService;
use App\Services\ProductImageSearchService;
use App\Services\StorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class ItemController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $householdId = $request->user()->household_id;

        $validated = $request->validate([
            'category_id' => ['nullable', 'integer', Rule::exists('categories', 'id')->where(function ($query) use ($householdId) {
                $query->where('household_id', $householdId)->orWhereNull('household_id');
            })],
            'search' => ['nullable', 'string', 'max:255'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:500'],
            'page' => ['nullable', 'integer', 'min:1'],
            'minimal' => ['nullable', 'boolean'], // For dropdowns - returns only id and name
        ]);

        // Minimal mode for dropdowns - much faster, no relationships loaded
        if ($request->boolean('minimal')) {
            $items = Item::where('household_id', $householdId)
                ->select('id', 'name')
                ->orderBy('name')
                ->get();

            return response()->json([
                'items' => $items,
            ]);
        }

        $query = Item::where('household_id', $householdId)
            ->with(['category', 'vendor', 'location', 'featuredImage']);

        if (!empty($validated['category_id'])) {
            $query->where('category_id', $validated['category_id']);
        }

        if (!empty($validated['search'])) {
            $query->search($validated['search']);
        }

        // Pagination support
        $perPage = min($validated['limit'] ?? 50, 200); // Default 50, max 200
        $page = $request->integer('page', 1);
        
        $items = $query->orderBy('name')->paginate($perPage, ['*'], 'page', $page);

        return response()->json([
            'items' => ItemResource::collection($items->items()),
            'pagination' => [
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
                'per_page' => $items->perPage(),
                'total' => $items->total(),
                'from' => $items->firstItem(),
                'to' => $items->lastItem(),
            ],
        ]);
    }

    public function store(StoreItemRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $item = Item::create([
            'household_id' => $request->user()->household_id,
            ...$validated,
        ]);

        return response()->json([
            'item' => new ItemResource($item->load(['category', 'vendor', 'location', 'featuredImage'])),
        ], 201);
    }

    public function show(Request $request, Item $item): JsonResponse
    {
        Gate::authorize('view', $item);

        return response()->json([
            'item' => new ItemResource($item->load([
                'category',
                'vendor',
                'location',
                'parts',
                'parts.images',
                'parts.featuredImage',
                'maintenanceLogs' => fn($q) => $q->with('parts')->orderBy('date', 'desc'),
                'reminders' => fn($q) => $q->where('status', 'pending'),
                'files',
                'images',
                'featuredImage',
            ])),
        ]);
    }

    public function update(UpdateItemRequest $request, Item $item): JsonResponse
    {
        $validated = $request->validated();
        $item->update($validated);

        return response()->json([
            'item' => new ItemResource($item->load(['category', 'vendor', 'location'])),
        ]);
    }

    public function destroy(Request $request, Item $item): JsonResponse
    {
        Gate::authorize('delete', $item);

        // Eager load files to avoid N+1 queries
        $item->load('files');

        // Delete files from storage
        foreach ($item->files as $file) {
            $file->deleteFile();
        }

        $item->delete();

        return response()->json([
            'message' => 'Item deleted successfully',
        ]);
    }

    public function uploadManual(Request $request, Item $item): JsonResponse
    {
        Gate::authorize('update', $item);

        $request->validate([
            'manual' => ['required', 'file', 'mimes:pdf', 'max:51200'],
        ]);

        $file = $request->file('manual');
        $disk = config('filesystems.default');
        $householdId = $request->user()->household_id;
        $path = $file->store("households/{$householdId}/items/{$item->id}/manuals", $disk);

        $fileRecord = $item->files()->create([
            'household_id' => $householdId,
            'disk' => $disk,
            'path' => $path,
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType(),
            'size' => $file->getSize(),
        ]);

        return response()->json([
            'file' => new FileResource($fileRecord),
        ], 201);
    }

    public function analyzeImage(Request $request, AnalyzeItemImageAction $analyzeAction): JsonResponse
    {
        // Custom validation: require either image OR non-empty query
        $hasImage = $request->hasFile('image');
        $hasQuery = $request->filled('query'); // filled() checks for non-empty value

        if (!$hasImage && !$hasQuery) {
            return response()->json([
                'message' => 'Please provide an image or search query.',
                'errors' => [
                    'image' => ['An image or search query is required.'],
                ]
            ], 422);
        }

        // Validate image if provided
        if ($hasImage) {
            $request->validate([
                'image' => ['file', 'mimes:jpeg,jpg,png,webp,gif', 'max:10240'],
            ]);
        }

        // Validate query if provided
        if ($hasQuery) {
            $request->validate([
                'query' => ['string', 'max:500'],
            ]);
        }

        $request->validate([
            'categories' => ['nullable', 'string'],
        ]);

        $categories = [];
        if ($request->has('categories')) {
            $categories = json_decode($request->input('categories'), true) ?? [];
        }

        try {
            $analysisResult = $analyzeAction->execute(
                $request->file('image'),
                $categories,
                $request->user()->household_id,
                $request->input('query')
            );

            // The action now returns an enhanced response with agent metadata
            return response()->json([
                'results' => $analysisResult['results'] ?? [],
                'agents_used' => $analysisResult['agents_used'] ?? [],
                'agents_succeeded' => $analysisResult['agents_succeeded'] ?? 0,
                'agent_details' => $analysisResult['agent_details'] ?? [],
                'agent_errors' => $analysisResult['agent_errors'] ?? [],
                'primary_agent' => $analysisResult['primary_agent'] ?? null,
                'synthesis_agent' => $analysisResult['synthesis_agent'] ?? null,
                'synthesis_error' => $analysisResult['synthesis_error'] ?? null,
                'consensus' => $analysisResult['consensus'] ?? null,
                'total_duration_ms' => $analysisResult['total_duration_ms'] ?? 0,
                'parse_source' => $analysisResult['parse_source'] ?? null,
                'debug' => $analysisResult['debug'] ?? null,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'results' => [],
                'agents_used' => [],
                'agents_succeeded' => 0,
                'agent_details' => [],
                'agent_errors' => [],
            ], 422);
        }
    }

    public function downloadManual(Request $request, Item $item, DownloadItemManualAction $downloadAction): JsonResponse
    {
        Gate::authorize('update', $item);

        $validated = $request->validate([
            'make' => ['required', 'string', 'max:255'],
            'model' => ['required', 'string', 'max:255'],
        ]);

        try {
            $result = $downloadAction->execute(
                $item,
                $validated['make'],
                $validated['model'],
                $request->user()->household_id
            );

            return response()->json([
                'success' => true,
                'message' => 'Manual downloaded and attached successfully!',
                ...$result
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Search for manual URLs (step 1 of manual download).
     */
    public function searchManualUrls(Request $request, Item $item): JsonResponse
    {
        Gate::authorize('view', $item);

        $validated = $request->validate([
            'make' => ['required', 'string', 'max:255'],
            'model' => ['required', 'string', 'max:255'],
            'step' => ['required', 'string', 'in:repositories,ai,web'],
        ]);

        $householdId = $request->user()->household_id;
        $manualService = new ManualSearchService($householdId);

        $urls = [];
        $searchLinks = [];
        $stepName = '';

        switch ($validated['step']) {
            case 'repositories':
                $stepName = 'Searching manual repositories';
                $urls = $manualService->searchManualRepositoriesPublic($validated['make'], $validated['model']);
                break;
            case 'ai':
                $stepName = 'Asking AI for suggestions';
                $urls = $manualService->getAISuggestedUrlsPublic($validated['make'], $validated['model']);
                break;
            case 'web':
                $stepName = 'Searching the web';
                $webResult = $manualService->searchWithDuckDuckGoPublic($validated['make'], $validated['model']);
                // Web search returns structured data with urls and search_links
                if (is_array($webResult) && isset($webResult['urls'])) {
                    $urls = $webResult['urls'];
                    $searchLinks = $webResult['search_links'] ?? [];
                } else {
                    // Backwards compatibility if it returns just URLs
                    $urls = $webResult;
                }
                break;
        }

        return response()->json([
            'step' => $validated['step'],
            'step_name' => $stepName,
            'urls' => $urls,
            'count' => count($urls),
            'search_links' => $searchLinks,
        ]);
    }

    /**
     * Download manual from a specific URL (step 2 of manual download).
     */
    public function downloadManualFromUrl(Request $request, Item $item): JsonResponse
    {
        Gate::authorize('update', $item);

        $validated = $request->validate([
            'url' => ['required', 'url', 'max:2048'],
            'make' => ['required', 'string', 'max:255'],
            'model' => ['required', 'string', 'max:255'],
        ]);

        $householdId = $request->user()->household_id;
        $manualService = new ManualSearchService($householdId);

        // Try to download from the URL
        $result = null;
        $url = $validated['url'];

        if (stripos($url, '.pdf') !== false) {
            $result = $manualService->downloadPdf($url);
        } else {
            // Try to find a PDF on the page
            $pdfUrl = $manualService->findPdfOnPage($url, $validated['make'], $validated['model']);
            if ($pdfUrl) {
                $result = $manualService->downloadPdf($pdfUrl);
                $url = $pdfUrl;
            }
        }

        if ($result === null) {
            // Check if this is a search URL (Google, etc.)
            $isSearchUrl = preg_match('/google\.com\/search|bing\.com\/search|duckduckgo\.com/i', $url);
            
            return response()->json([
                'success' => false,
                'message' => $isSearchUrl 
                    ? 'This is a search page. Please open it in your browser to find the manual.'
                    : 'Could not download from this source. The site may require login or have bot protection.',
                'is_search_url' => $isSearchUrl,
                'open_url' => $url, // Frontend can offer to open this
            ], 422);
        }

        // Save the PDF to storage
        $storageService = new StorageService($householdId);
        $disk = $storageService->getDiskForHousehold();
        $diskName = $storageService->getDiskName();

        $filename = preg_replace('/[^a-zA-Z0-9._-]/', '_', $result['filename']);
        $path = "households/{$householdId}/items/{$item->id}/manuals/" . time() . "_{$filename}";

        Storage::disk($disk)->put($path, $result['content']);

        // Create file record
        $fileRecord = $item->files()->create([
            'household_id' => $householdId,
            'disk' => $diskName,
            'path' => $path,
            'original_name' => $result['filename'],
            'mime_type' => 'application/pdf',
            'size' => $result['size'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Manual downloaded and attached successfully!',
            'file' => new FileResource($fileRecord),
            'source_url' => $url,
        ]);
    }

    public function getAISuggestions(Request $request, Item $item): JsonResponse
    {
        Gate::authorize('view', $item);

        $validated = $request->validate([
            'make' => ['required', 'string', 'max:255'],
            'model' => ['required', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:255'],
        ]);

        $householdId = $request->user()->household_id;
        $aiService = AIService::forHousehold($householdId);

        if (!$aiService->isAvailable()) {
            return response()->json([
                'suggestions' => null,
                'message' => 'AI is not configured. Please configure an AI provider in Settings.',
            ], 422);
        }

        $prompt = $this->buildSuggestionPrompt($validated['make'], $validated['model'], $validated['category'] ?? null);
        $response = $aiService->complete($prompt);

        if ($response === null) {
            return response()->json([
                'suggestions' => null,
                'message' => 'Failed to get AI suggestions.',
            ], 422);
        }

        // Try to parse JSON from response
        $jsonMatch = preg_match('/\{[\s\S]*\}/', $response, $matches);
        if ($jsonMatch) {
            $suggestions = json_decode($matches[0], true);
            if ($suggestions) {
                return response()->json([
                    'suggestions' => [
                        'warranty_years' => $suggestions['warranty_years'] ?? null,
                        'maintenance_interval_months' => $suggestions['maintenance_interval_months'] ?? null,
                        'typical_lifespan_years' => $suggestions['typical_lifespan_years'] ?? null,
                        'notes' => $suggestions['notes'] ?? null,
                    ],
                ]);
            }
        }

        return response()->json([
            'suggestions' => null,
            'message' => 'Could not parse AI response.',
        ], 422);
    }

    /**
     * Step-based AI suggestions (step 1: check config).
     */
    public function checkAIConfig(Request $request, Item $item): JsonResponse
    {
        Gate::authorize('view', $item);

        $householdId = $request->user()->household_id;
        $aiService = AIService::forHousehold($householdId);

        return response()->json([
            'available' => $aiService->isAvailable(),
            'provider' => $aiService->isAvailable() ? $aiService->getProvider() : null,
            'model' => $aiService->isAvailable() ? $aiService->getModel() : null,
        ]);
    }

    /**
     * Combined AI suggestions endpoint using multi-agent orchestration.
     * Queries all active AI agents in parallel and synthesizes results.
     */
    public function queryAISuggestions(Request $request, Item $item): JsonResponse
    {
        Gate::authorize('view', $item);

        $validated = $request->validate([
            'make' => ['required', 'string', 'max:255'],
            'model' => ['required', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:255'],
        ]);

        $householdId = $request->user()->household_id;
        $orchestrator = AIAgentOrchestrator::forHousehold($householdId);

        // Check if any agents are available
        $activeAgents = $orchestrator->getActiveAgents();
        if (empty($activeAgents)) {
            return response()->json([
                'success' => false,
                'error' => 'AI is not configured. Please configure an AI provider in Settings.',
                'agents_used' => [],
                'agents_succeeded' => 0,
            ], 422);
        }

        $prompt = $this->buildSuggestionPrompt($validated['make'], $validated['model'], $validated['category'] ?? null);
        $startTime = microtime(true);

        // Call all active agents and get synthesized result
        $result = $orchestrator->callActiveAgentsWithSummary($prompt);

        $totalDuration = (int) ((microtime(true) - $startTime) * 1000);

        // Count successful agents
        $agentsUsed = array_keys($result['agents'] ?? []);
        $agentsSucceeded = count(array_filter($result['agents'] ?? [], fn($r) => $r['success'] ?? false));

        // Build agent details for debugging
        $agentDetails = [];
        $agentErrors = [];
        foreach ($result['agents'] ?? [] as $agentName => $agentResult) {
            $agentDetails[$agentName] = [
                'success' => $agentResult['success'] ?? false,
                'duration_ms' => $agentResult['duration_ms'] ?? 0,
            ];
            if (!($agentResult['success'] ?? false) && ($agentResult['error'] ?? null)) {
                $agentErrors[$agentName] = $agentResult['error'];
            }
        }

        // Try to parse JSON from synthesized response
        $response = $result['summary'] ?? null;
        if ($response) {
            $suggestions = $this->parseSuggestionsFromResponse($response);
            if ($suggestions) {
                return response()->json([
                    'success' => true,
                    'suggestions' => $suggestions,
                    'agents_used' => $agentsUsed,
                    'agents_succeeded' => $agentsSucceeded,
                    'agent_details' => $agentDetails,
                    'agent_errors' => $agentErrors,
                    'synthesis_agent' => $result['summary_agent'] ?? null,
                    'total_duration_ms' => $totalDuration,
                ]);
            }
        }

        // Fallback: Try to parse from individual agent responses
        foreach ($result['agents'] ?? [] as $agentName => $agentResult) {
            if (($agentResult['success'] ?? false) && ($agentResult['response'] ?? null)) {
                $suggestions = $this->parseSuggestionsFromResponse($agentResult['response']);
                if ($suggestions) {
                    return response()->json([
                        'success' => true,
                        'suggestions' => $suggestions,
                        'agents_used' => $agentsUsed,
                        'agents_succeeded' => $agentsSucceeded,
                        'agent_details' => $agentDetails,
                        'agent_errors' => $agentErrors,
                        'synthesis_agent' => null,
                        'fallback_agent' => $agentName,
                        'total_duration_ms' => $totalDuration,
                    ]);
                }
            }
        }

        return response()->json([
            'success' => false,
            'error' => $result['summary_error'] ?? 'Could not parse AI response',
            'agents_used' => $agentsUsed,
            'agents_succeeded' => $agentsSucceeded,
            'agent_details' => $agentDetails,
            'agent_errors' => $agentErrors,
            'total_duration_ms' => $totalDuration,
            'raw_response' => $response ? substr($response, 0, 500) : null,
        ], 422);
    }

    /**
     * Parse suggestions JSON from AI response text.
     */
    private function parseSuggestionsFromResponse(?string $response): ?array
    {
        if (!$response) {
            return null;
        }

        if (preg_match('/\{[\s\S]*\}/', $response, $matches)) {
            $suggestions = json_decode($matches[0], true);
            if ($suggestions) {
                return [
                    'warranty_years' => $suggestions['warranty_years'] ?? null,
                    'maintenance_interval_months' => $suggestions['maintenance_interval_months'] ?? null,
                    'typical_lifespan_years' => $suggestions['typical_lifespan_years'] ?? null,
                    'notes' => $suggestions['notes'] ?? null,
                ];
            }
        }

        return null;
    }

    /**
     * Get AI-suggested replacement and consumable parts for an item using multi-agent orchestration.
     * Enhanced to extract parts from uploaded PDF manuals when available.
     */
    public function suggestParts(Request $request, Item $item): JsonResponse
    {
        Gate::authorize('view', $item);

        $validated = $request->validate([
            'make' => ['required', 'string', 'max:255'],
            'model' => ['required', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:255'],
        ]);

        $householdId = $request->user()->household_id;
        $orchestrator = AIAgentOrchestrator::forHousehold($householdId);

        // Check if any agents are available
        $activeAgents = $orchestrator->getActiveAgents();
        if (empty($activeAgents)) {
            return response()->json([
                'success' => false,
                'error' => 'AI is not configured. Please configure an AI provider in Settings.',
                'agents_used' => [],
                'agents_succeeded' => 0,
            ], 422);
        }

        $categoryContext = $validated['category'] ? " ({$validated['category']})" : '';

        // Extract text from uploaded PDF manuals
        $pdfService = new PdfTextService();
        $item->load('files');
        $manualData = $pdfService->extractFromFiles($item->files);
        $manualsUsed = $manualData['files_processed'];
        
        // Build manual context if we have PDF content
        $manualContext = '';
        if ($manualData['text']) {
            // Limit manual text to avoid exceeding context limits
            $manualText = substr($manualData['text'], 0, 80000);
            $manualContext = <<<MANUAL

=== PRODUCT MANUAL CONTENT ===
The following text was extracted from the product manual(s). Use this to find EXACT part numbers and official replacement parts:

{$manualText}

IMPORTANT: Prioritize part numbers and names found in the manual above. These are the correct, official parts for this specific product.
MANUAL;
        }

        $prompt = <<<PROMPT
You are a home maintenance expert. Given the following product, suggest common replacement parts and consumable parts that homeowners typically need.

Product: {$validated['make']} {$validated['model']}{$categoryContext}
{$manualContext}

For each part, provide:
1. name: A clear, descriptive name
2. type: Either "replacement" (parts that wear out and need replacing) or "consumable" (parts that are regularly used up like filters)
3. part_number: A common/generic part number if known, or null
4. search_term: A search term to find this part online (include make/model for specificity)
5. estimated_price: Rough price estimate in USD, or null if unknown
6. replacement_interval: How often this part typically needs replacing (e.g., "Every 3 months", "Every 5-10 years"), or null

Return 5-10 of the most common/important parts.

You MUST return ONLY a valid JSON array with no additional text, markdown, or explanation.

Format:
[
  {
    "name": "Air Filter",
    "type": "consumable",
    "part_number": null,
    "search_term": "Carrier 24ACC636A003 air filter",
    "estimated_price": 25,
    "replacement_interval": "Every 1-3 months"
  },
  {
    "name": "Capacitor",
    "type": "replacement",
    "part_number": null,
    "search_term": "Carrier AC run capacitor",
    "estimated_price": 15,
    "replacement_interval": "Every 10-15 years"
  }
]

If you cannot determine parts for this product, return an empty array: []
PROMPT;

        $startTime = microtime(true);

        // Call all active agents and get synthesized result
        $result = $orchestrator->callActiveAgentsWithSummary($prompt);

        $totalDuration = (int) ((microtime(true) - $startTime) * 1000);

        // Count successful agents
        $agentsUsed = array_keys($result['agents'] ?? []);
        $agentsSucceeded = count(array_filter($result['agents'] ?? [], fn($r) => $r['success'] ?? false));

        // Build agent details for debugging
        $agentDetails = [];
        $agentErrors = [];
        foreach ($result['agents'] ?? [] as $agentName => $agentResult) {
            $agentDetails[$agentName] = [
                'success' => $agentResult['success'] ?? false,
                'duration_ms' => $agentResult['duration_ms'] ?? 0,
            ];
            if (!($agentResult['success'] ?? false) && ($agentResult['error'] ?? null)) {
                $agentErrors[$agentName] = $agentResult['error'];
            }
        }

        // Try to parse JSON array from synthesized response
        $response = $result['summary'] ?? null;
        if ($response) {
            $parts = $this->parsePartsFromResponse($response, $validated['make'], $validated['model']);
            if ($parts !== null) {
                return response()->json([
                    'success' => true,
                    'parts' => $parts,
                    'agents_used' => $agentsUsed,
                    'agents_succeeded' => $agentsSucceeded,
                    'agent_details' => $agentDetails,
                    'agent_errors' => $agentErrors,
                    'synthesis_agent' => $result['summary_agent'] ?? null,
                    'total_duration_ms' => $totalDuration,
                    'manuals_used' => $manualsUsed,
                ]);
            }
        }

        // Fallback: Try to parse from individual agent responses
        foreach ($result['agents'] ?? [] as $agentName => $agentResult) {
            if (($agentResult['success'] ?? false) && ($agentResult['response'] ?? null)) {
                $parts = $this->parsePartsFromResponse($agentResult['response'], $validated['make'], $validated['model']);
                if ($parts !== null) {
                    return response()->json([
                        'success' => true,
                        'parts' => $parts,
                        'agents_used' => $agentsUsed,
                        'agents_succeeded' => $agentsSucceeded,
                        'agent_details' => $agentDetails,
                        'agent_errors' => $agentErrors,
                        'synthesis_agent' => null,
                        'fallback_agent' => $agentName,
                        'total_duration_ms' => $totalDuration,
                        'manuals_used' => $manualsUsed,
                    ]);
                }
            }
        }

        return response()->json([
            'success' => false,
            'error' => $result['summary_error'] ?? 'Could not parse AI response',
            'agents_used' => $agentsUsed,
            'agents_succeeded' => $agentsSucceeded,
            'agent_details' => $agentDetails,
            'agent_errors' => $agentErrors,
            'total_duration_ms' => $totalDuration,
            'raw_response' => $response ? substr($response, 0, 500) : null,
            'manuals_used' => $manualsUsed,
        ], 422);
    }

    /**
     * Parse parts JSON array from AI response text and add purchase URLs.
     */
    private function parsePartsFromResponse(?string $response, string $make, string $model): ?array
    {
        if (!$response) {
            return null;
        }

        if (preg_match('/\[[\s\S]*\]/', $response, $matches)) {
            $parts = json_decode($matches[0], true);
            if (is_array($parts)) {
                // Generate purchase URLs for each part
                return array_map(function ($part) use ($make, $model) {
                    $searchTerm = $part['search_term'] ?? "{$make} {$model} " . ($part['name'] ?? '');
                    $encodedSearch = urlencode($searchTerm);

                    return [
                        'name' => $part['name'] ?? 'Unknown Part',
                        'type' => in_array($part['type'] ?? '', ['replacement', 'consumable']) ? $part['type'] : 'replacement',
                        'part_number' => $part['part_number'] ?? null,
                        'search_term' => $searchTerm,
                        'estimated_price' => is_numeric($part['estimated_price'] ?? null) ? (float) $part['estimated_price'] : null,
                        'replacement_interval' => $part['replacement_interval'] ?? null,
                        'purchase_urls' => [
                            'repairclinic' => "https://www.repairclinic.com/Shop-For-Parts?q={$encodedSearch}",
                            'amazon' => "https://www.amazon.com/s?k={$encodedSearch}",
                            'home_depot' => "https://www.homedepot.com/s/{$encodedSearch}",
                        ],
                    ];
                }, $parts);
            }
        }

        return null;
    }

    /**
     * Search for a product image for a part.
     */
    public function searchPartImage(Request $request, Item $item): JsonResponse
    {
        Gate::authorize('view', $item);

        $validated = $request->validate([
            'search_term' => ['required', 'string', 'max:500'],
            'part_name' => ['nullable', 'string', 'max:255'],
        ]);

        $imageService = new ProductImageSearchService();
        $imageUrl = $imageService->searchForPartImage($validated['search_term']);

        return response()->json([
            'success' => $imageUrl !== null,
            'image_url' => $imageUrl,
            'search_term' => $validated['search_term'],
        ]);
    }

    /**
     * Build the AI prompt for getting maintenance suggestions.
     */
    private function buildSuggestionPrompt(string $make, string $model, ?string $category): string
    {
        $categoryContext = $category ? " in the {$category} category" : '';

        return <<<PROMPT
You are a home maintenance expert. Given the following product information, provide typical maintenance and warranty information.

Product: {$make} {$model}{$categoryContext}

Provide the following information based on typical products of this type:
1. Typical manufacturer warranty period (in years)
2. Recommended maintenance interval (in months)
3. Typical lifespan (in years)
4. Brief maintenance notes or tips (1-2 sentences)

You MUST return ONLY a valid JSON object with no additional text, markdown, or explanation.

Format:
{
  "warranty_years": 2,
  "maintenance_interval_months": 12,
  "typical_lifespan_years": 15,
  "notes": "Regular filter changes and annual professional inspection recommended."
}

If you cannot determine the information, use reasonable estimates based on the product category.
PROMPT;
    }
}
