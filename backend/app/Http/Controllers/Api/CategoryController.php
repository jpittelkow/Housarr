<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Category::forHousehold($request->user()->household_id);

        // Filter by type if provided
        if ($request->has('type') && in_array($request->input('type'), ['item', 'vendor'])) {
            $query->ofType($request->input('type'));
        }

        $categories = $query->orderBy('name')->get();

        return response()->json([
            'categories' => CategoryResource::collection($categories),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => ['required', 'string', 'in:item,vendor'],
            'name' => ['required', 'string', 'max:255'],
            'icon' => ['nullable', 'string', 'max:50'],
            'color' => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
        ]);

        $category = Category::create([
            'household_id' => $request->user()->household_id,
            ...$validated,
        ]);

        return response()->json([
            'category' => new CategoryResource($category),
        ], 201);
    }

    public function show(Category $category): JsonResponse
    {
        if ($category->household_id !== null && $category->household_id !== auth()->user()->household_id) {
            abort(404);
        }

        return response()->json([
            'category' => new CategoryResource($category),
        ]);
    }

    public function update(Request $request, Category $category): JsonResponse
    {
        if ($category->household_id !== null && $category->household_id !== $request->user()->household_id) {
            abort(403, 'You do not have permission to update this category.');
        }

        if ($category->household_id === null) {
            abort(403, 'System categories cannot be modified.');
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'icon' => ['nullable', 'string', 'max:50'],
            'color' => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
        ]);

        $category->update($validated);

        return response()->json([
            'category' => new CategoryResource($category),
        ]);
    }

    public function destroy(Request $request, Category $category): JsonResponse
    {
        if ($category->household_id === null) {
            return response()->json([
                'message' => 'System categories cannot be deleted.',
            ], 403);
        }

        if ($category->household_id !== $request->user()->household_id) {
            abort(403);
        }

        $category->delete();

        return response()->json([
            'message' => 'Category deleted successfully',
        ]);
    }
}
