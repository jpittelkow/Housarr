<?php

use App\Models\User;
use App\Models\Household;
use App\Models\Item;
use App\Models\Category;
use App\Models\Location;

beforeEach(function () {
    $this->household = Household::factory()->create();
    $this->user = User::factory()->create([
        'household_id' => $this->household->id,
    ]);
    $this->category = Category::factory()->create([
        'household_id' => $this->household->id,
    ]);
    $this->actingAs($this->user);
});

describe('items index', function () {
    it('lists items for household', function () {
        Item::factory()->count(3)->create([
            'household_id' => $this->household->id,
        ]);

        $response = $this->getJson('/api/items');

        $response->assertOk()
            ->assertJsonCount(3, 'items');
    });

    it('does not show items from other households', function () {
        $otherHousehold = Household::factory()->create();
        Item::factory()->create(['household_id' => $otherHousehold->id]);
        Item::factory()->create(['household_id' => $this->household->id]);

        $response = $this->getJson('/api/items');

        $response->assertOk()
            ->assertJsonCount(1, 'items');
    });

    it('filters by category', function () {
        $category1 = Category::factory()->create(['household_id' => $this->household->id]);
        $category2 = Category::factory()->create(['household_id' => $this->household->id]);
        
        Item::factory()->count(2)->create([
            'household_id' => $this->household->id,
            'category_id' => $category1->id,
        ]);
        Item::factory()->create([
            'household_id' => $this->household->id,
            'category_id' => $category2->id,
        ]);

        $response = $this->getJson("/api/items?category_id={$category1->id}");

        $response->assertOk()
            ->assertJsonCount(2, 'items');
    });

    it('searches by name', function () {
        Item::factory()->create([
            'household_id' => $this->household->id,
            'name' => 'Test Refrigerator',
        ]);
        Item::factory()->create([
            'household_id' => $this->household->id,
            'name' => 'Washing Machine',
        ]);

        $response = $this->getJson('/api/items?search=refrigerator');

        $response->assertOk()
            ->assertJsonCount(1, 'items');
    });
});

describe('items store', function () {
    it('creates an item', function () {
        $response = $this->postJson('/api/items', [
            'name' => 'Test Item',
            'make' => 'TestMake',
            'model' => 'TestModel',
            'category_id' => $this->category->id,
        ]);

        $response->assertCreated()
            ->assertJsonPath('item.name', 'Test Item')
            ->assertJsonPath('item.make', 'TestMake');

        expect(Item::where('name', 'Test Item')->exists())->toBeTrue();
    });

    it('assigns item to user household', function () {
        $response = $this->postJson('/api/items', [
            'name' => 'Test Item',
            'category_id' => $this->category->id,
        ]);

        $response->assertCreated();
        
        $item = Item::where('name', 'Test Item')->first();
        expect($item->household_id)->toBe($this->household->id);
    });

    it('validates required fields', function () {
        $response = $this->postJson('/api/items', []);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['name']);
    });

    it('validates category belongs to household', function () {
        $otherHousehold = Household::factory()->create();
        $otherCategory = Category::factory()->create([
            'household_id' => $otherHousehold->id,
        ]);

        $response = $this->postJson('/api/items', [
            'name' => 'Test Item',
            'category_id' => $otherCategory->id,
        ]);

        $response->assertUnprocessable();
    });
});

describe('items show', function () {
    it('shows item details', function () {
        $item = Item::factory()->create([
            'household_id' => $this->household->id,
        ]);

        $response = $this->getJson("/api/items/{$item->id}");

        $response->assertOk()
            ->assertJsonPath('item.id', $item->id)
            ->assertJsonPath('item.name', $item->name);
    });

    it('prevents viewing other household items', function () {
        $otherHousehold = Household::factory()->create();
        $item = Item::factory()->create([
            'household_id' => $otherHousehold->id,
        ]);

        $response = $this->getJson("/api/items/{$item->id}");

        $response->assertForbidden();
    });

    it('returns 404 for non-existent item', function () {
        $response = $this->getJson('/api/items/99999');

        $response->assertNotFound();
    });

    it('includes relationships', function () {
        $item = Item::factory()->create([
            'household_id' => $this->household->id,
            'category_id' => $this->category->id,
        ]);

        $response = $this->getJson("/api/items/{$item->id}");

        $response->assertOk()
            ->assertJsonStructure([
                'item' => [
                    'id',
                    'name',
                    'category',
                    'parts',
                    'maintenanceLogs',
                    'reminders',
                    'files',
                    'images',
                ],
            ]);
    });
});

describe('items update', function () {
    it('updates an item', function () {
        $item = Item::factory()->create([
            'household_id' => $this->household->id,
            'name' => 'Old Name',
        ]);

        $response = $this->putJson("/api/items/{$item->id}", [
            'name' => 'New Name',
        ]);

        $response->assertOk()
            ->assertJsonPath('item.name', 'New Name');
    });

    it('prevents updating other household items', function () {
        $otherHousehold = Household::factory()->create();
        $item = Item::factory()->create([
            'household_id' => $otherHousehold->id,
        ]);

        $response = $this->putJson("/api/items/{$item->id}", [
            'name' => 'Hacked Name',
        ]);

        $response->assertForbidden();
    });
});

describe('items destroy', function () {
    it('deletes an item', function () {
        $item = Item::factory()->create([
            'household_id' => $this->household->id,
        ]);

        $response = $this->deleteJson("/api/items/{$item->id}");

        $response->assertNoContent();
        expect(Item::find($item->id))->toBeNull();
    });

    it('prevents deleting other household items', function () {
        $otherHousehold = Household::factory()->create();
        $item = Item::factory()->create([
            'household_id' => $otherHousehold->id,
        ]);

        $response = $this->deleteJson("/api/items/{$item->id}");

        $response->assertForbidden();
        expect(Item::find($item->id))->not->toBeNull();
    });

    it('cascades deletion to related records', function () {
        $item = Item::factory()->create([
            'household_id' => $this->household->id,
        ]);
        
        // Create related records
        \App\Models\Part::factory()->create(['item_id' => $item->id]);
        \App\Models\MaintenanceLog::factory()->create(['item_id' => $item->id]);

        $this->deleteJson("/api/items/{$item->id}");

        expect(\App\Models\Part::where('item_id', $item->id)->count())->toBe(0);
        expect(\App\Models\MaintenanceLog::where('item_id', $item->id)->count())->toBe(0);
    });
});
