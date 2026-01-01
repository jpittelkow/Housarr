<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Report extends Model
{
    use HasFactory;

    protected $fillable = [
        'household_id',
        'created_by_user_id',
        'name',
        'description',
        'prompt_used',
        'file_path',
    ];

    protected function casts(): array
    {
        return [
            'prompt_used' => 'array',
        ];
    }

    public function household(): BelongsTo
    {
        return $this->belongsTo(Household::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    /**
     * Scope to filter reports by household.
     */
    public function scopeForHousehold($query, int $householdId)
    {
        return $query->where('household_id', $householdId);
    }
}
