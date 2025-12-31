<?php

use App\Models\User;
use App\Models\Household;

beforeEach(function () {
    $this->household = Household::factory()->create();
    $this->user = User::factory()->create([
        'household_id' => $this->household->id,
    ]);
    $this->actingAs($this->user);
});

describe('address autocomplete', function () {
    it('requires authentication', function () {
        auth()->forgetGuards();
        
        $response = $this->getJson('/api/address/autocomplete?query=123 Main');
        
        $response->assertUnauthorized();
    });

    it('validates query is required', function () {
        $response = $this->getJson('/api/address/autocomplete');
        
        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['query']);
    });

    it('validates query minimum length', function () {
        $response = $this->getJson('/api/address/autocomplete?query=ab');
        
        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['query']);
    });

    it('returns suggestions for valid query', function () {
        // Note: This test hits the real Nominatim API
        // In a production test suite, you would mock the NominatimService
        $response = $this->getJson('/api/address/autocomplete?query=1600 Pennsylvania Ave Washington');
        
        $response->assertOk()
            ->assertJsonStructure([
                'suggestions',
                'count',
            ]);
    });

    it('accepts optional limit parameter', function () {
        $response = $this->getJson('/api/address/autocomplete?query=New York City&limit=3');
        
        $response->assertOk();
    });

    it('accepts optional countrycodes parameter', function () {
        $response = $this->getJson('/api/address/autocomplete?query=London&countrycodes=us');
        
        $response->assertOk();
    });
});

describe('address reverse geocode', function () {
    it('requires authentication', function () {
        auth()->forgetGuards();
        
        $response = $this->getJson('/api/address/reverse?lat=40.7128&lon=-74.0060');
        
        $response->assertUnauthorized();
    });

    it('validates lat is required', function () {
        $response = $this->getJson('/api/address/reverse?lon=-74.0060');
        
        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['lat']);
    });

    it('validates lon is required', function () {
        $response = $this->getJson('/api/address/reverse?lat=40.7128');
        
        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['lon']);
    });

    it('validates lat range', function () {
        $response = $this->getJson('/api/address/reverse?lat=100&lon=-74.0060');
        
        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['lat']);
    });

    it('validates lon range', function () {
        $response = $this->getJson('/api/address/reverse?lat=40.7128&lon=200');
        
        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['lon']);
    });

    it('returns address for valid coordinates', function () {
        // Note: This test hits the real Nominatim API
        // New York City coordinates
        $response = $this->getJson('/api/address/reverse?lat=40.7128&lon=-74.0060');
        
        $response->assertOk()
            ->assertJsonStructure([
                'address',
            ]);
    });
});
