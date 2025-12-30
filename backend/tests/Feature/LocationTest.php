<?php

use App\Models\User;
use App\Models\Household;
use App\Models\Location;

beforeEach(function () {
    $this->household = Household::factory()->create();
    $this->user = User::factory()->create([
        'household_id' => $this->household->id,
    ]);
    $this->actingAs($this->user);
});

describe('locations index', function () {
    it('lists locations for household', function () {
        Location::factory()->count(3)->create([
            'household_id' => $this->household->id,
        ]);

        $response = $this->getJson('/api/locations');

        $response->assertOk()
            ->assertJsonCount(3, 'locations');
    });

    it('does not show locations from other households', function () {
        $otherHousehold = Household::factory()->create();
        Location::factory()->create(['household_id' => $otherHousehold->id]);
        Location::factory()->create(['household_id' => $this->household->id]);

        $response = $this->getJson('/api/locations');

        $response->assertOk()
            ->assertJsonCount(1, 'locations');
    });
});

describe('locations store', function () {
    it('creates a location', function () {
        $response = $this->postJson('/api/locations', [
            'name' => 'Kitchen',
            'icon' => 'home',
        ]);

        $response->assertCreated()
            ->assertJsonPath('location.name', 'Kitchen');

        expect(Location::where('name', 'Kitchen')->exists())->toBeTrue();
    });

    it('assigns location to user household', function () {
        $response = $this->postJson('/api/locations', [
            'name' => 'Garage',
        ]);

        $response->assertCreated();
        
        $location = Location::where('name', 'Garage')->first();
        expect($location->household_id)->toBe($this->household->id);
    });

    it('validates required fields', function () {
        $response = $this->postJson('/api/locations', []);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['name']);
    });

    it('validates unique name per household', function () {
        Location::factory()->create([
            'household_id' => $this->household->id,
            'name' => 'Kitchen',
        ]);

        $response = $this->postJson('/api/locations', [
            'name' => 'Kitchen',
        ]);

        $response->assertUnprocessable();
    });

    it('allows same name in different households', function () {
        $otherHousehold = Household::factory()->create();
        Location::factory()->create([
            'household_id' => $otherHousehold->id,
            'name' => 'Kitchen',
        ]);

        $response = $this->postJson('/api/locations', [
            'name' => 'Kitchen',
        ]);

        $response->assertCreated();
    });
});

describe('locations update', function () {
    it('updates a location', function () {
        $location = Location::factory()->create([
            'household_id' => $this->household->id,
            'name' => 'Old Name',
        ]);

        $response = $this->putJson("/api/locations/{$location->id}", [
            'name' => 'New Name',
        ]);

        $response->assertOk()
            ->assertJsonPath('location.name', 'New Name');
    });

    it('prevents updating other household locations', function () {
        $otherHousehold = Household::factory()->create();
        $location = Location::factory()->create([
            'household_id' => $otherHousehold->id,
        ]);

        $response = $this->putJson("/api/locations/{$location->id}", [
            'name' => 'Hacked',
        ]);

        $response->assertForbidden();
    });
});

describe('locations destroy', function () {
    it('deletes a location', function () {
        $location = Location::factory()->create([
            'household_id' => $this->household->id,
        ]);

        $response = $this->deleteJson("/api/locations/{$location->id}");

        $response->assertNoContent();
        expect(Location::find($location->id))->toBeNull();
    });

    it('prevents deleting other household locations', function () {
        $otherHousehold = Household::factory()->create();
        $location = Location::factory()->create([
            'household_id' => $otherHousehold->id,
        ]);

        $response = $this->deleteJson("/api/locations/{$location->id}");

        $response->assertForbidden();
    });
});
