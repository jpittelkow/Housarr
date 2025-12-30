<?php

use App\Models\User;
use App\Models\Household;
use App\Models\Item;
use App\Models\Part;

beforeEach(function () {
    $this->household = Household::factory()->create();
    $this->user = User::factory()->create([
        'household_id' => $this->household->id,
    ]);
    $this->item = Item::factory()->create([
        'household_id' => $this->household->id,
    ]);
    $this->actingAs($this->user);
});

describe('parts index', function () {
    it('lists parts for an item', function () {
        Part::factory()->count(3)->create([
            'item_id' => $this->item->id,
        ]);

        $response = $this->getJson("/api/items/{$this->item->id}/parts");

        $response->assertOk()
            ->assertJsonCount(3, 'parts');
    });

    it('does not show parts from other household items', function () {
        $otherHousehold = Household::factory()->create();
        $otherItem = Item::factory()->create([
            'household_id' => $otherHousehold->id,
        ]);
        Part::factory()->create(['item_id' => $otherItem->id]);

        $response = $this->getJson("/api/items/{$otherItem->id}/parts");

        $response->assertForbidden();
    });

    it('filters by type', function () {
        Part::factory()->count(2)->create([
            'item_id' => $this->item->id,
            'type' => 'replacement',
        ]);
        Part::factory()->create([
            'item_id' => $this->item->id,
            'type' => 'consumable',
        ]);

        $response = $this->getJson("/api/items/{$this->item->id}/parts?type=replacement");

        $response->assertOk()
            ->assertJsonCount(2, 'parts');
    });
});

describe('parts store', function () {
    it('creates a part', function () {
        $response = $this->postJson("/api/items/{$this->item->id}/parts", [
            'name' => 'Air Filter',
            'type' => 'consumable',
            'part_number' => 'AF-123',
        ]);

        $response->assertCreated()
            ->assertJsonPath('part.name', 'Air Filter')
            ->assertJsonPath('part.type', 'consumable');

        expect(Part::where('name', 'Air Filter')->exists())->toBeTrue();
    });

    it('validates required fields', function () {
        $response = $this->postJson("/api/items/{$this->item->id}/parts", []);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'type']);
    });

    it('validates type enum', function () {
        $response = $this->postJson("/api/items/{$this->item->id}/parts", [
            'name' => 'Test Part',
            'type' => 'invalid',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['type']);
    });

    it('prevents adding to other household items', function () {
        $otherHousehold = Household::factory()->create();
        $otherItem = Item::factory()->create([
            'household_id' => $otherHousehold->id,
        ]);

        $response = $this->postJson("/api/items/{$otherItem->id}/parts", [
            'name' => 'Hacked Part',
            'type' => 'replacement',
        ]);

        $response->assertForbidden();
    });

    it('stores purchase URLs as JSON', function () {
        $response = $this->postJson("/api/items/{$this->item->id}/parts", [
            'name' => 'Test Part',
            'type' => 'replacement',
            'purchase_urls' => [
                'amazon' => 'https://amazon.com/test',
                'home_depot' => 'https://homedepot.com/test',
            ],
        ]);

        $response->assertCreated()
            ->assertJsonPath('part.purchase_urls.amazon', 'https://amazon.com/test');
    });
});

describe('parts update', function () {
    it('updates a part', function () {
        $part = Part::factory()->create([
            'item_id' => $this->item->id,
            'name' => 'Old Name',
        ]);

        $response = $this->putJson("/api/parts/{$part->id}", [
            'name' => 'New Name',
        ]);

        $response->assertOk()
            ->assertJsonPath('part.name', 'New Name');
    });

    it('prevents updating parts on other household items', function () {
        $otherHousehold = Household::factory()->create();
        $otherItem = Item::factory()->create([
            'household_id' => $otherHousehold->id,
        ]);
        $part = Part::factory()->create([
            'item_id' => $otherItem->id,
        ]);

        $response = $this->putJson("/api/parts/{$part->id}", [
            'name' => 'Hacked',
        ]);

        $response->assertForbidden();
    });
});

describe('parts destroy', function () {
    it('deletes a part', function () {
        $part = Part::factory()->create([
            'item_id' => $this->item->id,
        ]);

        $response = $this->deleteJson("/api/parts/{$part->id}");

        $response->assertNoContent();
        expect(Part::find($part->id))->toBeNull();
    });

    it('prevents deleting parts on other household items', function () {
        $otherHousehold = Household::factory()->create();
        $otherItem = Item::factory()->create([
            'household_id' => $otherHousehold->id,
        ]);
        $part = Part::factory()->create([
            'item_id' => $otherItem->id,
        ]);

        $response = $this->deleteJson("/api/parts/{$part->id}");

        $response->assertForbidden();
    });
});
