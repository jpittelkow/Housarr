<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ItemResource;
use App\Http\Resources\LocationResource;
use App\Http\Resources\MaintenanceLogResource;
use App\Http\Resources\ReminderResource;
use App\Http\Resources\TodoResource;
use App\Http\Resources\VendorResource;
use App\Models\Item;
use App\Models\Location;
use App\Models\MaintenanceLog;
use App\Models\Reminder;
use App\Models\Todo;
use App\Models\Vendor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Controller for providing data endpoints that generated reports can use
 * to fetch fresh data. All endpoints are household-scoped.
 */
class ReportDataController extends Controller
{
    /**
     * Get all items with relationships.
     */
    public function items(Request $request): JsonResponse
    {
        $householdId = $request->user()->household_id;

        $items = Item::where('household_id', $householdId)
            ->with(['category', 'vendor', 'location', 'featuredImage'])
            ->orderBy('name')
            ->get();

        return response()->json([
            'items' => ItemResource::collection($items),
        ]);
    }

    /**
     * Get all reminders.
     */
    public function reminders(Request $request): JsonResponse
    {
        $householdId = $request->user()->household_id;

        $reminders = Reminder::where('household_id', $householdId)
            ->with(['item:id,name', 'user:id,name'])
            ->orderBy('due_date')
            ->get();

        return response()->json([
            'reminders' => ReminderResource::collection($reminders),
        ]);
    }

    /**
     * Get all todos.
     */
    public function todos(Request $request): JsonResponse
    {
        $householdId = $request->user()->household_id;

        $todos = Todo::where('household_id', $householdId)
            ->with(['item:id,name', 'user:id,name'])
            ->orderBy('due_date')
            ->get();

        return response()->json([
            'todos' => TodoResource::collection($todos),
        ]);
    }

    /**
     * Get all maintenance logs.
     */
    public function maintenanceLogs(Request $request): JsonResponse
    {
        $householdId = $request->user()->household_id;

        $logs = MaintenanceLog::whereHas('item', function ($query) use ($householdId) {
            $query->where('household_id', $householdId);
        })
            ->with(['item:id,name', 'vendor', 'parts'])
            ->orderBy('date', 'desc')
            ->get();

        return response()->json([
            'maintenance_logs' => MaintenanceLogResource::collection($logs),
        ]);
    }

    /**
     * Get all vendors.
     */
    public function vendors(Request $request): JsonResponse
    {
        $householdId = $request->user()->household_id;

        $vendors = Vendor::where('household_id', $householdId)
            ->orderBy('name')
            ->get();

        return response()->json([
            'vendors' => VendorResource::collection($vendors),
        ]);
    }

    /**
     * Get all locations.
     */
    public function locations(Request $request): JsonResponse
    {
        $householdId = $request->user()->household_id;

        $locations = Location::where('household_id', $householdId)
            ->with(['paintColors', 'featuredImage'])
            ->orderBy('name')
            ->get();

        return response()->json([
            'locations' => LocationResource::collection($locations),
        ]);
    }

    /**
     * Get dashboard summary data.
     */
    public function dashboard(Request $request): JsonResponse
    {
        $householdId = $request->user()->household_id;

        // Use the same logic as DashboardController
        $itemsCount = Item::where('household_id', $householdId)->count();
        
        $upcomingReminders = Reminder::where('household_id', $householdId)
            ->where('status', 'pending')
            ->where('due_date', '<=', now()->addDays(7))
            ->with('item:id,name')
            ->orderBy('due_date')
            ->limit(10)
            ->get();

        $overdueReminders = Reminder::where('household_id', $householdId)
            ->where('status', 'pending')
            ->where('due_date', '<', now())
            ->with('item:id,name')
            ->orderBy('due_date')
            ->limit(10)
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
            'incomplete_todos_count' => $incompleteTodosCount,
        ]);
    }
}
