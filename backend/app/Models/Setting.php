<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Cache;
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

    /**
     * In-memory cache for the current request.
     */
    protected static array $runtimeCache = [];

    /**
     * Cache TTL in seconds (5 minutes).
     */
    protected const CACHE_TTL = 300;

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
     * Get a setting value by key with caching.
     */
    public static function get(string $key, ?int $householdId = null, mixed $default = null): mixed
    {
        $cacheKey = static::getCacheKey($householdId, $key);

        // Check runtime cache first (fastest)
        if (array_key_exists($cacheKey, static::$runtimeCache)) {
            return static::$runtimeCache[$cacheKey] ?? $default;
        }

        // Check persistent cache
        $value = Cache::remember($cacheKey, static::CACHE_TTL, function () use ($key, $householdId) {
            $setting = static::where('key', $key)
                ->where('household_id', $householdId)
                ->first();

            return $setting?->value;
        });

        // Store in runtime cache
        static::$runtimeCache[$cacheKey] = $value;

        return $value ?? $default;
    }

    /**
     * Set a setting value and clear cache.
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

        // Clear caches
        static::clearCache($householdId, $key);

        return $setting;
    }

    /**
     * Get multiple settings as an array with efficient caching.
     */
    public static function getMany(array $keys, ?int $householdId = null): array
    {
        $result = [];
        $keysToFetch = [];

        // Check runtime cache first
        foreach ($keys as $key) {
            $cacheKey = static::getCacheKey($householdId, $key);
            if (array_key_exists($cacheKey, static::$runtimeCache)) {
                $result[$key] = static::$runtimeCache[$cacheKey];
            } else {
                $keysToFetch[] = $key;
            }
        }

        // If all keys were in runtime cache, return early
        if (empty($keysToFetch)) {
            return $result;
        }

        // Fetch remaining keys from database in single query
        $settings = static::where('household_id', $householdId)
            ->whereIn('key', $keysToFetch)
            ->get()
            ->keyBy('key');

        foreach ($keysToFetch as $key) {
            $value = $settings->get($key)?->value;
            $result[$key] = $value;

            // Store in both caches
            $cacheKey = static::getCacheKey($householdId, $key);
            static::$runtimeCache[$cacheKey] = $value;
            Cache::put($cacheKey, $value, static::CACHE_TTL);
        }

        return $result;
    }

    /**
     * Generate cache key for a setting.
     */
    protected static function getCacheKey(?int $householdId, string $key): string
    {
        return "setting.{$householdId}.{$key}";
    }

    /**
     * Clear cache for a setting.
     */
    public static function clearCache(?int $householdId, ?string $key = null): void
    {
        if ($key) {
            $cacheKey = static::getCacheKey($householdId, $key);
            unset(static::$runtimeCache[$cacheKey]);
            Cache::forget($cacheKey);
        } else {
            // Clear all settings for household from runtime cache
            foreach (static::$runtimeCache as $cacheKey => $value) {
                if (str_starts_with($cacheKey, "setting.{$householdId}.")) {
                    unset(static::$runtimeCache[$cacheKey]);
                    Cache::forget($cacheKey);
                }
            }
        }
    }

    /**
     * Clear all runtime cache (useful for testing).
     */
    public static function clearRuntimeCache(): void
    {
        static::$runtimeCache = [];
    }
}
