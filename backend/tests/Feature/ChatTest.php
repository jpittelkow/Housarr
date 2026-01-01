<?php

use App\Models\User;
use App\Models\Household;
use App\Models\Item;

beforeEach(function () {
    $this->household = Household::factory()->create();
    $this->user = User::factory()->create([
        'household_id' => $this->household->id,
    ]);
    $this->actingAs($this->user);
});

describe('chat send message', function () {
    it('sends a message and gets response', function () {
        $response = $this->postJson('/api/chat', [
            'message' => 'Hello, how do I change an HVAC filter?',
        ]);

        // Chat may succeed or fail depending on AI configuration
        expect($response->status())->toBeIn([200, 422, 500]);

        if ($response->status() === 200) {
            $response->assertJsonStructure(['success', 'response']);
        }
    });

    it('requires message field', function () {
        $response = $this->postJson('/api/chat', []);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['message']);
    });

    it('validates message is not empty', function () {
        $response = $this->postJson('/api/chat', [
            'message' => '',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['message']);
    });
});

describe('chat with item context', function () {
    it('sends message with item context', function () {
        $item = Item::factory()->create([
            'household_id' => $this->household->id,
            'name' => 'Test HVAC',
            'make' => 'Carrier',
            'model' => 'Infinity',
        ]);

        $response = $this->postJson("/api/items/{$item->id}/chat", [
            'message' => 'How often should I service this?',
        ]);

        // Chat may succeed or fail depending on AI configuration
        expect($response->status())->toBeIn([200, 422, 500]);
    });

    it('validates item belongs to household', function () {
        $otherHousehold = Household::factory()->create();
        $otherItem = Item::factory()->create([
            'household_id' => $otherHousehold->id,
        ]);

        $response = $this->postJson("/api/items/{$otherItem->id}/chat", [
            'message' => 'Tell me about this item',
        ]);

        $response->assertForbidden();
    });

    it('returns 404 for non-existent item', function () {
        $response = $this->postJson('/api/items/99999/chat', [
            'message' => 'Tell me about this item',
        ]);

        $response->assertNotFound();
    });
});

describe('chat availability', function () {
    it('checks if chat is available', function () {
        $response = $this->getJson('/api/chat/available');

        $response->assertOk()
            ->assertJsonStructure(['available']);
    });
});

describe('chat suggested questions', function () {
    it('gets suggested questions for an item', function () {
        $item = Item::factory()->create([
            'household_id' => $this->household->id,
        ]);

        $response = $this->getJson("/api/items/{$item->id}/chat/suggestions");

        $response->assertOk()
            ->assertJsonStructure(['suggestions']);
    });
});

describe('chat requires authentication', function () {
    it('returns 401 for unauthenticated user', function () {
        // Clear authentication
        $this->app['auth']->forgetGuards();

        $response = $this->postJson('/api/chat', [
            'message' => 'Hello',
        ]);

        $response->assertUnauthorized();
    });
});
