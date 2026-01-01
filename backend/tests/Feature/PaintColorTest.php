<?php

use App\Models\User;
use App\Models\Household;
use App\Models\Location;
use App\Models\PaintColor;

beforeEach(function () {
    $this->household = Household::factory()->create();
    $this->user = User::factory()->create([
        'household_id' => $this->household->id,
    ]);
    $this->location = Location::factory()->create([
        'household_id' => $this->household->id,
    ]);
    $this->actingAs($this->user);
});

describe('paint colors index', function () {
    it('lists paint colors for a location', function () {
        PaintColor::factory()->count(3)->create([
            'location_id' => $this->location->id,
        ]);

        $response = $this->getJson("/api/locations/{$this->location->id}/paint-colors");

        $response->assertOk()
            ->assertJsonCount(3, 'paint_colors');
    });

    it('does not show paint colors from other household locations', function () {
        $otherHousehold = Household::factory()->create();
        $otherLocation = Location::factory()->create([
            'household_id' => $otherHousehold->id,
        ]);
        PaintColor::factory()->create(['location_id' => $otherLocation->id]);

        $response = $this->getJson("/api/locations/{$otherLocation->id}/paint-colors");

        $response->assertForbidden();
    });
});

describe('paint colors store', function () {
    it('creates a paint color', function () {
        $response = $this->postJson("/api/locations/{$this->location->id}/paint-colors", [
            'brand' => 'Sherwin-Williams',
            'color_name' => 'Agreeable Gray',
            'hex_code' => '#D0CCC9',
            'rgb_r' => 208,
            'rgb_g' => 204,
            'rgb_b' => 201,
            'purchase_url' => 'https://www.sherwin-williams.com/paint-colors/sw7029',
        ]);

        $response->assertCreated()
            ->assertJsonPath('paint_color.color_name', 'Agreeable Gray')
            ->assertJsonPath('paint_color.brand', 'Sherwin-Williams')
            ->assertJsonPath('paint_color.hex_code', '#D0CCC9');

        expect(PaintColor::where('color_name', 'Agreeable Gray')->exists())->toBeTrue();
    });

    it('validates required fields', function () {
        $response = $this->postJson("/api/locations/{$this->location->id}/paint-colors", []);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['color_name']);
    });

    it('validates hex code format', function () {
        $response = $this->postJson("/api/locations/{$this->location->id}/paint-colors", [
            'color_name' => 'Test Color',
            'hex_code' => 'invalid-hex',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['hex_code']);
    });

    it('validates RGB values range', function () {
        $response = $this->postJson("/api/locations/{$this->location->id}/paint-colors", [
            'color_name' => 'Test Color',
            'rgb_r' => 300, // Invalid: > 255
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['rgb_r']);
    });

    it('prevents adding to other household locations', function () {
        $otherHousehold = Household::factory()->create();
        $otherLocation = Location::factory()->create([
            'household_id' => $otherHousehold->id,
        ]);

        $response = $this->postJson("/api/locations/{$otherLocation->id}/paint-colors", [
            'color_name' => 'Hacked Color',
        ]);

        $response->assertForbidden();
    });
});

describe('paint colors update', function () {
    it('updates a paint color', function () {
        $paintColor = PaintColor::factory()->create([
            'location_id' => $this->location->id,
            'color_name' => 'Old Color',
        ]);

        $response = $this->patchJson("/api/locations/{$this->location->id}/paint-colors/{$paintColor->id}", [
            'color_name' => 'New Color',
        ]);

        $response->assertOk()
            ->assertJsonPath('paint_color.color_name', 'New Color');
    });

    it('prevents updating other household paint colors', function () {
        $otherHousehold = Household::factory()->create();
        $otherLocation = Location::factory()->create([
            'household_id' => $otherHousehold->id,
        ]);
        $paintColor = PaintColor::factory()->create([
            'location_id' => $otherLocation->id,
        ]);

        $response = $this->patchJson("/api/locations/{$otherLocation->id}/paint-colors/{$paintColor->id}", [
            'color_name' => 'Hacked',
        ]);

        $response->assertForbidden();
    });
});

describe('paint colors destroy', function () {
    it('deletes a paint color', function () {
        $paintColor = PaintColor::factory()->create([
            'location_id' => $this->location->id,
        ]);

        $response = $this->deleteJson("/api/locations/{$this->location->id}/paint-colors/{$paintColor->id}");

        $response->assertOk()
            ->assertJson(['message' => 'Paint color deleted successfully']);
        expect(PaintColor::find($paintColor->id))->toBeNull();
    });

    it('prevents deleting other household paint colors', function () {
        $otherHousehold = Household::factory()->create();
        $otherLocation = Location::factory()->create([
            'household_id' => $otherHousehold->id,
        ]);
        $paintColor = PaintColor::factory()->create([
            'location_id' => $otherLocation->id,
        ]);

        $response = $this->deleteJson("/api/locations/{$otherLocation->id}/paint-colors/{$paintColor->id}");

        $response->assertForbidden();
    });
});
