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
            'name' => ['required', 'string', 'max:255'],
        ]);

        $household = $request->user()->household;
        $household->update($validated);

        return response()->json([
            'household' => new HouseholdResource($household->load(['images', 'featuredImage'])),
        ]);
    }
}
