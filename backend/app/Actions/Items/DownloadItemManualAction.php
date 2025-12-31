<?php

namespace App\Actions\Items;

use App\Http\Resources\FileResource;
use App\Models\Item;
use App\Services\ManualSearchService;
use App\Services\StorageService;
use Illuminate\Support\Facades\Storage;

class DownloadItemManualAction
{
    public function execute(Item $item, string $make, string $model, int $householdId): array
    {
        $manualService = new ManualSearchService($householdId);
        $result = $manualService->findAndDownloadManual($make, $model);

        if ($result === null) {
            throw new \Exception('No manual found for this product.');
        }

        // Save the PDF to storage
        $disk = StorageService::getDiskForHousehold($householdId);
        $diskName = StorageService::getDiskName($householdId);

        $filename = preg_replace('/[^a-zA-Z0-9._-]/', '_', $result['filename']);
        $path = "households/{$householdId}/items/{$item->id}/manuals/" . time() . "_{$filename}";

        Storage::disk($disk)->put($path, $result['content']);

        // Create file record
        $fileRecord = $item->files()->create([
            'household_id' => $householdId,
            'disk' => $diskName,
            'path' => $path,
            'original_name' => $result['filename'],
            'mime_type' => 'application/pdf',
            'size' => $result['size'],
        ]);

        return [
            'success' => true,
            'file' => new FileResource($fileRecord),
            'source_url' => $result['source_url'] ?? null,
        ];
    }
}

