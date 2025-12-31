<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\HouseholdResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HouseholdController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return response()->json([
            'household' => new HouseholdResource($request->user()->household->load(['images', 'featuredImage'])),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        if (!$request->user()->isAdmin()) {
            abort(403, 'Only admins can update household settings.');
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'address' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'latitude' => ['sometimes', 'nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['sometimes', 'nullable', 'numeric', 'between:-180,180'],
        ]);

        $household = $request->user()->household;
        $household->update($validated);

        return response()->json([
            'household' => new HouseholdResource($household->load(['images', 'featuredImage'])),
        ]);
    }
}
