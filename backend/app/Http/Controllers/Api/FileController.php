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
use Illuminate\Support\Facades\Http;
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
            'display_name' => ['sometimes', 'nullable', 'string', 'max:255'],
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
            'display_name' => $validated['display_name'] ?? null,
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

    /**
     * Upload a file from a URL (for product images from AI search).
     */
    public function storeFromUrl(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'url' => ['required', 'url'],
            'fileable_type' => ['required', 'string', Rule::in(array_keys($this->fileableTypes))],
            'fileable_id' => ['required', 'integer'],
            'is_featured' => ['sometimes', 'boolean'],
            'display_name' => ['sometimes', 'nullable', 'string', 'max:255'],
        ]);

        $fileableClass = $this->fileableTypes[$validated['fileable_type']];

        $fileable = match ($validated['fileable_type']) {
            'maintenance_log', 'part' => $fileableClass::with('item')->findOrFail($validated['fileable_id']),
            default => $fileableClass::findOrFail($validated['fileable_id']),
        };

        $householdId = $this->getHouseholdId($validated['fileable_type'], $fileable, $request);

        if (!$this->canUploadTo($validated['fileable_type'], $fileable, $request)) {
            abort(403, 'You do not have permission to upload files to this resource.');
        }

        // Download the image from the URL
        try {
            $response = Http::timeout(30)->withHeaders([
                'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            ])->get($validated['url']);

            if (!$response->successful()) {
                return response()->json([
                    'message' => 'Failed to download image from URL',
                    'error' => 'HTTP ' . $response->status(),
                ], 422);
            }

            $imageContent = $response->body();
            $contentType = $response->header('Content-Type');

            // Determine file extension from content type
            $extension = match (true) {
                str_contains($contentType, 'pdf') => 'pdf',
                str_contains($contentType, 'jpeg') || str_contains($contentType, 'jpg') => 'jpg',
                str_contains($contentType, 'png') => 'png',
                str_contains($contentType, 'webp') => 'webp',
                str_contains($contentType, 'gif') => 'gif',
                default => 'jpg', // Default to jpg
            };

            // Validate it's an image or PDF
            $allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
            if (!in_array($contentType, $allowedMimes)) {
                // Try to detect from content
                $finfo = new \finfo(FILEINFO_MIME_TYPE);
                $detectedMime = $finfo->buffer($imageContent);
                if (!in_array($detectedMime, $allowedMimes)) {
                    return response()->json([
                        'message' => 'URL does not point to a valid file (image or PDF)',
                        'error' => 'Invalid content type: ' . $contentType,
                    ], 422);
                }
                $contentType = $detectedMime;
            }

            // Check file size (max 50MB for PDFs, 10MB for images)
            $size = strlen($imageContent);
            $maxSize = str_contains($contentType, 'pdf') ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
            if ($size > $maxSize) {
                return response()->json([
                    'message' => 'File is too large (max ' . ($maxSize / 1024 / 1024) . 'MB)',
                ], 422);
            }

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to download image from URL',
                'error' => $e->getMessage(),
            ], 422);
        }

        $isFeatured = $validated['is_featured'] ?? false;

        // If setting as featured, unset any existing featured image for this entity
        if ($isFeatured) {
            File::where('fileable_type', $fileableClass)
                ->where('fileable_id', $validated['fileable_id'])
                ->where('is_featured', true)
                ->update(['is_featured' => false]);
        }

        $disk = StorageService::getDiskForHousehold($householdId);
        $diskName = StorageService::getDiskName($householdId);

        $storagePath = "households/{$householdId}/{$validated['fileable_type']}/{$validated['fileable_id']}";
        
        // Try to get filename from URL
        $urlPath = parse_url($validated['url'], PHP_URL_PATH);
        $urlFilename = $urlPath ? basename($urlPath) : null;
        $originalName = ($urlFilename && str_contains($urlFilename, '.')) ? $urlFilename : 'document.' . $extension;
        
        $filename = time() . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '_', $originalName);
        $path = $storagePath . '/' . $filename;

        $disk->put($path, $imageContent);

        $file = File::create([
            'household_id' => $householdId,
            'fileable_type' => $fileableClass,
            'fileable_id' => $validated['fileable_id'],
            'disk' => $diskName,
            'path' => $path,
            'original_name' => $originalName,
            'display_name' => $validated['display_name'] ?? null,
            'mime_type' => $contentType,
            'size' => $size,
            'is_featured' => $isFeatured,
        ]);

        return response()->json([
            'file' => new FileResource($file),
        ], 201);
    }

    /**
     * Update a file's display name.
     */
    public function update(Request $request, File $file): JsonResponse
    {
        if ($file->household_id !== $request->user()->household_id) {
            abort(403);
        }

        $validated = $request->validate([
            'display_name' => ['sometimes', 'nullable', 'string', 'max:255'],
        ]);

        $file->update($validated);

        return response()->json([
            'file' => new FileResource($file),
        ]);
    }
}
