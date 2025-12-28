<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryResource;
use App\Http\Resources\LocationResource;
use App\Http\Resources\ReminderResource;
use App\Http\Resources\TodoResource;
use App\Models\Category;
use App\Models\Item;
use App\Models\Location;
use App\Models\Reminder;
use App\Models\Todo;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $householdId = $request->user()->household_id;
        $now = Carbon::now();
        $upcomingDays = 7;

        // Get all counts in a single query using raw SQL for efficiency
        $counts = DB::selectOne("
            SELECT
                (SELECT COUNT(*) FROM items WHERE household_id = ?) as items_count,
                (SELECT COUNT(*) FROM todos WHERE household_id = ? AND completed_at IS NULL) as incomplete_todos_count,
                (SELECT COUNT(*) FROM reminders WHERE household_id = ? AND status = 'pending' AND due_date < ?) as overdue_reminders_count
        ", [$householdId, $householdId, $householdId, $now]);

        $upcomingReminders = Reminder::where('household_id', $householdId)
            ->where('status', 'pending')
            ->where('due_date', '<=', $now->copy()->addDays($upcomingDays))
            ->with('item:id,name')
            ->orderBy('due_date')
            ->limit(5)
            ->get();

        $overdueReminders = Reminder::where('household_id', $householdId)
            ->where('status', 'pending')
            ->where('due_date', '<', $now)
            ->with('item:id,name')
            ->orderBy('due_date')
            ->limit(10)
            ->get();

        $incompleteTodos = Todo::where('household_id', $householdId)
            ->whereNull('completed_at')
            ->with('item:id,name')
            ->orderByRaw("CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END")
            ->orderBy('due_date')
            ->limit(5)
            ->get();

        return response()->json([
            'items_count' => $counts->items_count,
            'upcoming_reminders' => ReminderResource::collection($upcomingReminders),
            'upcoming_reminders_count' => $upcomingReminders->count(),
            'overdue_reminders' => ReminderResource::collection($overdueReminders),
            'overdue_reminders_count' => $counts->overdue_reminders_count,
            'incomplete_todos' => TodoResource::collection($incompleteTodos),
            'incomplete_todos_count' => $counts->incomplete_todos_count,
        ]);
    }

    /**
     * Get prefetch data for cache warming (categories + locations in one request).
     * This reduces initial load time by combining two common queries into one.
     */
    public function prefetch(Request $request): JsonResponse
    {
        $householdId = $request->user()->household_id;

        // Fetch categories and locations in parallel using a single response
        $categories = Category::forHousehold($householdId)
            ->orderBy('name')
            ->get();

        $locations = Location::where('household_id', $householdId)
            ->withCount('items')
            ->with('featuredImage')
            ->orderBy('name')
            ->get();

        return response()->json([
            'categories' => CategoryResource::collection($categories),
            'locations' => LocationResource::collection($locations),
        ]);
    }
}
