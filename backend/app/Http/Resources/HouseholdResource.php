<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class HouseholdResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'images' => FileResource::collection($this->whenLoaded('images')),
            'featured_image' => new FileResource($this->whenLoaded('featuredImage')),
            'created_at' => $this->created_at->toISOString(),
        ];
    }
}
