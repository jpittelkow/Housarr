<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Facades\Storage;

class File extends Model
{
    use HasFactory;

    protected $fillable = [
        'household_id',
        'fileable_type',
        'fileable_id',
        'disk',
        'path',
        'original_name',
        'display_name',
        'mime_type',
        'size',
        'is_featured',
    ];

    protected $casts = [
        'is_featured' => 'boolean',
        'size' => 'integer',
    ];

    protected $appends = ['url'];

    // Cache the URL to avoid repeated Storage::disk() calls during serialization
    protected ?string $cachedUrl = null;

    public function household(): BelongsTo
    {
        return $this->belongsTo(Household::class);
    }

    public function fileable(): MorphTo
    {
        return $this->morphTo();
    }

    public function getUrlAttribute(): string
    {
        // Cache URL per instance to avoid repeated Storage::disk() overhead
        if ($this->cachedUrl === null) {
            $this->cachedUrl = Storage::disk($this->disk)->url($this->path);
        }
        return $this->cachedUrl;
    }

    public function deleteFile(): bool
    {
        return Storage::disk($this->disk)->delete($this->path);
    }
}
