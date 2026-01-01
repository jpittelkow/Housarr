<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Location>
 */
class LocationFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'household_id' => \App\Models\Household::factory(),
            'name' => $this->faker->randomElement(['Living Room', 'Kitchen', 'Bedroom', 'Bathroom', 'Office', 'Garage', 'Basement']),
            'icon' => $this->faker->optional()->randomElement(['home', 'map-pin', 'building']),
            'notes' => $this->faker->optional()->sentence(),
        ];
    }
}
