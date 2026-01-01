<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PaintColorResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'location_id' => $this->location_id,
            'brand' => $this->brand,
            'color_name' => $this->color_name,
            'hex_code' => $this->hex_code,
            'rgb_r' => $this->rgb_r,
            'rgb_g' => $this->rgb_g,
            'rgb_b' => $this->rgb_b,
            'purchase_url' => $this->purchase_url,
            'product_url' => $this->product_url,
            'created_at' => $this->created_at->toISOString(),
            'updated_at' => $this->updated_at->toISOString(),
        ];
    }
}
