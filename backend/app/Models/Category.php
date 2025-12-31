<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Schema;

class Category extends Model
{
    use HasFactory;

    protected $fillable = [
        'household_id',
        'type',
        'name',
        'icon',
        'color',
    ];

    protected $casts = [
        'type' => 'string',
    ];

    public function household(): BelongsTo
    {
        return $this->belongsTo(Household::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(Item::class);
    }

    public function vendors(): HasMany
    {
        return $this->hasMany(Vendor::class);
    }

    public function scopeForHousehold($query, $householdId)
    {
        return $query->where(function ($q) use ($householdId) {
            $q->whereNull('household_id')
              ->orWhere('household_id', $householdId);
        });
    }

    /**
     * Scope to filter categories by type.
     * Gracefully handles cases where the type column doesn't exist yet (before migration).
     */
    public function scopeOfType($query, string $type)
    {
        // Check if type column exists before filtering
        if (Schema::hasColumn($this->getTable(), 'type')) {
            return $query->where('type', $type);
        }
        // If column doesn't exist, return all categories (backward compatibility)
        return $query;
    }
}
