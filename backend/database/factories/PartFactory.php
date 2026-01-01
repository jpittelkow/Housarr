<?php

namespace Database\Factories;

use App\Models\Item;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Part>
 */
class PartFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'item_id' => Item::factory(),
            'name' => $this->faker->words(2, true),
            'part_number' => $this->faker->optional()->bothify('???-####'),
            'type' => $this->faker->randomElement(['replacement', 'consumable']),
            'purchase_url' => $this->faker->optional()->url(),
            'purchase_urls' => null,
            'price' => $this->faker->optional()->randomFloat(2, 5, 500),
            'notes' => $this->faker->optional()->sentence(),
        ];
    }

    /**
     * Create a replacement part.
     */
    public function replacement(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'replacement',
        ]);
    }

    /**
     * Create a consumable part.
     */
    public function consumable(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'consumable',
        ]);
    }
}
