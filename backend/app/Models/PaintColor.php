<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaintColor extends Model
{
    use HasFactory;

    protected static function newFactory()
    {
        return \Database\Factories\PaintColorFactory::new();
    }

    protected $fillable = [
        'location_id',
        'brand',
        'color_name',
        'hex_code',
        'rgb_r',
        'rgb_g',
        'rgb_b',
        'cmyk_c',
        'cmyk_m',
        'cmyk_y',
        'cmyk_k',
        'purchase_url',
        'product_url',
    ];

    protected function casts(): array
    {
        return [
            'rgb_r' => 'integer',
            'rgb_g' => 'integer',
            'rgb_b' => 'integer',
            'cmyk_c' => 'integer',
            'cmyk_m' => 'integer',
            'cmyk_y' => 'integer',
            'cmyk_k' => 'integer',
        ];
    }

    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class);
    }
}
