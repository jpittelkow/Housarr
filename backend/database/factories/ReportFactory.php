<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Report>
 */
class ReportFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    protected $model = \App\Models\Report::class;

    public function definition(): array
    {
        return [
            'household_id' => \App\Models\Household::factory(),
            'created_by_user_id' => \App\Models\User::factory(),
            'name' => $this->faker->words(3, true) . ' Report',
            'description' => $this->faker->sentence(),
            'prompt_used' => [
                ['role' => 'user', 'content' => 'Create a test report'],
                ['role' => 'assistant', 'content' => 'I will create a test report'],
            ],
            'file_path' => 'reports/1/1.html',
        ];
    }
}
