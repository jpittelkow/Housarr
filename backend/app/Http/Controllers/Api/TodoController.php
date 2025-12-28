<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreTodoRequest;
use App\Http\Resources\TodoResource;
use App\Models\Todo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class TodoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'limit' => ['nullable', 'integer', 'min:1', 'max:500'],
        ]);

        $query = Todo::where('household_id', $request->user()->household_id)
            ->with(['item', 'user']);

        if ($request->boolean('completed')) {
            $query->completed();
        } elseif ($request->boolean('incomplete')) {
            $query->incomplete();
        }

        if ($request->filled('priority')) {
            $query->where('priority', $request->string('priority'));
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->integer('user_id'));
        }

        $limit = $validated['limit'] ?? 200;
        $todos = $query
            ->orderByRaw('completed_at IS NOT NULL')
            ->orderByRaw("CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END")
            ->orderBy('due_date')
            ->limit($limit)
            ->get();

        return response()->json([
            'todos' => TodoResource::collection($todos),
        ]);
    }

    public function store(StoreTodoRequest $request): JsonResponse
    {
        $todo = Todo::create([
            'household_id' => $request->user()->household_id,
            ...$request->validated(),
        ]);

        return response()->json([
            'todo' => new TodoResource($todo->load(['item', 'user'])),
        ], 201);
    }

    public function show(Request $request, Todo $todo): JsonResponse
    {
        Gate::authorize('view', $todo);

        return response()->json([
            'todo' => new TodoResource($todo->load(['item', 'user'])),
        ]);
    }

    public function update(Request $request, Todo $todo): JsonResponse
    {
        Gate::authorize('update', $todo);

        $householdId = $request->user()->household_id;

        $validated = $request->validate([
            'item_id' => [
                'nullable',
                'integer',
                Rule::exists('items', 'id')->where('household_id', $householdId),
            ],
            'user_id' => [
                'nullable',
                'integer',
                Rule::exists('users', 'id')->where('household_id', $householdId),
            ],
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'priority' => ['sometimes', Rule::in(['low', 'medium', 'high'])],
            'due_date' => ['nullable', 'date'],
        ]);

        $todo->update($validated);

        return response()->json([
            'todo' => new TodoResource($todo->load(['item', 'user'])),
        ]);
    }

    public function destroy(Request $request, Todo $todo): JsonResponse
    {
        Gate::authorize('delete', $todo);

        $todo->delete();

        return response()->json([
            'message' => 'Todo deleted successfully',
        ]);
    }

    public function complete(Request $request, Todo $todo): JsonResponse
    {
        Gate::authorize('update', $todo);

        if ($todo->isCompleted()) {
            $todo->uncomplete();
            $message = 'Todo marked as incomplete';
        } else {
            $todo->complete();
            $message = 'Todo completed successfully';
        }

        return response()->json([
            'message' => $message,
            'todo' => new TodoResource($todo->fresh()->load(['item', 'user'])),
        ]);
    }
}
