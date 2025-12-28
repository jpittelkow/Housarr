<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Crypt;

class Setting extends Model
{
    use HasFactory;

    protected $fillable = [
        'household_id',
        'key',
        'value',
        'is_encrypted',
    ];

    protected $casts = [
        'is_encrypted' => 'boolean',
    ];

    public function household(): BelongsTo
    {
        return $this->belongsTo(Household::class);
    }

    /**
     * Get the decrypted value if encrypted.
     */
    public function getValueAttribute($value): ?string
    {
        if ($this->is_encrypted && $value) {
            try {
                return Crypt::decryptString($value);
            } catch (\Exception $e) {
                return null;
            }
        }
        return $value;
    }

    /**
     * Encrypt value if marked as encrypted before saving.
     */
    public function setValueAttribute($value): void
    {
        if ($this->is_encrypted && $value) {
            $this->attributes['value'] = Crypt::encryptString($value);
        } else {
            $this->attributes['value'] = $value;
        }
    }

    /**
     * Get a setting value by key.
     */
    public static function get(string $key, ?int $householdId = null, mixed $default = null): mixed
    {
        $setting = static::where('key', $key)
            ->where('household_id', $householdId)
            ->first();

        return $setting?->value ?? $default;
    }

    /**
     * Set a setting value.
     */
    public static function set(string $key, mixed $value, ?int $householdId = null, bool $encrypted = false): static
    {
        $setting = static::firstOrNew([
            'key' => $key,
            'household_id' => $householdId,
        ]);

        $setting->is_encrypted = $encrypted;
        $setting->value = $value;
        $setting->save();

        return $setting;
    }

    /**
     * Get multiple settings as an array.
     */
    public static function getMany(array $keys, ?int $householdId = null): array
    {
        $settings = static::where('household_id', $householdId)
            ->whereIn('key', $keys)
            ->get();

        $result = [];
        foreach ($keys as $key) {
            $setting = $settings->firstWhere('key', $key);
            $result[$key] = $setting?->value;
        }

        return $result;
    }
}
