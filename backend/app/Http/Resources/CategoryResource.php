<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CategoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        // Safely get type - handle cases where column doesn't exist or is null
        $type = 'item'; // Default
        if ($this->resource) {
            try {
                // Check if type attribute exists in the model's attributes
                if (array_key_exists('type', $this->resource->getAttributes())) {
                    $typeValue = $this->resource->getAttribute('type');
                    if ($typeValue !== null && $typeValue !== '') {
                        $type = $typeValue;
                    }
                }
            } catch (\Exception $e) {
                // If accessing type fails, use default
                $type = 'item';
            }
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
