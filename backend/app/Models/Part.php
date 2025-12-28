<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\Relations\MorphOne;

class Part extends Model
{
    use HasFactory;

    protected $fillable = [
        'item_id',
        'name',
        'part_number',
        'type',
        'purchase_url',
        'purchase_urls',
        'price',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'purchase_urls' => 'array',
        ];
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    public function reminders(): HasMany
    {
        return $this->hasMany(Reminder::class);
    }

    public function scopeReplacement($query)
    {
        return $query->where('type', 'replacement');
    }

    public function scopeConsumable($query)
    {
        return $query->where('type', 'consumable');
    }

    public function files(): MorphMany
    {
        return $this->morphMany(File::class, 'fileable');
    }

    public function images(): MorphMany
    {
        return $this->morphMany(File::class, 'fileable')
            ->whereIn('mime_type', ['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
    }

    public function featuredImage(): MorphOne
    {
        return $this->morphOne(File::class, 'fileable')
            ->where('is_featured', true)
            ->whereIn('mime_type', ['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
    }
}
