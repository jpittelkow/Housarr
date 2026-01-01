<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PaintColorResource;
use App\Models\Location;
use App\Models\PaintColor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class PaintColorController extends Controller
{
    public function index(Request $request, Location $location): JsonResponse
    {
        Gate::authorize('view', $location);

        $paintColors = $location->paintColors()->orderBy('created_at', 'desc')->get();

        return response()->json([
            'paint_colors' => PaintColorResource::collection($paintColors),
        ]);
    }

    public function store(Request $request, Location $location): JsonResponse
    {
        Gate::authorize('update', $location);

        $validated = $request->validate([
            'brand' => ['nullable', 'string', 'max:255'],
            'color_name' => ['required', 'string', 'max:255'],
            'hex_code' => ['nullable', 'string', 'size:7', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'rgb_r' => ['nullable', 'integer', 'min:0', 'max:255'],
            'rgb_g' => ['nullable', 'integer', 'min:0', 'max:255'],
            'rgb_b' => ['nullable', 'integer', 'min:0', 'max:255'],
            'cmyk_c' => ['nullable', 'integer', 'min:0', 'max:100'],
            'cmyk_m' => ['nullable', 'integer', 'min:0', 'max:100'],
            'cmyk_y' => ['nullable', 'integer', 'min:0', 'max:100'],
            'cmyk_k' => ['nullable', 'integer', 'min:0', 'max:100'],
            'purchase_url' => ['nullable', 'url', 'max:500'],
            'product_url' => ['nullable', 'url', 'max:500'],
        ]);

        $paintColor = PaintColor::create([
            'location_id' => $location->id,
            ...$validated,
        ]);

        return response()->json([
            'paint_color' => new PaintColorResource($paintColor),
        ], 201);
    }

    public function update(Request $request, Location $location, PaintColor $paintColor): JsonResponse
    {
        Gate::authorize('update', $location);
        Gate::authorize('update', $paintColor);

        $validated = $request->validate([
            'brand' => ['sometimes', 'nullable', 'string', 'max:255'],
            'color_name' => ['sometimes', 'string', 'max:255'],
            'hex_code' => ['sometimes', 'nullable', 'string', 'size:7', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'rgb_r' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:255'],
            'rgb_g' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:255'],
            'rgb_b' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:255'],
            'cmyk_c' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:100'],
            'cmyk_m' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:100'],
            'cmyk_y' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:100'],
            'cmyk_k' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:100'],
            'purchase_url' => ['sometimes', 'nullable', 'url', 'max:500'],
            'product_url' => ['sometimes', 'nullable', 'url', 'max:500'],
        ]);

        $paintColor->update($validated);

        return response()->json([
            'paint_color' => new PaintColorResource($paintColor),
        ]);
    }

    public function destroy(Request $request, Location $location, PaintColor $paintColor): JsonResponse
    {
        Gate::authorize('update', $location);
        Gate::authorize('delete', $paintColor);

        $paintColor->delete();

        return response()->json([
            'message' => 'Paint color deleted successfully',
        ]);
    }
}
