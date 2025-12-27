<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Reminder extends Model
{
    use HasFactory;

    protected $fillable = [
        'household_id',
        'user_id',
        'item_id',
        'part_id',
        'title',
        'description',
        'due_date',
        'repeat_interval',
        'status',
        'last_notified_at',
    ];

    protected function casts(): array
    {
        return [
            'due_date' => 'date',
            'last_notified_at' => 'datetime',
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

    public function part(): BelongsTo
    {
        return $this->belongsTo(Part::class);
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeOverdue($query)
    {
        return $query->where('status', 'pending')
                     ->where('due_date', '<', now());
    }

    public function scopeUpcoming($query, $days = 7)
    {
        return $query->where('status', 'pending')
                     ->whereBetween('due_date', [now(), now()->addDays($days)]);
    }

    public function complete(): void
    {
        $this->update(['status' => 'completed']);

        if ($this->repeat_interval) {
            self::create([
                'household_id' => $this->household_id,
                'user_id' => $this->user_id,
                'item_id' => $this->item_id,
                'part_id' => $this->part_id,
                'title' => $this->title,
                'description' => $this->description,
                'due_date' => $this->due_date->addDays($this->repeat_interval),
                'repeat_interval' => $this->repeat_interval,
                'status' => 'pending',
            ]);
        }
    }

    public function snooze(int $days = 1): void
    {
        $this->update([
            'status' => 'snoozed',
            'due_date' => $this->due_date->addDays($days),
        ]);
    }
}
