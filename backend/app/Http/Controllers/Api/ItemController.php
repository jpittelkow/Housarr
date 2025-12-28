<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreItemRequest;
use App\Http\Requests\Api\UpdateItemRequest;
use App\Http\Resources\FileResource;
use App\Http\Resources\ItemResource;
use App\Models\Item;
use App\Services\AIService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
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
        ]);

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

        $item->files->each(fn($file) => $file->deleteFile());
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

    public function analyzeImage(Request $request): JsonResponse
    {
        $request->validate([
            'image' => ['required', 'file', 'mimes:jpeg,jpg,png,webp', 'max:10240'],
        ]);

        $householdId = $request->user()->household_id;
        $aiService = AIService::forHousehold($householdId);

        if (!$aiService->isAvailable()) {
            return response()->json([
                'message' => 'AI is not configured. Please configure an AI provider in Settings.',
            ], 422);
        }

        $file = $request->file('image');
        $base64Image = base64_encode(file_get_contents($file->getRealPath()));
        $mimeType = $file->getMimeType();

        $prompt = <<<'PROMPT'
Analyze this image of a home appliance, equipment, or product.
Identify the following:
1. Make/Manufacturer (e.g., Carrier, GE, Samsung, Whirlpool)
2. Model number (look for model plates, labels, or distinctive features)
3. Product type/category (e.g., Air Conditioner, Refrigerator, Water Heater, Washer, Furnace)

Return up to 10 possible matches ranked by confidence.
You MUST return ONLY a valid JSON array with no additional text, markdown, or explanation.

Format:
[
  { "make": "Brand Name", "model": "Model Number", "type": "Product Type", "confidence": 0.95 },
  { "make": "Brand Name", "model": "Alternative Model", "type": "Product Type", "confidence": 0.80 }
]

If you cannot identify the product, return an empty array: []
PROMPT;

        $results = $aiService->analyzeImage($base64Image, $mimeType, $prompt);

        if ($results === null) {
            return response()->json([
                'message' => 'Failed to analyze image. Please try again.',
                'results' => [],
            ], 422);
        }

        // Normalize and validate results
        $normalizedResults = [];
        foreach ($results as $result) {
            if (isset($result['make']) || isset($result['model']) || isset($result['type'])) {
                $normalizedResults[] = [
                    'make' => $result['make'] ?? '',
                    'model' => $result['model'] ?? '',
                    'type' => $result['type'] ?? '',
                    'confidence' => (float) ($result['confidence'] ?? 0.5),
                ];
            }
        }

        // Sort by confidence
        usort($normalizedResults, fn($a, $b) => $b['confidence'] <=> $a['confidence']);

        return response()->json([
            'results' => $normalizedResults,
        ]);
    }
}
