<?php

use App\Models\User;
use App\Models\Household;
use App\Models\Location;
use Illuminate\Http\UploadedFile;

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

describe('room color analysis', function () {
    it('validates image is required', function () {
        $response = $this->postJson('/api/locations/' . $this->location->id . '/analyze-wall-color', []);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['image']);
    });

    it('validates image file type', function () {
        $file = UploadedFile::fake()->create('document.pdf', 100);

        $response = $this->postJson('/api/locations/' . $this->location->id . '/analyze-wall-color', [
            'image' => $file,
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['image']);
    });

    it('validates image file size', function () {
        $file = UploadedFile::fake()->image('room.jpg')->size(15000); // 15MB, over 10MB limit

        $response = $this->postJson('/api/locations/' . $this->location->id . '/analyze-wall-color', [
            'image' => $file,
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['image']);
    });

    it('prevents analyzing for other household locations', function () {
        $otherHousehold = Household::factory()->create();
        $otherLocation = Location::factory()->create([
            'household_id' => $otherHousehold->id,
        ]);
        $file = UploadedFile::fake()->image('room.jpg', 800, 600);

        $response = $this->postJson('/api/locations/' . $otherLocation->id . '/analyze-wall-color', [
            'image' => $file,
        ]);

        $response->assertForbidden();
    });

    it('returns error when AI is not configured', function () {
        $file = UploadedFile::fake()->image('room.jpg', 800, 600);

        $response = $this->postJson('/api/locations/' . $this->location->id . '/analyze-wall-color', [
            'image' => $file,
        ]);

        // If AI is not configured, should return error
        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
            ]);
    });
});
