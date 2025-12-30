<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * Setup the test environment.
     */
    protected function setUp(): void
    {
        parent::setUp();
        
        // Disable exception handling for better error messages during development
        // $this->withoutExceptionHandling();
    }

    /**
     * Create a user with household for testing.
     */
    protected function createUserWithHousehold(array $userAttributes = [], array $householdAttributes = []): \App\Models\User
    {
        $household = \App\Models\Household::factory()->create($householdAttributes);
        
        return \App\Models\User::factory()->create(array_merge([
            'household_id' => $household->id,
        ], $userAttributes));
    }
}
