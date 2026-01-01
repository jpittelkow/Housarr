<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\LocationResource;
use App\Models\Location;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class LocationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $locations = Location::where('household_id', $request->user()->household_id)
            ->withCount('items')
            ->with(['featuredImage', 'images'])
            ->orderBy('name')
            ->get();

        return response()->json([
            'locations' => LocationResource::collection($locations),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'icon' => ['nullable', 'string', 'max:50'],
            'notes' => ['nullable', 'string'],
        ]);

        $location = Location::create([
            'household_id' => $request->user()->household_id,
            ...$validated,
        ]);

        return response()->json([
            'location' => new LocationResource($location),
        ], 201);
    }

    public function show(Request $request, Location $location): JsonResponse
    {
        Gate::authorize('view', $location);

        return response()->json([
            'location' => new LocationResource($location->loadCount('items')->load(['images', 'featuredImage', 'paintColors'])),
        ]);
    }

    public function update(Request $request, Location $location): JsonResponse
    {
        Gate::authorize('update', $location);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'icon' => ['nullable', 'string', 'max:50'],
            'notes' => ['nullable', 'string'],
        ]);

        $location->update($validated);

        return response()->json([
            'location' => new LocationResource($location->loadCount('items')->load(['images', 'featuredImage', 'paintColors'])),
        ]);
    }

    public function destroy(Request $request, Location $location): JsonResponse
    {
        Gate::authorize('delete', $location);

        if ($location->items()->exists()) {
            return response()->json([
                'message' => 'Cannot delete location with associated items. Please reassign or delete the items first.',
            ], 422);
        }

        $location->delete();

        return response()->json([
            'message' => 'Location deleted successfully',
        ]);
    }
}
