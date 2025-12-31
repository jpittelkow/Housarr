<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CategoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        // Safely get type - handle cases where column doesn't exist yet
        $type = 'item'; // Default
        try {
            // Try to get the type attribute - this will work if column exists
            $typeValue = $this->resource->getAttribute('type');
            if ($typeValue !== null) {
                $type = $typeValue;
            }
        } catch (\Exception $e) {
            // If accessing type fails (column doesn't exist), use default
            $type = 'item';
        }

        return [
            'id' => $this->id,
            'type' => $type,
            'name' => $this->name,
            'icon' => $this->icon,
            'color' => $this->color,
            'is_system' => $this->household_id === null,
        ];
    }
}
