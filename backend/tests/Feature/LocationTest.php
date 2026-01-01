<?php

use App\Models\User;
use App\Models\Household;
use App\Models\Location;
use App\Models\File;

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

    it('includes images in location index', function () {
        $location = Location::factory()->create([
            'household_id' => $this->household->id,
        ]);

        File::factory()->create([
            'household_id' => $this->household->id,
            'fileable_type' => Location::class,
            'fileable_id' => $location->id,
            'mime_type' => 'image/jpeg',
            'is_featured' => false,
        ]);

        File::factory()->create([
            'household_id' => $this->household->id,
            'fileable_type' => Location::class,
            'fileable_id' => $location->id,
            'mime_type' => 'image/jpeg',
            'is_featured' => true,
        ]);

        $response = $this->getJson('/api/locations');

        $response->assertOk()
            ->assertJsonStructure([
                'locations' => [
                    '*' => [
                        'id',
                        'name',
                        'images',
                        'featured_image',
                    ],
                ],
            ]);

        $locationData = collect($response->json('locations'))->firstWhere('id', $location->id);
        expect($locationData)->not->toBeNull();
        expect($locationData['images'])->toBeArray();
        expect($locationData['featured_image'])->not->toBeNull();
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

    it('creates a location with notes', function () {
        $response = $this->postJson('/api/locations', [
            'name' => 'Living Room',
            'notes' => 'Main gathering space with fireplace',
        ]);

        $response->assertCreated()
            ->assertJsonPath('location.name', 'Living Room')
            ->assertJsonPath('location.notes', 'Main gathering space with fireplace');

        $location = Location::where('name', 'Living Room')->first();
        expect($location->notes)->toBe('Main gathering space with fireplace');
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

        $response = $this->patchJson("/api/locations/{$location->id}", [
            'name' => 'New Name',
        ]);

        $response->assertOk()
            ->assertJsonPath('location.name', 'New Name');
    });

    it('updates location notes', function () {
        $location = Location::factory()->create([
            'household_id' => $this->household->id,
            'name' => 'Bedroom',
        ]);

        $response = $this->patchJson("/api/locations/{$location->id}", [
            'notes' => 'Master bedroom with ensuite',
        ]);

        $response->assertOk()
            ->assertJsonPath('location.notes', 'Master bedroom with ensuite');

        $location->refresh();
        expect($location->notes)->toBe('Master bedroom with ensuite');
    });

    it('prevents updating other household locations', function () {
        $otherHousehold = Household::factory()->create();
        $location = Location::factory()->create([
            'household_id' => $otherHousehold->id,
        ]);

        $response = $this->patchJson("/api/locations/{$location->id}", [
            'name' => 'Hacked',
        ]);

        $response->assertForbidden();
    });
});

describe('locations show', function () {
    it('returns location with images', function () {
        $location = Location::factory()->create([
            'household_id' => $this->household->id,
        ]);

        File::factory()->create([
            'household_id' => $this->household->id,
            'fileable_type' => Location::class,
            'fileable_id' => $location->id,
            'mime_type' => 'image/jpeg',
            'is_featured' => false,
        ]);

        File::factory()->create([
            'household_id' => $this->household->id,
            'fileable_type' => Location::class,
            'fileable_id' => $location->id,
            'mime_type' => 'image/jpeg',
            'is_featured' => true,
        ]);

        $response = $this->getJson("/api/locations/{$location->id}");

        $response->assertOk()
            ->assertJsonStructure([
                'location' => [
                    'id',
                    'name',
                    'images',
                    'featured_image',
                ],
            ]);

        $locationData = $response->json('location');
        expect($locationData['images'])->toBeArray();
        expect($locationData['featured_image'])->not->toBeNull();
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
