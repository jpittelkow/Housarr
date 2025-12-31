<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CategoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type ?? 'item', // Default to 'item' if type is missing (backward compatibility)
            'name' => $this->name,
            'icon' => $this->icon,
            'color' => $this->color,
            'is_system' => $this->household_id === null,
        ];
    }
}
