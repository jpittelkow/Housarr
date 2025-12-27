<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreItemRequest;
use App\Http\Requests\Api\UpdateItemRequest;
use App\Http\Resources\FileResource;
use App\Http\Resources\ItemResource;
use App\Models\Item;
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
        ]);

        $query = Item::where('household_id', $householdId)
            ->with(['category', 'vendor', 'location']);

        if (!empty($validated['category_id'])) {
            $query->where('category_id', $validated['category_id']);
        }

        if (!empty($validated['search'])) {
            $query->search($validated['search']);
        }

        $items = $query->orderBy('name')->get();

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
            'item' => new ItemResource($item->load(['category', 'vendor', 'location'])),
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
                'maintenanceLogs' => fn($q) => $q->orderBy('date', 'desc'),
                'reminders' => fn($q) => $q->where('status', 'pending'),
                'files',
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
}
