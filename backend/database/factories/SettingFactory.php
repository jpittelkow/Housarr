<?php

namespace Database\Factories;

use App\Models\Household;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Setting>
 */
class SettingFactory extends Factory
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
            'key' => $this->faker->unique()->word(),
            'value' => $this->faker->word(),
            'is_encrypted' => false,
        ];
    }

    /**
     * Create a global setting (null household_id).
     */
    public function global(): static
    {
        return $this->state(fn (array $attributes) => [
            'household_id' => null,
        ]);
    }

    /**
     * Create an encrypted setting.
     */
    public function encrypted(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_encrypted' => true,
        ]);
    }
}
