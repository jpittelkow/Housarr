<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreReminderRequest;
use App\Http\Requests\Api\UpdateReminderRequest;
use App\Http\Resources\ReminderResource;
use App\Models\Reminder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class ReminderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['nullable', 'string', 'in:pending,snoozed,completed,dismissed'],
            'overdue' => ['nullable', 'boolean'],
            'upcoming' => ['nullable', 'integer', 'min:1', 'max:365'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:500'],
        ]);

        $query = Reminder::where('household_id', $request->user()->household_id)
            ->with(['item', 'part', 'user']);

        if (!empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        if ($request->boolean('overdue')) {
            $query->overdue();
        }

        if (!empty($validated['upcoming'])) {
            $query->upcoming((int) $validated['upcoming']);
        }

        $limit = $validated['limit'] ?? 200;
        $reminders = $query->orderBy('due_date')->limit($limit)->get();

        return response()->json([
            'reminders' => ReminderResource::collection($reminders),
        ]);
    }

    public function store(StoreReminderRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $reminder = Reminder::create([
            'household_id' => $request->user()->household_id,
            'status' => 'pending',
            ...$validated,
        ]);

        return response()->json([
            'reminder' => new ReminderResource($reminder->load(['item', 'part', 'user'])),
        ], 201);
    }

    public function show(Request $request, Reminder $reminder): JsonResponse
    {
        Gate::authorize('view', $reminder);

        return response()->json([
            'reminder' => new ReminderResource($reminder->load(['item', 'part', 'user'])),
        ]);
    }

    public function update(UpdateReminderRequest $request, Reminder $reminder): JsonResponse
    {
        $validated = $request->validated();
        $reminder->update($validated);

        return response()->json([
            'reminder' => new ReminderResource($reminder->load(['item', 'part', 'user'])),
        ]);
    }

    public function destroy(Request $request, Reminder $reminder): JsonResponse
    {
        Gate::authorize('delete', $reminder);

        $reminder->delete();

        return response()->json([
            'message' => 'Reminder deleted successfully',
        ]);
    }

    public function snooze(Request $request, Reminder $reminder): JsonResponse
    {
        Gate::authorize('update', $reminder);

        $validated = $request->validate([
            'days' => ['sometimes', 'integer', 'min:1', 'max:365'],
        ]);

        $reminder->snooze($validated['days'] ?? 1);

        return response()->json([
            'reminder' => new ReminderResource($reminder->fresh()->load(['item', 'part', 'user'])),
        ]);
    }

    public function complete(Request $request, Reminder $reminder): JsonResponse
    {
        Gate::authorize('update', $reminder);

        $reminder->complete();

        return response()->json([
            'message' => 'Reminder completed successfully',
            'reminder' => new ReminderResource($reminder->fresh()->load(['item', 'part', 'user'])),
        ]);
    }
}
