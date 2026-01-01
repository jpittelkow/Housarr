<?php

namespace App\Http\Controllers\Api;

use App\Actions\Rooms\AnalyzeRoomColorAction;
use App\Http\Controllers\Controller;
use App\Models\File;
use App\Models\Location;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;

class RoomColorAnalysisController extends Controller
{
    public function analyzeWallColor(Request $request, Location $location, AnalyzeRoomColorAction $analyzeAction): JsonResponse
    {
        Gate::authorize('view', $location);

        $request->validate([
            'file_id' => ['required_without:image', 'integer', 'exists:files,id'],
            'image' => ['required_without:file_id', 'file', 'mimes:jpeg,jpg,png,webp,gif', 'max:10240'],
        ]);

        try {
            $householdId = $request->user()->household_id;
            
            if ($request->has('file_id')) {
                // Use existing file
                $fileRecord = File::where('id', $request->file_id)
                    ->where('fileable_type', Location::class)
                    ->where('fileable_id', $location->id)
                    ->where('household_id', $householdId)
                    ->firstOrFail();

                // Create UploadedFile from stored file
                $disk = Storage::disk($fileRecord->disk);
                $fullPath = $disk->path($fileRecord->path);
                
                // For 'public' disk, path() returns the full path including storage/app/public
                // For 'local' disk, path() returns storage/app/private
                // Ensure the file exists
                if (!file_exists($fullPath)) {
                    throw new \Exception('File not found in storage');
                }

                $file = new \Illuminate\Http\UploadedFile(
                    $fullPath,
                    $fileRecord->original_name,
                    $fileRecord->mime_type,
                    null,
                    true // test mode - tells Laravel this is a test file
                );
            } else {
                // Use uploaded file
                $file = $request->file('image');
            }

            $result = $analyzeAction->execute($file, $householdId);

            return response()->json([
                'success' => true,
                ...$result,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Image not found',
                'paint_colors' => [],
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'paint_colors' => [],
            ], 422);
        }
    }
}
