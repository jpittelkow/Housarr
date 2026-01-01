<?php

namespace Database\Factories;

use App\Models\File;
use App\Models\Household;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\File>
 */
class FileFactory extends Factory
{
    protected $model = File::class;

    public function definition(): array
    {
        return [
            'household_id' => Household::factory(),
            'fileable_type' => 'App\Models\Item',
            'fileable_id' => 1,
            'disk' => 'local',
            'path' => 'test/' . fake()->uuid() . '.jpg',
            'original_name' => fake()->word() . '.jpg',
            'display_name' => null,
            'mime_type' => 'image/jpeg',
            'size' => fake()->numberBetween(1000, 1000000),
            'is_featured' => false,
        ];
    }

    public function image(): static
    {
        return $this->state(fn (array $attributes) => [
            'mime_type' => fake()->randomElement(['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
        ]);
    }

    public function featured(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_featured' => true,
        ]);
    }
}
