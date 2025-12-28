<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ItemResource;
use App\Http\Resources\ReminderResource;
use App\Http\Resources\TodoResource;
use App\Models\Item;
use App\Models\Reminder;
use App\Models\Todo;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $householdId = $request->user()->household_id;
        $now = Carbon::now();
        $upcomingDays = 7;

        // Get counts and data in optimized queries
        $itemsCount = Item::where('household_id', $householdId)->count();

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
            ->get();

        $incompleteTodos = Todo::where('household_id', $householdId)
            ->whereNull('completed_at')
            ->with('item:id,name')
            ->orderByRaw("CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END")
            ->orderBy('due_date')
            ->limit(5)
            ->get();

        $incompleteTodosCount = Todo::where('household_id', $householdId)
            ->whereNull('completed_at')
            ->count();

        return response()->json([
            'items_count' => $itemsCount,
            'upcoming_reminders' => ReminderResource::collection($upcomingReminders),
            'upcoming_reminders_count' => $upcomingReminders->count(),
            'overdue_reminders' => ReminderResource::collection($overdueReminders),
            'overdue_reminders_count' => $overdueReminders->count(),
            'incomplete_todos' => TodoResource::collection($incompleteTodos),
            'incomplete_todos_count' => $incompleteTodosCount,
        ]);
    }
}
