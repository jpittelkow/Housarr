<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreVendorRequest;
use App\Http\Resources\VendorResource;
use App\Models\Vendor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

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
}
