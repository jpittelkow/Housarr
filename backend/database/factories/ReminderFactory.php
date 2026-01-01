<?php

namespace Database\Factories;

use App\Models\Household;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Reminder>
 */
class ReminderFactory extends Factory
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
            'user_id' => null,
            'item_id' => null,
            'part_id' => null,
            'title' => $this->faker->sentence(3),
            'description' => $this->faker->optional()->sentence(),
            'due_date' => $this->faker->dateTimeBetween('now', '+30 days'),
            'repeat_interval' => $this->faker->optional()->numberBetween(1, 365),
            'status' => $this->faker->randomElement(['pending', 'snoozed', 'completed', 'dismissed']),
            'last_notified_at' => null,
        ];
    }

    /**
     * Mark the reminder as pending.
     */
    public function pending(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'pending',
        ]);
    }

    /**
     * Mark the reminder as overdue.
     */
    public function overdue(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'pending',
            'due_date' => $this->faker->dateTimeBetween('-30 days', '-1 day'),
        ]);
    }

    /**
     * Mark the reminder as upcoming (within next 7 days).
     */
    public function upcoming(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'pending',
            'due_date' => $this->faker->dateTimeBetween('now', '+7 days'),
        ]);
    }

    /**
     * Mark the reminder as completed.
     */
    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'completed',
        ]);
    }
}
