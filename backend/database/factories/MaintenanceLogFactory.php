<?php

namespace Database\Factories;

use App\Models\Item;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\MaintenanceLog>
 */
class MaintenanceLogFactory extends Factory
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
            'vendor_id' => null,
            'type' => $this->faker->randomElement(['service', 'repair', 'replacement', 'inspection']),
            'date' => $this->faker->dateTimeBetween('-1 year', 'now'),
            'cost' => $this->faker->optional()->randomFloat(2, 10, 1000),
            'notes' => $this->faker->optional()->sentence(),
            'attachments' => null,
        ];
    }

    /**
     * Create a service log.
     */
    public function service(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'service',
        ]);
    }

    /**
     * Create a repair log.
     */
    public function repair(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'repair',
        ]);
    }
}
