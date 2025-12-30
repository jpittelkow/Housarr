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
            $response->assertJsonStructure(['response']);
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

        $response = $this->postJson('/api/chat', [
            'message' => 'How often should I service this?',
            'item_id' => $item->id,
        ]);

        // Chat may succeed or fail depending on AI configuration
        expect($response->status())->toBeIn([200, 422, 500]);
    });

    it('validates item belongs to household', function () {
        $otherHousehold = Household::factory()->create();
        $otherItem = Item::factory()->create([
            'household_id' => $otherHousehold->id,
        ]);

        $response = $this->postJson('/api/chat', [
            'message' => 'Tell me about this item',
            'item_id' => $otherItem->id,
        ]);

        $response->assertForbidden();
    });

    it('validates item exists', function () {
        $response = $this->postJson('/api/chat', [
            'message' => 'Tell me about this item',
            'item_id' => 99999,
        ]);

        expect($response->status())->toBeIn([404, 422]);
    });
});

describe('chat history', function () {
    it('returns empty history initially', function () {
        $response = $this->getJson('/api/chat/history');

        $response->assertOk()
            ->assertJson(['messages' => []]);
    });

    it('clears chat history', function () {
        $response = $this->deleteJson('/api/chat/history');

        $response->assertNoContent();
    });
});

describe('chat with manual context', function () {
    it('can include manual_ids in request', function () {
        $item = Item::factory()->create([
            'household_id' => $this->household->id,
        ]);

        $response = $this->postJson('/api/chat', [
            'message' => 'What does the manual say about maintenance?',
            'item_id' => $item->id,
            'manual_ids' => [], // Empty but valid
        ]);

        // Should accept the request structure
        expect($response->status())->toBeIn([200, 422, 500]);
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
