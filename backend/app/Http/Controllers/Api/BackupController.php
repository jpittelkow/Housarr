<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\File;
use App\Models\Household;
use App\Models\Item;
use App\Models\Location;
use App\Models\MaintenanceLog;
use App\Models\Notification;
use App\Models\Part;
use App\Models\Reminder;
use App\Models\Todo;
use App\Models\User;
use App\Models\Vendor;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Symfony\Component\HttpFoundation\StreamedResponse;

class BackupController extends Controller
{
    /**
     * Export household data with memory-efficient streaming.
     */
    public function export(Request $request): StreamedResponse
    {
        $user = $request->user();

        if (!$user->isAdmin()) {
            abort(403, 'Only admins can export data');
        }

        $householdId = $user->household_id;
        $filename = 'housarr-backup-' . Carbon::now()->format('Y-m-d-His') . '.json';

        return response()->stream(function () use ($householdId) {
            // Start JSON object
            echo '{';
            echo '"version":"1.0",';
            echo '"exported_at":"' . Carbon::now()->toIso8601String() . '",';

            // Export household (single record)
            echo '"household":' . json_encode(Household::find($householdId)) . ',';

            // Export users with password visible
            echo '"users":';
            $this->streamCollection(
                User::where('household_id', $householdId),
                fn($u) => $u->makeVisible(['password'])->toArray()
            );
            echo ',';

            // Export categories
            echo '"categories":';
            $this->streamCollection(Category::where('household_id', $householdId));
            echo ',';

            // Export locations
            echo '"locations":';
            $this->streamCollection(Location::where('household_id', $householdId));
            echo ',';

            // Export vendors
            echo '"vendors":';
            $this->streamCollection(Vendor::where('household_id', $householdId));
            echo ',';

            // Export items
            echo '"items":';
            $this->streamCollection(Item::where('household_id', $householdId));
            echo ',';

            // Export parts (use join instead of whereHas for efficiency)
            echo '"parts":';
            $this->streamCollection(
                Part::select('parts.*')
                    ->join('items', 'parts.item_id', '=', 'items.id')
                    ->where('items.household_id', $householdId)
            );
            echo ',';

            // Export maintenance logs
            echo '"maintenance_logs":';
            $this->streamCollection(MaintenanceLog::where('household_id', $householdId));
            echo ',';

            // Export reminders
            echo '"reminders":';
            $this->streamCollection(Reminder::where('household_id', $householdId));
            echo ',';

            // Export todos
            echo '"todos":';
            $this->streamCollection(Todo::where('household_id', $householdId));
            echo ',';

            // Export notifications (use join instead of whereHas)
            echo '"notifications":';
            $this->streamCollection(
                Notification::select('notifications.*')
                    ->join('users', 'notifications.user_id', '=', 'users.id')
                    ->where('users.household_id', $householdId)
            );
            echo ',';

            // Export files
            echo '"files":';
            $this->streamCollection(File::where('household_id', $householdId));

            // End JSON object
            echo '}';
        }, 200, [
            'Content-Type' => 'application/json',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    /**
     * Stream a collection in chunks to avoid memory issues.
     */
    protected function streamCollection($query, ?callable $transform = null): void
    {
        echo '[';
        $first = true;

        $query->orderBy($query->getModel()->getKeyName())
            ->chunk(100, function ($records) use (&$first, $transform) {
                foreach ($records as $record) {
                    if (!$first) {
                        echo ',';
                    }
                    $first = false;

                    $data = $transform ? $transform($record) : $record->toArray();
                    echo json_encode($data);

                    // Flush output buffer periodically
                    if (ob_get_level() > 0) {
                        ob_flush();
                    }
                    flush();
                }
            });

        echo ']';
    }

    public function import(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Only admins can import data'], 403);
        }

        $request->validate([
            'backup' => ['required', 'file', 'mimetypes:application/json,text/plain'],
        ]);

        $file = $request->file('backup');
        $content = file_get_contents($file->getRealPath());
        $data = json_decode($content, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            return response()->json(['message' => 'Invalid JSON file'], 422);
        }

        if (!isset($data['version']) || !isset($data['household'])) {
            return response()->json(['message' => 'Invalid backup file format'], 422);
        }

        $householdId = $user->household_id;

        DB::beginTransaction();

        try {
            // Clear existing data (in reverse order of dependencies)
            Notification::whereHas('user', fn($q) => $q->where('household_id', $householdId))->delete();
            File::where('household_id', $householdId)->delete();
            Todo::where('household_id', $householdId)->delete();
            Reminder::where('household_id', $householdId)->delete();
            MaintenanceLog::where('household_id', $householdId)->delete();
            Part::whereHas('item', fn($q) => $q->where('household_id', $householdId))->delete();
            Item::where('household_id', $householdId)->delete();
            Vendor::where('household_id', $householdId)->delete();
            Location::where('household_id', $householdId)->delete();
            Category::where('household_id', $householdId)->delete();

            // Update household
            if (isset($data['household']['name'])) {
                Household::where('id', $householdId)->update(['name' => $data['household']['name']]);
            }

            // Build ID mappings for relationships
            $userIdMap = [];
            $categoryIdMap = [];
            $locationIdMap = [];
            $vendorIdMap = [];
            $itemIdMap = [];

            // Import categories
            foreach ($data['categories'] ?? [] as $category) {
                $oldId = $category['id'];
                unset($category['id'], $category['created_at'], $category['updated_at']);
                $category['household_id'] = $householdId;
                $new = Category::create($category);
                $categoryIdMap[$oldId] = $new->id;
            }

            // Import locations
            foreach ($data['locations'] ?? [] as $location) {
                $oldId = $location['id'];
                unset($location['id'], $location['created_at'], $location['updated_at']);
                $location['household_id'] = $householdId;
                $new = Location::create($location);
                $locationIdMap[$oldId] = $new->id;
            }

            // Import vendors
            foreach ($data['vendors'] ?? [] as $vendor) {
                $oldId = $vendor['id'];
                unset($vendor['id'], $vendor['created_at'], $vendor['updated_at']);
                $vendor['household_id'] = $householdId;
                $new = Vendor::create($vendor);
                $vendorIdMap[$oldId] = $new->id;
            }

            // Import items
            foreach ($data['items'] ?? [] as $item) {
                $oldId = $item['id'];
                unset($item['id'], $item['created_at'], $item['updated_at']);
                $item['household_id'] = $householdId;
                if (isset($item['category_id']) && isset($categoryIdMap[$item['category_id']])) {
                    $item['category_id'] = $categoryIdMap[$item['category_id']];
                }
                if (isset($item['location_id']) && isset($locationIdMap[$item['location_id']])) {
                    $item['location_id'] = $locationIdMap[$item['location_id']];
                }
                if (isset($item['vendor_id']) && isset($vendorIdMap[$item['vendor_id']])) {
                    $item['vendor_id'] = $vendorIdMap[$item['vendor_id']];
                }
                $new = Item::create($item);
                $itemIdMap[$oldId] = $new->id;
            }

            // Import parts
            foreach ($data['parts'] ?? [] as $part) {
                unset($part['id'], $part['created_at'], $part['updated_at']);
                if (isset($part['item_id']) && isset($itemIdMap[$part['item_id']])) {
                    $part['item_id'] = $itemIdMap[$part['item_id']];
                    Part::create($part);
                }
            }

            // Import maintenance logs
            foreach ($data['maintenance_logs'] ?? [] as $log) {
                unset($log['id'], $log['created_at'], $log['updated_at']);
                $log['household_id'] = $householdId;
                if (isset($log['item_id']) && isset($itemIdMap[$log['item_id']])) {
                    $log['item_id'] = $itemIdMap[$log['item_id']];
                }
                MaintenanceLog::create($log);
            }

            // Import reminders
            foreach ($data['reminders'] ?? [] as $reminder) {
                unset($reminder['id'], $reminder['created_at'], $reminder['updated_at']);
                $reminder['household_id'] = $householdId;
                if (isset($reminder['item_id']) && isset($itemIdMap[$reminder['item_id']])) {
                    $reminder['item_id'] = $itemIdMap[$reminder['item_id']];
                }
                Reminder::create($reminder);
            }

            // Import todos
            foreach ($data['todos'] ?? [] as $todo) {
                unset($todo['id'], $todo['created_at'], $todo['updated_at']);
                $todo['household_id'] = $householdId;
                if (isset($todo['item_id']) && isset($itemIdMap[$todo['item_id']])) {
                    $todo['item_id'] = $itemIdMap[$todo['item_id']];
                }
                // Reset user_id to current user since users may differ
                $todo['user_id'] = $user->id;
                Todo::create($todo);
            }

            DB::commit();

            return response()->json([
                'message' => 'Backup restored successfully',
                'stats' => [
                    'categories' => count($data['categories'] ?? []),
                    'locations' => count($data['locations'] ?? []),
                    'vendors' => count($data['vendors'] ?? []),
                    'items' => count($data['items'] ?? []),
                    'parts' => count($data['parts'] ?? []),
                    'maintenance_logs' => count($data['maintenance_logs'] ?? []),
                    'reminders' => count($data['reminders'] ?? []),
                    'todos' => count($data['todos'] ?? []),
                ],
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'Failed to restore backup: ' . $e->getMessage(),
            ], 500);
        }
    }
}
