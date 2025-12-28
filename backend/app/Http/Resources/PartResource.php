<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PartResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'item_id' => $this->item_id,
            'name' => $this->name,
            'part_number' => $this->part_number,
            'type' => $this->type,
            'purchase_url' => $this->purchase_url,
            'price' => $this->price ? (float) $this->price : null,
            'notes' => $this->notes,
            'images' => FileResource::collection($this->whenLoaded('images')),
            'featured_image' => new FileResource($this->whenLoaded('featuredImage')),
            'created_at' => $this->created_at->toISOString(),
        ];
    }
}
