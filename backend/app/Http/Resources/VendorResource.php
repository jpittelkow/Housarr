<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VendorResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'company' => $this->company,
            'phone' => $this->phone,
            'email' => $this->email,
            'website' => $this->website,
            'address' => $this->address,
            'latitude' => $this->latitude ? (float) $this->latitude : null,
            'longitude' => $this->longitude ? (float) $this->longitude : null,
            'notes' => $this->notes,
            'category' => new CategoryResource($this->whenLoaded('category')),
            'images' => FileResource::collection($this->whenLoaded('images')),
            'logo' => new FileResource($this->whenLoaded('logo')),
            'created_at' => $this->created_at->toISOString(),
        ];
    }
}
