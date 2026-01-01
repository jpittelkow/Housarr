<?php

namespace Database\Factories;

use App\Models\Location;
use App\Models\PaintColor;
use Illuminate\Database\Eloquent\Factories\Factory;

class PaintColorFactory extends Factory
{
    protected $model = PaintColor::class;

    public function definition(): array
    {
        $brands = ['Sherwin-Williams', 'Benjamin Moore', 'Behr', 'Valspar', 'PPG', 'Glidden'];
        $colors = ['Agreeable Gray', 'Classic Gray', 'Alabaster', 'Repose Gray', 'Naval', 'Evergreen Fog'];
        
        return [
            'location_id' => Location::factory(),
            'brand' => $this->faker->randomElement($brands),
            'color_name' => $this->faker->randomElement($colors),
            'hex_code' => $this->faker->hexColor(),
            'rgb_r' => $this->faker->numberBetween(0, 255),
            'rgb_g' => $this->faker->numberBetween(0, 255),
            'rgb_b' => $this->faker->numberBetween(0, 255),
            'purchase_url' => $this->faker->optional()->url(),
            'product_url' => $this->faker->optional()->url(),
        ];
    }
}
