<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreMaintenanceLogRequest;
use App\Http\Resources\MaintenanceLogResource;
use App\Models\Item;
use App\Models\MaintenanceLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class MaintenanceLogController extends Controller
{
    public function index(Request $request, Item $item): JsonResponse
    {
        Gate::authorize('view', $item);

        $logs = $item->maintenanceLogs()
            ->with(['vendor', 'parts'])
            ->latest('date')
            ->get();

        return response()->json([
            'logs' => MaintenanceLogResource::collection($logs),
        ]);
    }

    public function store(StoreMaintenanceLogRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $partIds = $validated['part_ids'] ?? [];
        unset($validated['part_ids']);

        $log = MaintenanceLog::create($validated);

        if (! empty($partIds)) {
            $log->parts()->sync($partIds);
        }

        return response()->json([
            'log' => new MaintenanceLogResource($log->load(['vendor', 'parts'])),
        ], 201);
    }

    public function update(Request $request, MaintenanceLog $maintenanceLog): JsonResponse
    {
        Gate::authorize('update', $maintenanceLog);

        $householdId = $request->user()->household_id;

        $validated = $request->validate([
            'vendor_id' => [
                'nullable',
                'integer',
                Rule::exists('vendors', 'id')->where('household_id', $householdId),
            ],
            'type' => ['sometimes', Rule::in(['service', 'repair', 'replacement', 'inspection'])],
            'date' => ['sometimes', 'date', 'before_or_equal:today'],
            'cost' => ['nullable', 'numeric', 'min:0', 'max:999999.99'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'part_ids' => ['sometimes', 'array'],
            'part_ids.*' => ['integer', 'exists:parts,id'],
        ]);

        $partIds = $validated['part_ids'] ?? null;
        unset($validated['part_ids']);

        $maintenanceLog->update($validated);

        if ($partIds !== null) {
            $maintenanceLog->parts()->sync($partIds);
        }

        return response()->json([
            'log' => new MaintenanceLogResource($maintenanceLog->load(['vendor', 'parts'])),
        ]);
    }

    public function destroy(Request $request, MaintenanceLog $maintenanceLog): JsonResponse
    {
        Gate::authorize('delete', $maintenanceLog);

        $maintenanceLog->delete();

        return response()->json([
            'message' => 'Maintenance log deleted successfully',
        ]);
    }
}
