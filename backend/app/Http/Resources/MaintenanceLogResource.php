<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MaintenanceLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'item_id' => $this->item_id,
            'type' => $this->type,
            'date' => $this->date->toDateString(),
            'cost' => $this->cost ? (float) $this->cost : null,
            'notes' => $this->notes,
            'vendor' => new VendorResource($this->whenLoaded('vendor')),
            'files' => FileResource::collection($this->whenLoaded('files')),
            'created_at' => $this->created_at->toISOString(),
        ];
    }
}
