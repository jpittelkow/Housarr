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
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use ZipArchive;

class BackupController extends Controller
{
    /**
     * Export household data as a ZIP file containing JSON manifest and all files.
     */
    public function export(Request $request): BinaryFileResponse
    {
        $user = $request->user();

        if (!$user->isAdmin()) {
            abort(403, 'Only admins can export data');
        }

        $householdId = $user->household_id;
        $timestamp = Carbon::now()->format('Y-m-d-His');
        $zipFilename = "housarr-backup-{$timestamp}.zip";
        $tempPath = storage_path("app/temp/{$zipFilename}");

        // Ensure temp directory exists
        if (!is_dir(storage_path('app/temp'))) {
            mkdir(storage_path('app/temp'), 0755, true);
        }

        $zip = new ZipArchive();
        if ($zip->open($tempPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            abort(500, 'Could not create backup file');
        }

        // Build the manifest data
        $manifest = [
            'version' => '2.0',
            'exported_at' => Carbon::now()->toIso8601String(),
            'household' => Household::find($householdId),
            'users' => User::where('household_id', $householdId)
                ->get()
                ->map(fn($u) => $u->makeVisible(['password'])->toArray())
                ->toArray(),
            'categories' => Category::where('household_id', $householdId)->get()->toArray(),
            'locations' => Location::where('household_id', $householdId)->get()->toArray(),
            'vendors' => Vendor::where('household_id', $householdId)->get()->toArray(),
            'items' => Item::where('household_id', $householdId)->get()->toArray(),
            'parts' => Part::select('parts.*')
                ->join('items', 'parts.item_id', '=', 'items.id')
                ->where('items.household_id', $householdId)
                ->get()
                ->toArray(),
            'maintenance_logs' => MaintenanceLog::select('maintenance_logs.*')
                ->join('items', 'maintenance_logs.item_id', '=', 'items.id')
                ->where('items.household_id', $householdId)
                ->get()
                ->toArray(),
            'reminders' => Reminder::where('household_id', $householdId)->get()->toArray(),
            'todos' => Todo::where('household_id', $householdId)->get()->toArray(),
            'notifications' => Notification::select('notifications.*')
                ->join('users', 'notifications.user_id', '=', 'users.id')
                ->where('users.household_id', $householdId)
                ->get()
                ->toArray(),
            'files' => [],
        ];

        // Export files and add to ZIP
        $files = File::where('household_id', $householdId)->get();
        $fileIndex = 0;
        
        foreach ($files as $file) {
            $fileData = $file->toArray();
            
            // Try to get the actual file content
            try {
                $disk = Storage::disk($file->disk);
                if ($disk->exists($file->path)) {
                    $content = $disk->get($file->path);
                    
                    // Store file in ZIP with a predictable path
                    $zipPath = "files/{$fileIndex}_" . basename($file->path);
                    $zip->addFromString($zipPath, $content);
                    
                    // Store the zip path reference in the manifest
                    $fileData['backup_path'] = $zipPath;
                    $fileIndex++;
                }
            } catch (\Exception $e) {
                // Skip files that can't be read
                $fileData['backup_path'] = null;
                $fileData['backup_error'] = $e->getMessage();
            }
            
            $manifest['files'][] = $fileData;
        }

        // Add manifest to ZIP
        $zip->addFromString('manifest.json', json_encode($manifest, JSON_PRETTY_PRINT));
        
        $zip->close();

        // Return the ZIP file as download and delete after sending
        return response()->download($tempPath, $zipFilename, [
            'Content-Type' => 'application/zip',
        ])->deleteFileAfterSend(true);
    }

    /**
     * Import household data from a ZIP backup file.
     */
    public function import(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Only admins can import data'], 403);
        }

        $request->validate([
            'backup' => ['required', 'file', 'mimetypes:application/zip,application/x-zip-compressed,application/json,text/plain'],
        ]);

        $uploadedFile = $request->file('backup');
        $mimeType = $uploadedFile->getMimeType();
        
        // Handle legacy JSON-only backups
        if (in_array($mimeType, ['application/json', 'text/plain']) || 
            str_ends_with($uploadedFile->getClientOriginalName(), '.json')) {
            return $this->importLegacyJson($request);
        }

        // Handle ZIP backups
        $tempPath = $uploadedFile->getRealPath();
        
        $zip = new ZipArchive();
        if ($zip->open($tempPath) !== true) {
            return response()->json(['message' => 'Could not open backup file'], 422);
        }

        // Read manifest
        $manifestContent = $zip->getFromName('manifest.json');
        if ($manifestContent === false) {
            $zip->close();
            return response()->json(['message' => 'Invalid backup file: missing manifest.json'], 422);
        }

        $data = json_decode($manifestContent, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            $zip->close();
            return response()->json(['message' => 'Invalid manifest.json'], 422);
        }

        if (!isset($data['version']) || !isset($data['household'])) {
            $zip->close();
            return response()->json(['message' => 'Invalid backup file format'], 422);
        }

        $householdId = $user->household_id;

        DB::beginTransaction();

        try {
            // Note: We don't delete files from storage during import.
            // The import will overwrite files at the same paths, and orphaned files
            // can be cleaned up separately. This prevents data loss if import fails.

            // Clear existing data (in reverse order of dependencies)
            Notification::whereHas('user', fn($q) => $q->where('household_id', $householdId))->delete();
            File::where('household_id', $householdId)->delete();
            Todo::where('household_id', $householdId)->delete();
            Reminder::where('household_id', $householdId)->delete();
            MaintenanceLog::whereHas('item', fn($q) => $q->where('household_id', $householdId))->delete();
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
            $categoryIdMap = [];
            $locationIdMap = [];
            $vendorIdMap = [];
            $itemIdMap = [];
            $partIdMap = [];
            $maintenanceLogIdMap = [];

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
                $oldId = $part['id'] ?? null;
                unset($part['id'], $part['created_at'], $part['updated_at']);
                if (isset($part['item_id']) && isset($itemIdMap[$part['item_id']])) {
                    $part['item_id'] = $itemIdMap[$part['item_id']];
                    $new = Part::create($part);
                    if ($oldId) {
                        $partIdMap[$oldId] = $new->id;
                    }
                }
            }

            // Import maintenance logs
            foreach ($data['maintenance_logs'] ?? [] as $log) {
                $oldId = $log['id'] ?? null;
                unset($log['id'], $log['created_at'], $log['updated_at'], $log['household_id']);
                if (isset($log['item_id']) && isset($itemIdMap[$log['item_id']])) {
                    $log['item_id'] = $itemIdMap[$log['item_id']];
                    if (isset($log['vendor_id']) && isset($vendorIdMap[$log['vendor_id']])) {
                        $log['vendor_id'] = $vendorIdMap[$log['vendor_id']];
                    } else {
                        $log['vendor_id'] = null;
                    }
                    $new = MaintenanceLog::create($log);
                    if ($oldId) {
                        $maintenanceLogIdMap[$oldId] = $new->id;
                    }
                }
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
                $todo['user_id'] = $user->id;
                Todo::create($todo);
            }

            // Import files with actual content from ZIP
            $filesRestored = 0;
            
            foreach ($data['files'] ?? [] as $fileData) {
                $backupPath = $fileData['backup_path'] ?? null;
                unset($fileData['id'], $fileData['created_at'], $fileData['updated_at'], 
                      $fileData['url'], $fileData['backup_path'], $fileData['backup_error']);
                
                $fileData['household_id'] = $householdId;
                
                // Map fileable_id to new IDs based on fileable_type
                // Handle both full class names (App\Models\Item) and class constants
                $fileableType = $fileData['fileable_type'];
                $oldFileableId = $fileData['fileable_id'] ?? null;
                
                // Normalize fileable_type to handle both formats
                $normalizedType = $fileableType;
                if (str_contains($fileableType, '\\')) {
                    // Full class name - extract model name
                    $normalizedType = class_basename($fileableType);
                }
                
                // Map based on normalized type or direct class comparison
                $mapped = false;
                if (($normalizedType === 'Item' || $fileableType === Item::class) && isset($itemIdMap[$oldFileableId])) {
                    $fileData['fileable_id'] = $itemIdMap[$oldFileableId];
                    $mapped = true;
                } elseif (($normalizedType === 'Location' || $fileableType === Location::class) && isset($locationIdMap[$oldFileableId])) {
                    $fileData['fileable_id'] = $locationIdMap[$oldFileableId];
                    $mapped = true;
                } elseif (($normalizedType === 'Part' || $fileableType === Part::class) && isset($partIdMap[$oldFileableId])) {
                    $fileData['fileable_id'] = $partIdMap[$oldFileableId];
                    $mapped = true;
                } elseif (($normalizedType === 'MaintenanceLog' || $fileableType === MaintenanceLog::class) && isset($maintenanceLogIdMap[$oldFileableId])) {
                    $fileData['fileable_id'] = $maintenanceLogIdMap[$oldFileableId];
                    $mapped = true;
                } elseif (($normalizedType === 'Vendor' || $fileableType === Vendor::class) && isset($vendorIdMap[$oldFileableId])) {
                    $fileData['fileable_id'] = $vendorIdMap[$oldFileableId];
                    $mapped = true;
                } elseif ($normalizedType === 'Household' || $fileableType === Household::class) {
                    // Household files map to current household
                    $fileData['fileable_id'] = $householdId;
                    $mapped = true;
                } elseif ($normalizedType === 'User' || $fileableType === User::class) {
                    // User files map to current user
                    $fileData['fileable_id'] = $user->id;
                    $mapped = true;
                }
                
                if (!$mapped) {
                    // Unknown fileable type or ID not found, skip with logging
                    Log::warning("Skipping file import: fileable_type={$fileableType}, old_id={$oldFileableId}");
                    continue;
                }

                // Restore file content from ZIP if available
                if ($backupPath) {
                    $fileContent = $zip->getFromName($backupPath);
                    if ($fileContent !== false) {
                        // Preserve the original path structure, just update household ID
                        // Original path format: households/{oldId}/item/{itemId}/file.jpg
                        $originalPath = $fileData['path'];
                        
                        // Replace the old household ID with new one in the path
                        if (preg_match('#^households/\d+/(.+)$#', $originalPath, $matches)) {
                            $newPath = "households/{$householdId}/{$matches[1]}";
                        } else {
                            // Fallback: use original path
                            $newPath = $originalPath;
                        }
                        
                        // Ensure directory exists before storing file
                        $disk = Storage::disk($fileData['disk']);
                        $directory = dirname($newPath);
                        if (!$disk->exists($directory)) {
                            $disk->makeDirectory($directory, 0755, true);
                        }
                        
                        // Store file
                        $disk->put($newPath, $fileContent);
                        $fileData['path'] = $newPath;
                        $filesRestored++;
                    }
                }

                File::create($fileData);
            }

            DB::commit();
            $zip->close();

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
                    'files' => count($data['files'] ?? []),
                    'files_restored' => $filesRestored,
                ],
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            $zip->close();

            return response()->json([
                'message' => 'Failed to restore backup: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Handle legacy JSON-only backups (version 1.0).
     */
    protected function importLegacyJson(Request $request): JsonResponse
    {
        $user = $request->user();
        $householdId = $user->household_id;

        $file = $request->file('backup');
        $content = file_get_contents($file->getRealPath());
        $data = json_decode($content, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            return response()->json(['message' => 'Invalid JSON file'], 422);
        }

        if (!isset($data['version']) || !isset($data['household'])) {
            return response()->json(['message' => 'Invalid backup file format'], 422);
        }

        DB::beginTransaction();

        try {
            // Clear existing data
            Notification::whereHas('user', fn($q) => $q->where('household_id', $householdId))->delete();
            File::where('household_id', $householdId)->delete();
            Todo::where('household_id', $householdId)->delete();
            Reminder::where('household_id', $householdId)->delete();
            MaintenanceLog::whereHas('item', fn($q) => $q->where('household_id', $householdId))->delete();
            Part::whereHas('item', fn($q) => $q->where('household_id', $householdId))->delete();
            Item::where('household_id', $householdId)->delete();
            Vendor::where('household_id', $householdId)->delete();
            Location::where('household_id', $householdId)->delete();
            Category::where('household_id', $householdId)->delete();

            if (isset($data['household']['name'])) {
                Household::where('id', $householdId)->update(['name' => $data['household']['name']]);
            }

            $categoryIdMap = [];
            $locationIdMap = [];
            $vendorIdMap = [];
            $itemIdMap = [];

            foreach ($data['categories'] ?? [] as $category) {
                $oldId = $category['id'];
                unset($category['id'], $category['created_at'], $category['updated_at']);
                $category['household_id'] = $householdId;
                $new = Category::create($category);
                $categoryIdMap[$oldId] = $new->id;
            }

            foreach ($data['locations'] ?? [] as $location) {
                $oldId = $location['id'];
                unset($location['id'], $location['created_at'], $location['updated_at']);
                $location['household_id'] = $householdId;
                $new = Location::create($location);
                $locationIdMap[$oldId] = $new->id;
            }

            foreach ($data['vendors'] ?? [] as $vendor) {
                $oldId = $vendor['id'];
                unset($vendor['id'], $vendor['created_at'], $vendor['updated_at']);
                $vendor['household_id'] = $householdId;
                $new = Vendor::create($vendor);
                $vendorIdMap[$oldId] = $new->id;
            }

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

            foreach ($data['parts'] ?? [] as $part) {
                unset($part['id'], $part['created_at'], $part['updated_at']);
                if (isset($part['item_id']) && isset($itemIdMap[$part['item_id']])) {
                    $part['item_id'] = $itemIdMap[$part['item_id']];
                    Part::create($part);
                }
            }

            foreach ($data['maintenance_logs'] ?? [] as $log) {
                unset($log['id'], $log['created_at'], $log['updated_at'], $log['household_id']);
                if (isset($log['item_id']) && isset($itemIdMap[$log['item_id']])) {
                    $log['item_id'] = $itemIdMap[$log['item_id']];
                    if (isset($log['vendor_id']) && isset($vendorIdMap[$log['vendor_id']])) {
                        $log['vendor_id'] = $vendorIdMap[$log['vendor_id']];
                    } else {
                        $log['vendor_id'] = null;
                    }
                    MaintenanceLog::create($log);
                }
            }

            foreach ($data['reminders'] ?? [] as $reminder) {
                unset($reminder['id'], $reminder['created_at'], $reminder['updated_at']);
                $reminder['household_id'] = $householdId;
                if (isset($reminder['item_id']) && isset($itemIdMap[$reminder['item_id']])) {
                    $reminder['item_id'] = $itemIdMap[$reminder['item_id']];
                }
                Reminder::create($reminder);
            }

            foreach ($data['todos'] ?? [] as $todo) {
                unset($todo['id'], $todo['created_at'], $todo['updated_at']);
                $todo['household_id'] = $householdId;
                if (isset($todo['item_id']) && isset($itemIdMap[$todo['item_id']])) {
                    $todo['item_id'] = $itemIdMap[$todo['item_id']];
                }
                $todo['user_id'] = $user->id;
                Todo::create($todo);
            }

            DB::commit();

            return response()->json([
                'message' => 'Legacy backup restored successfully (without files)',
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
