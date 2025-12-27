<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\LocationResource;
use App\Models\Location;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LocationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $locations = Location::where('household_id', $request->user()->household_id)
            ->withCount('items')
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
        if ($location->household_id !== $request->user()->household_id) {
            abort(403);
        }

        return response()->json([
            'location' => new LocationResource($location->loadCount('items')),
        ]);
    }

    public function update(Request $request, Location $location): JsonResponse
    {
        if ($location->household_id !== $request->user()->household_id) {
            abort(403);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'icon' => ['nullable', 'string', 'max:50'],
        ]);

        $location->update($validated);

        return response()->json([
            'location' => new LocationResource($location->loadCount('items')),
        ]);
    }

    public function destroy(Request $request, Location $location): JsonResponse
    {
        if ($location->household_id !== $request->user()->household_id) {
            abort(403);
        }

        $location->delete();

        return response()->json([
            'message' => 'Location deleted successfully',
        ]);
    }
}
