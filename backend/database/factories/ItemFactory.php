<?php

namespace Database\Factories;

use App\Models\Household;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Item>
 */
class ItemFactory extends Factory
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
            'category_id' => null,
            'vendor_id' => null,
            'location_id' => null,
            'name' => $this->faker->words(3, true),
            'make' => $this->faker->optional()->company(),
            'model' => $this->faker->optional()->bothify('??-####'),
            'serial_number' => $this->faker->optional()->uuid(),
            'install_date' => $this->faker->optional()->date(),
            'location' => $this->faker->optional()->word(),
            'notes' => $this->faker->optional()->sentence(),
            'warranty_years' => $this->faker->optional()->numberBetween(1, 10),
            'maintenance_interval_months' => $this->faker->optional()->numberBetween(1, 24),
            'typical_lifespan_years' => $this->faker->optional()->numberBetween(5, 20),
        ];
    }
}
