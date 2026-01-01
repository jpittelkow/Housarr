<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LocationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'icon' => $this->icon,
            'notes' => $this->notes,
            'items_count' => $this->whenCounted('items'),
            'images' => FileResource::collection($this->whenLoaded('images')),
            'featured_image' => new FileResource($this->whenLoaded('featuredImage')),
            'paint_colors' => PaintColorResource::collection($this->whenLoaded('paintColors')),
        ];
    }
}
