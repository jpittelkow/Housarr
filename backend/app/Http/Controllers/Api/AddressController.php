<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\NominatimService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AddressController extends Controller
{
    protected NominatimService $nominatim;

    public function __construct(NominatimService $nominatim)
    {
        $this->nominatim = $nominatim;
    }

    /**
     * Search for addresses matching a query.
     * 
     * GET /api/address/autocomplete?query=...&limit=5&countrycodes=us,ca
     */
    public function autocomplete(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'query' => ['required', 'string', 'min:3', 'max:500'],
            'limit' => ['sometimes', 'integer', 'min:1', 'max:10'],
            'countrycodes' => ['sometimes', 'nullable', 'string', 'max:50'],
        ]);

        $results = $this->nominatim->search(
            $validated['query'],
            $validated['limit'] ?? 5,
            $validated['countrycodes'] ?? null
        );

        return response()->json([
            'suggestions' => $results,
            'count' => count($results),
        ]);
    }

    /**
     * Reverse geocode coordinates to an address.
     * 
     * GET /api/address/reverse?lat=...&lon=...
     */
    public function reverse(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lon' => ['required', 'numeric', 'between:-180,180'],
        ]);

        $result = $this->nominatim->reverse(
            (float) $validated['lat'],
            (float) $validated['lon']
        );

        if (!$result) {
            return response()->json([
                'address' => null,
                'message' => 'No address found for the given coordinates',
            ], 404);
        }

        return response()->json([
            'address' => $result,
        ]);
    }
}
