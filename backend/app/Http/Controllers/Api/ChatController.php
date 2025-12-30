<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Item;
use App\Services\ChatService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class ChatController extends Controller
{
    /**
     * Send a general chat message (not item-specific).
     */
    public function chat(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'message' => ['required', 'string', 'max:5000'],
            'conversation_history' => ['nullable', 'array', 'max:20'],
            'conversation_history.*.role' => ['required', 'string', 'in:user,assistant'],
            'conversation_history.*.content' => ['required', 'string', 'max:10000'],
        ]);

        $householdId = $request->user()->household_id;
        $chatService = ChatService::forHousehold($householdId);

        if (!$chatService->isAvailable()) {
            return response()->json([
                'success' => false,
                'error' => 'AI is not configured. Please configure an AI provider in Settings.',
            ], 422);
        }

        $result = $chatService->chat(
            $validated['message'],
            $validated['conversation_history'] ?? []
        );

        if (!$result['success']) {
            return response()->json([
                'success' => false,
                'error' => $result['error'],
            ], 422);
        }

        return response()->json([
            'success' => true,
            'response' => $result['response'],
            'agent' => $result['agent'] ?? null,
            'duration_ms' => $result['duration_ms'] ?? null,
        ]);
    }

    /**
     * Send a chat message with item context.
     */
    public function chatWithItem(Request $request, Item $item): JsonResponse
    {
        Gate::authorize('view', $item);

        $validated = $request->validate([
            'message' => ['required', 'string', 'max:5000'],
            'conversation_history' => ['nullable', 'array', 'max:20'],
            'conversation_history.*.role' => ['required', 'string', 'in:user,assistant'],
            'conversation_history.*.content' => ['required', 'string', 'max:10000'],
            'include_manuals' => ['nullable', 'boolean'],
            'include_service_history' => ['nullable', 'boolean'],
            'include_parts' => ['nullable', 'boolean'],
        ]);

        $householdId = $request->user()->household_id;
        $chatService = ChatService::forHousehold($householdId);

        if (!$chatService->isAvailable()) {
            return response()->json([
                'success' => false,
                'error' => 'AI is not configured. Please configure an AI provider in Settings.',
            ], 422);
        }

        // Load relationships for context
        $item->load(['category', 'location', 'vendor', 'files', 'maintenanceLogs', 'maintenanceLogs.parts', 'maintenanceLogs.vendor', 'parts']);

        $result = $chatService->chatWithItemContext(
            $item,
            $validated['message'],
            $validated['conversation_history'] ?? [],
            $validated['include_manuals'] ?? true,
            $validated['include_service_history'] ?? true,
            $validated['include_parts'] ?? true
        );

        if (!$result['success']) {
            return response()->json([
                'success' => false,
                'error' => $result['error'],
            ], 422);
        }

        return response()->json([
            'success' => true,
            'response' => $result['response'],
            'agent' => $result['agent'] ?? null,
            'duration_ms' => $result['duration_ms'] ?? null,
            'context' => $result['context'] ?? null,
        ]);
    }

    /**
     * Get suggested questions for an item.
     */
    public function getSuggestedQuestions(Request $request, Item $item): JsonResponse
    {
        Gate::authorize('view', $item);

        $householdId = $request->user()->household_id;
        $chatService = ChatService::forHousehold($householdId);

        // Load relationships for context-aware suggestions
        $item->load(['category', 'files', 'maintenanceLogs']);

        $suggestions = $chatService->getSuggestedQuestions($item);

        return response()->json([
            'suggestions' => $suggestions,
        ]);
    }

    /**
     * Check if chat is available.
     */
    public function checkAvailability(Request $request): JsonResponse
    {
        $householdId = $request->user()->household_id;
        $chatService = ChatService::forHousehold($householdId);

        return response()->json([
            'available' => $chatService->isAvailable(),
            'agent' => $chatService->getPrimaryAgent(),
        ]);
    }
}
