<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReminderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'due_date' => $this->due_date->toDateString(),
            'repeat_interval' => $this->repeat_interval,
            'status' => $this->status,
            'is_overdue' => $this->status === 'pending' && $this->due_date->isPast(),
            'item' => new ItemResource($this->whenLoaded('item')),
            'part' => new PartResource($this->whenLoaded('part')),
            'user' => new UserResource($this->whenLoaded('user')),
            'created_at' => $this->created_at->toISOString(),
        ];
    }
}
