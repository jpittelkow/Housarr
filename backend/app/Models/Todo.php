<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Todo extends Model
{
    use HasFactory;

    protected $fillable = [
        'household_id',
        'user_id',
        'item_id',
        'title',
        'description',
        'priority',
        'due_date',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'due_date' => 'date',
            'completed_at' => 'datetime',
        ];
    }

    public function household(): BelongsTo
    {
        return $this->belongsTo(Household::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    public function scopeIncomplete($query)
    {
        return $query->whereNull('completed_at');
    }

    public function scopeCompleted($query)
    {
        return $query->whereNotNull('completed_at');
    }

    public function complete(): void
    {
        $this->update(['completed_at' => now()]);
    }

    public function uncomplete(): void
    {
        $this->update(['completed_at' => null]);
    }

    public function isCompleted(): bool
    {
        return $this->completed_at !== null;
    }

    /**
     * Scope for overdue incomplete todos
     */
    public function scopeOverdue($query)
    {
        return $query->incomplete()
            ->whereNotNull('due_date')
            ->where('due_date', '<', now()->startOfDay());
    }

    /**
     * Scope for upcoming todos in next X days
     */
    public function scopeUpcoming($query, int $days = 7)
    {
        return $query->incomplete()
            ->whereNotNull('due_date')
            ->whereBetween('due_date', [now()->startOfDay(), now()->addDays($days)->endOfDay()]);
    }

    /**
     * Scope for high priority todos
     */
    public function scopeHighPriority($query)
    {
        return $query->where('priority', 'high');
    }
}
