<?php

namespace Database\Factories;

use App\Models\Household;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Category>
 */
class CategoryFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'household_id' => Household::factory(),
            'type' => $this->faker->randomElement(['item', 'vendor']),
            'name' => $this->faker->unique()->word(),
            'icon' => $this->faker->optional()->randomElement(['home', 'wrench', 'car', 'tv', 'lightbulb']),
            'color' => $this->faker->optional()->hexColor(),
        ];
    }

    /**
     * Create a global category (null household_id).
     */
    public function global(): static
    {
        return $this->state(fn (array $attributes) => [
            'household_id' => null,
        ]);
    }

    /**
     * Create an item category.
     */
    public function forItems(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'item',
        ]);
    }

    /**
     * Create a vendor category.
     */
    public function forVendors(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'vendor',
        ]);
    }
}
