<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StorePartRequest;
use App\Http\Resources\PartResource;
use App\Models\Item;
use App\Models\Part;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class PartController extends Controller
{
    public function index(Request $request, Item $item): JsonResponse
    {
        Gate::authorize('view', $item);

        return response()->json([
            'replacement_parts' => PartResource::collection($item->replacementParts),
            'consumable_parts' => PartResource::collection($item->consumableParts),
        ]);
    }

    public function store(StorePartRequest $request): JsonResponse
    {
        $part = Part::create($request->validated());

        return response()->json([
            'part' => new PartResource($part),
        ], 201);
    }

    /**
     * Store multiple parts at once.
     */
    public function storeBatch(Request $request): JsonResponse
    {
        $householdId = $request->user()->household_id;

        $validated = $request->validate([
            'item_id' => [
                'required',
                'integer',
                Rule::exists('items', 'id')->where('household_id', $householdId),
            ],
            'parts' => ['required', 'array', 'min:1', 'max:20'],
            'parts.*.name' => ['required', 'string', 'max:255'],
            'parts.*.part_number' => ['nullable', 'string', 'max:255'],
            'parts.*.type' => ['required', Rule::in(['replacement', 'consumable'])],
            'parts.*.purchase_url' => ['nullable', 'url', 'max:500'],
            'parts.*.purchase_urls' => ['nullable', 'array'],
            'parts.*.purchase_urls.*' => ['nullable', 'url', 'max:500'],
            'parts.*.price' => ['nullable', 'numeric', 'min:0', 'max:999999.99'],
            'parts.*.notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $createdParts = [];
        foreach ($validated['parts'] as $partData) {
            $createdParts[] = Part::create([
                'item_id' => $validated['item_id'],
                'name' => $partData['name'],
                'part_number' => $partData['part_number'] ?? null,
                'type' => $partData['type'],
                'purchase_url' => $partData['purchase_url'] ?? null,
                'purchase_urls' => $partData['purchase_urls'] ?? null,
                'price' => $partData['price'] ?? null,
                'notes' => $partData['notes'] ?? null,
            ]);
        }

        return response()->json([
            'parts' => PartResource::collection(collect($createdParts)),
            'count' => count($createdParts),
        ], 201);
    }

    public function update(Request $request, Part $part): JsonResponse
    {
        Gate::authorize('update', $part);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'part_number' => ['nullable', 'string', 'max:255'],
            'type' => ['sometimes', Rule::in(['replacement', 'consumable'])],
            'purchase_url' => ['nullable', 'url', 'max:500'],
            'price' => ['nullable', 'numeric', 'min:0', 'max:999999.99'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $part->update($validated);

        return response()->json([
            'part' => new PartResource($part),
        ]);
    }

    public function destroy(Request $request, Part $part): JsonResponse
    {
        Gate::authorize('delete', $part);

        $part->delete();

        return response()->json([
            'message' => 'Part deleted successfully',
        ]);
    }
}
