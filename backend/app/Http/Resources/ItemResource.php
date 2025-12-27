<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'make' => $this->make,
            'model' => $this->model,
            'serial_number' => $this->serial_number,
            'install_date' => $this->install_date?->toDateString(),
            'location' => $this->location,
            'location_id' => $this->location_id,
            'location_obj' => new LocationResource($this->whenLoaded('location')),
            'notes' => $this->notes,
            'category' => new CategoryResource($this->whenLoaded('category')),
            'vendor' => new VendorResource($this->whenLoaded('vendor')),
            'parts' => PartResource::collection($this->whenLoaded('parts')),
            'replacement_parts' => PartResource::collection($this->whenLoaded('replacementParts')),
            'consumable_parts' => PartResource::collection($this->whenLoaded('consumableParts')),
            'maintenance_logs' => MaintenanceLogResource::collection($this->whenLoaded('maintenanceLogs')),
            'reminders' => ReminderResource::collection($this->whenLoaded('reminders')),
            'files' => FileResource::collection($this->whenLoaded('files')),
            'created_at' => $this->created_at->toISOString(),
            'updated_at' => $this->updated_at->toISOString(),
        ];
    }
}
