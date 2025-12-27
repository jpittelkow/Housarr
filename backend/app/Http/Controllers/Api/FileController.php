<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\FileResource;
use App\Models\File;
use App\Models\Item;
use App\Models\MaintenanceLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class FileController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'file' => ['required', 'file', 'max:51200', 'mimes:pdf,jpg,jpeg,png,gif,webp'],
            'fileable_type' => ['required', 'string', Rule::in(['item', 'maintenance_log'])],
            'fileable_id' => ['required', 'integer'],
        ]);

        $fileableClass = match ($validated['fileable_type']) {
            'item' => Item::class,
            'maintenance_log' => MaintenanceLog::class,
        };

        $fileable = $fileableClass::findOrFail($validated['fileable_id']);

        $householdId = match ($validated['fileable_type']) {
            'item' => $fileable->household_id,
            'maintenance_log' => $fileable->item->household_id,
        };

        if ($householdId !== $request->user()->household_id) {
            abort(403, 'You do not have permission to upload files to this resource.');
        }

        $uploadedFile = $request->file('file');
        $disk = config('filesystems.default');
        $path = $uploadedFile->store(
            "households/{$householdId}/{$validated['fileable_type']}/{$validated['fileable_id']}",
            $disk
        );

        $file = File::create([
            'household_id' => $request->user()->household_id,
            'fileable_type' => $fileableClass,
            'fileable_id' => $validated['fileable_id'],
            'disk' => $disk,
            'path' => $path,
            'original_name' => $uploadedFile->getClientOriginalName(),
            'mime_type' => $uploadedFile->getMimeType(),
            'size' => $uploadedFile->getSize(),
        ]);

        return response()->json([
            'file' => new FileResource($file),
        ], 201);
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
