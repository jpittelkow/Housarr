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
use App\Services\AIService;
use App\Services\ManualSearchService;
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

        $limit = $validated['limit'] ?? 200;
        $items = $query->orderBy('name')->limit($limit)->get();

        return response()->json([
            'items' => ItemResource::collection($items),
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
                'maintenanceLogs' => fn($q) => $q->orderBy('date', 'desc'),
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
        $request->validate([
            'image' => ['required_without:query', 'nullable', 'file', 'mimes:jpeg,jpg,png,webp', 'max:10240'],
            'query' => ['required_without:image', 'nullable', 'string', 'max:500'],
            'categories' => ['nullable', 'string'],
        ]);

        $categories = [];
        if ($request->has('categories')) {
            $categories = json_decode($request->input('categories'), true) ?? [];
        }

        try {
            $results = $analyzeAction->execute(
                $request->file('image'),
                $categories,
                $request->user()->household_id,
                $request->input('query')
            );

            return response()->json([
                'results' => $results,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'results' => [],
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
            ]);
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
                $urls = $manualService->searchWithDuckDuckGoPublic($validated['make'], $validated['model']);
                break;
        }

        return response()->json([
            'step' => $validated['step'],
            'step_name' => $stepName,
            'urls' => $urls,
            'count' => count($urls),
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
            return response()->json([
                'success' => false,
                'message' => 'Could not download from this source.',
            ]);
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

        $categoryContext = $validated['category'] ? " in the {$validated['category']} category" : '';

        $prompt = <<<PROMPT
You are a home maintenance expert. Given the following product information, provide typical maintenance and warranty information.

Product: {$validated['make']} {$validated['model']}{$categoryContext}

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
     * Combined AI suggestions endpoint - no separate config check needed.
     * Returns provider info alongside suggestions for UI display.
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
        $aiService = AIService::forHousehold($householdId);

        // Return provider info along with availability status
        $provider = $aiService->isAvailable() ? $aiService->getProvider() : null;
        $model = $aiService->isAvailable() ? $aiService->getModel() : null;

        if (!$aiService->isAvailable()) {
            return response()->json([
                'success' => false,
                'error' => 'AI is not configured. Please configure an AI provider in Settings.',
                'provider' => null,
                'model' => null,
            ], 422);
        }

        $categoryContext = $validated['category'] ? " in the {$validated['category']} category" : '';

        $prompt = <<<PROMPT
You are a home maintenance expert. Given the following product information, provide typical maintenance and warranty information.

Product: {$validated['make']} {$validated['model']}{$categoryContext}

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

        $result = $aiService->completeWithError($prompt);

        if ($result['error']) {
            return response()->json([
                'success' => false,
                'error' => $result['error'],
                'provider' => $provider,
                'model' => $model,
                'raw_response' => null,
            ]);
        }

        $response = $result['response'];

        // Try to parse JSON from response
        $jsonMatch = preg_match('/\{[\s\S]*\}/', $response, $matches);
        if ($jsonMatch) {
            $suggestions = json_decode($matches[0], true);
            if ($suggestions) {
                return response()->json([
                    'success' => true,
                    'provider' => $provider,
                    'model' => $model,
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
            'success' => false,
            'error' => 'Could not parse AI response',
            'provider' => $provider,
            'model' => $model,
            'raw_response' => substr($response, 0, 500),
        ]);
    }

    /**
     * Get AI-suggested replacement and consumable parts for an item.
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
        $aiService = AIService::forHousehold($householdId);

        if (!$aiService->isAvailable()) {
            return response()->json([
                'success' => false,
                'error' => 'AI is not configured',
            ], 422);
        }

        $provider = $aiService->getProvider();
        $model = $aiService->getModel();
        $categoryContext = $validated['category'] ? " ({$validated['category']})" : '';

        $prompt = <<<PROMPT
You are a home maintenance expert. Given the following product, suggest common replacement parts and consumable parts that homeowners typically need.

Product: {$validated['make']} {$validated['model']}{$categoryContext}

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

        $result = $aiService->completeWithError($prompt);

        if ($result['error']) {
            return response()->json([
                'success' => false,
                'error' => $result['error'],
                'provider' => $provider,
            ]);
        }

        $response = $result['response'];

        // Try to parse JSON array from response
        if (preg_match('/\[[\s\S]*\]/', $response, $matches)) {
            $parts = json_decode($matches[0], true);
            if (is_array($parts)) {
                // Generate purchase URLs for each part
                $partsWithUrls = array_map(function ($part) {
                    $searchTerm = $part['search_term'] ?? $part['name'];
                    $encodedSearch = urlencode($searchTerm);

                    return [
                        'name' => $part['name'] ?? 'Unknown Part',
                        'type' => in_array($part['type'] ?? '', ['replacement', 'consumable']) ? $part['type'] : 'replacement',
                        'part_number' => $part['part_number'] ?? null,
                        'estimated_price' => is_numeric($part['estimated_price'] ?? null) ? (float) $part['estimated_price'] : null,
                        'replacement_interval' => $part['replacement_interval'] ?? null,
                        'purchase_urls' => [
                            'repairclinic' => "https://www.repairclinic.com/Shop-For-Parts?q={$encodedSearch}",
                            'amazon' => "https://www.amazon.com/s?k={$encodedSearch}",
                            'home_depot' => "https://www.homedepot.com/s/{$encodedSearch}",
                        ],
                    ];
                }, $parts);

                return response()->json([
                    'success' => true,
                    'provider' => $provider,
                    'parts' => $partsWithUrls,
                ]);
            }
        }

        return response()->json([
            'success' => false,
            'error' => 'Could not parse AI response',
            'provider' => $provider,
            'raw_response' => substr($response, 0, 500),
        ]);
    }
}
