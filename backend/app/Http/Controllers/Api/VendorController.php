<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreVendorRequest;
use App\Http\Resources\VendorResource;
use App\Models\Category;
use App\Models\Vendor;
use App\Services\AIAgentOrchestrator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;

class VendorController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $vendors = Vendor::where('household_id', $request->user()->household_id)
            ->with(['category', 'logo'])
            ->orderBy('name')
            ->get();

        return response()->json([
            'vendors' => VendorResource::collection($vendors),
        ]);
    }

    public function store(StoreVendorRequest $request): JsonResponse
    {
        $vendor = Vendor::create([
            'household_id' => $request->user()->household_id,
            ...$request->validated(),
        ]);

        return response()->json([
            'vendor' => new VendorResource($vendor->load(['category', 'logo'])),
        ], 201);
    }

    public function show(Request $request, Vendor $vendor): JsonResponse
    {
        Gate::authorize('view', $vendor);

        return response()->json([
            'vendor' => new VendorResource($vendor->load(['category', 'items', 'maintenanceLogs', 'images', 'logo'])),
        ]);
    }

    public function update(Request $request, Vendor $vendor): JsonResponse
    {
        Gate::authorize('update', $vendor);

        $householdId = $request->user()->household_id;

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'category_id' => [
                'nullable',
                'integer',
                \Illuminate\Validation\Rule::exists('categories', 'id')->where(function ($query) use ($householdId) {
                    $query->whereNull('household_id')->orWhere('household_id', $householdId);
                }),
            ],
            'company' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'string', 'email', 'max:255'],
            'website' => ['nullable', 'url', 'max:500'],
            'address' => ['nullable', 'string', 'max:500'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $vendor->update($validated);

        return response()->json([
            'vendor' => new VendorResource($vendor->load('category')),
        ]);
    }

    public function destroy(Request $request, Vendor $vendor): JsonResponse
    {
        Gate::authorize('delete', $vendor);

        $vendor->delete();

        return response()->json([
            'message' => 'Vendor deleted successfully',
        ]);
    }

    /**
     * Search for nearby vendors using AI.
     * 
     * POST /api/vendors/search-nearby
     */
    public function searchNearby(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'query' => ['required', 'string', 'min:2', 'max:500'],
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
        ]);

        $household = $request->user()->household;
        
        if (empty($household->address)) {
            return response()->json([
                'success' => false,
                'error' => 'Please set your household address in Settings before searching for nearby vendors.',
                'vendors' => [],
            ], 422);
        }

        $householdId = $household->id;
        $orchestrator = AIAgentOrchestrator::forHousehold($householdId);

        if (!$orchestrator->isAvailable()) {
            return response()->json([
                'success' => false,
                'error' => 'AI is not configured. Please set up an AI provider in Settings to search for vendors.',
                'vendors' => [],
            ], 422);
        }

        // Get category name if provided
        $categoryName = null;
        if (!empty($validated['category_id'])) {
            $category = Category::find($validated['category_id']);
            $categoryName = $category?->name;
        }

        // Build the AI prompt
        $prompt = $this->buildVendorSearchPrompt(
            $validated['query'],
            $household->address,
            $categoryName
        );

        try {
            $startTime = microtime(true);
            $result = $orchestrator->callActiveAgentsWithSummary($prompt, [
                'max_tokens' => 2048,
                'timeout' => 60,
            ]);
            $duration = (int) ((microtime(true) - $startTime) * 1000);

            // Parse the AI response
            $vendors = $this->parseVendorSearchResponse($result);

            return response()->json([
                'success' => true,
                'vendors' => $vendors,
                'query' => $validated['query'],
                'address' => $household->address,
                'agents_used' => array_keys($result['agents'] ?? []),
                'total_duration_ms' => $duration,
            ]);
        } catch (\Exception $e) {
            Log::error('Vendor search error', [
                'error' => $e->getMessage(),
                'query' => $validated['query'],
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Failed to search for vendors. Please try again.',
                'vendors' => [],
            ], 500);
        }
    }

    /**
     * Build the AI prompt for vendor search.
     */
    protected function buildVendorSearchPrompt(string $query, string $address, ?string $category): string
    {
        $categoryText = $category ? "Category/Type: {$category}" : 'Category: General service provider';

        return <<<PROMPT
You are helping find local service providers and vendors near a specific location.

Household Location: {$address}
Search Query: {$query}
{$categoryText}

Please search for and return up to 10 local businesses or service providers that match this query near the given address.

For each vendor, provide:
- name: Business name
- company: Company/brand name (if different from name)
- phone: Phone number (format: (XXX) XXX-XXXX for US)
- email: Email address if commonly available
- website: Website URL
- address: Full business address
- notes: Brief description of services offered

IMPORTANT: Return ONLY a valid JSON array with no additional text, markdown, or explanation.
If you cannot find any matches, return an empty array: []

Format:
[
  {
    "name": "Business Name",
    "company": "Company Name",
    "phone": "(555) 123-4567",
    "email": "contact@example.com",
    "website": "https://example.com",
    "address": "123 Main St, City, State ZIP",
    "notes": "Brief description of services"
  }
]
PROMPT;
    }

    /**
     * Parse the AI response to extract vendor data.
     */
    protected function parseVendorSearchResponse(array $result): array
    {
        $responseText = $result['summary'] ?? null;

        if (empty($responseText)) {
            // Try to get response from individual agents
            foreach ($result['agents'] ?? [] as $agentResult) {
                if (!empty($agentResult['response'])) {
                    $responseText = $agentResult['response'];
                    break;
                }
            }
        }

        if (empty($responseText)) {
            return [];
        }

        // Try to extract JSON from the response
        $json = $this->extractJson($responseText);
        
        if (!$json) {
            Log::warning('Failed to parse vendor search response', [
                'response' => substr($responseText, 0, 500),
            ]);
            return [];
        }

        $vendors = json_decode($json, true);

        if (!is_array($vendors)) {
            return [];
        }

        // Normalize and validate each vendor
        return array_filter(array_map(function ($vendor) {
            if (!is_array($vendor) || empty($vendor['name'])) {
                return null;
            }

            return [
                'name' => $vendor['name'] ?? '',
                'company' => $vendor['company'] ?? null,
                'phone' => $vendor['phone'] ?? null,
                'email' => $vendor['email'] ?? null,
                'website' => $vendor['website'] ?? null,
                'address' => $vendor['address'] ?? null,
                'notes' => $vendor['notes'] ?? null,
            ];
        }, $vendors));
    }

    /**
     * Extract JSON array from AI response text.
     */
    protected function extractJson(string $text): ?string
    {
        // Try to find JSON array in the text
        if (preg_match('/\[[\s\S]*\]/', $text, $matches)) {
            $json = $matches[0];
            // Validate it's parseable
            json_decode($json);
            if (json_last_error() === JSON_ERROR_NONE) {
                return $json;
            }
        }

        // Try the whole text as JSON
        json_decode($text);
        if (json_last_error() === JSON_ERROR_NONE) {
            return $text;
        }

        return null;
    }
}
