<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\FileResource;
use App\Models\File;
use App\Models\Household;
use App\Models\Item;
use App\Models\Location;
use App\Models\MaintenanceLog;
use App\Models\Part;
use App\Models\User;
use App\Models\Vendor;
use App\Services\StorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class FileController extends Controller
{
    /**
     * Supported fileable types and their model classes.
     */
    protected array $fileableTypes = [
        'item' => Item::class,
        'maintenance_log' => MaintenanceLog::class,
        'part' => Part::class,
        'vendor' => Vendor::class,
        'location' => Location::class,
        'household' => Household::class,
        'user' => User::class,
    ];

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'file' => ['required', 'file', 'max:51200', 'mimes:pdf,jpg,jpeg,png,gif,webp'],
            'fileable_type' => ['required', 'string', Rule::in(array_keys($this->fileableTypes))],
            'fileable_id' => ['required', 'integer'],
            'is_featured' => ['sometimes', 'boolean'],
        ]);

        $fileableClass = $this->fileableTypes[$validated['fileable_type']];

        // Eager load 'item' for types that need it to avoid N+1
        $fileable = match ($validated['fileable_type']) {
            'maintenance_log', 'part' => $fileableClass::with('item')->findOrFail($validated['fileable_id']),
            default => $fileableClass::findOrFail($validated['fileable_id']),
        };

        // Get household ID based on fileable type
        $householdId = $this->getHouseholdId($validated['fileable_type'], $fileable, $request);

        // Check permissions
        if (!$this->canUploadTo($validated['fileable_type'], $fileable, $request)) {
            abort(403, 'You do not have permission to upload files to this resource.');
        }

        $uploadedFile = $request->file('file');
        $isFeatured = $validated['is_featured'] ?? false;

        // If setting as featured, unset any existing featured image for this entity
        if ($isFeatured) {
            File::where('fileable_type', $fileableClass)
                ->where('fileable_id', $validated['fileable_id'])
                ->where('is_featured', true)
                ->update(['is_featured' => false]);
        }

        // Use StorageService to get the appropriate disk for this household
        $disk = StorageService::getDiskForHousehold($householdId);
        $diskName = StorageService::getDiskName($householdId);

        $storagePath = "households/{$householdId}/{$validated['fileable_type']}/{$validated['fileable_id']}";
        $filename = time() . '_' . $uploadedFile->getClientOriginalName();
        $path = $storagePath . '/' . $filename;

        $disk->put($path, file_get_contents($uploadedFile->getRealPath()));

        $file = File::create([
            'household_id' => $householdId,
            'fileable_type' => $fileableClass,
            'fileable_id' => $validated['fileable_id'],
            'disk' => $diskName,
            'path' => $path,
            'original_name' => $uploadedFile->getClientOriginalName(),
            'mime_type' => $uploadedFile->getMimeType(),
            'size' => $uploadedFile->getSize(),
            'is_featured' => $isFeatured,
        ]);

        return response()->json([
            'file' => new FileResource($file),
        ], 201);
    }

    /**
     * Set a file as the featured image.
     */
    public function setFeatured(Request $request, File $file): JsonResponse
    {
        if ($file->household_id !== $request->user()->household_id) {
            abort(403);
        }

        // Unset any existing featured image for this entity
        File::where('fileable_type', $file->fileable_type)
            ->where('fileable_id', $file->fileable_id)
            ->where('is_featured', true)
            ->update(['is_featured' => false]);

        $file->update(['is_featured' => true]);

        return response()->json([
            'file' => new FileResource($file),
        ]);
    }

    /**
     * Get household ID for different fileable types.
     */
    protected function getHouseholdId(string $type, $fileable, Request $request): int
    {
        return match ($type) {
            'item', 'vendor', 'location', 'household' => $fileable->household_id ?? $fileable->id,
            'maintenance_log' => $fileable->item->household_id,
            'part' => $fileable->item->household_id,
            'user' => $request->user()->household_id,
            default => $request->user()->household_id,
        };
    }

    /**
     * Check if user can upload to the given resource.
     */
    protected function canUploadTo(string $type, $fileable, Request $request): bool
    {
        $userHouseholdId = $request->user()->household_id;

        return match ($type) {
            'item', 'vendor', 'location' => $fileable->household_id === $userHouseholdId,
            'household' => $fileable->id === $userHouseholdId,
            'maintenance_log' => $fileable->item->household_id === $userHouseholdId,
            'part' => $fileable->item->household_id === $userHouseholdId,
            'user' => $fileable->id === $request->user()->id, // Users can only upload to their own profile
            default => false,
        };
    }

    public function destroy(Request $request, File $file): JsonResponse
    {
        if ($file->household_id !== $request->user()->household_id) {
            abort(403);
        }

        $file->deleteFile();
        $file->delete();

        return response()->json([
            'message' => 'File deleted successfully',
        ]);
    }
}
