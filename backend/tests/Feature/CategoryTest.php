<?php

use App\Models\User;
use App\Models\Household;
use App\Models\Category;

beforeEach(function () {
    $this->household = Household::factory()->create();
    $this->user = User::factory()->create([
        'household_id' => $this->household->id,
    ]);
    $this->actingAs($this->user);
});

describe('categories index', function () {
    it('lists categories for household', function () {
        Category::factory()->count(3)->create([
            'household_id' => $this->household->id,
        ]);

        $response = $this->getJson('/api/categories');

        $response->assertOk()
            ->assertJsonCount(3, 'categories');
    });

    it('does not show categories from other households', function () {
        $otherHousehold = Household::factory()->create();
        Category::factory()->create(['household_id' => $otherHousehold->id]);
        Category::factory()->create(['household_id' => $this->household->id]);

        $response = $this->getJson('/api/categories');

        $response->assertOk()
            ->assertJsonCount(1, 'categories');
    });

    it('includes item count', function () {
        $category = Category::factory()->create([
            'household_id' => $this->household->id,
        ]);
        \App\Models\Item::factory()->count(2)->create([
            'household_id' => $this->household->id,
            'category_id' => $category->id,
        ]);

        $response = $this->getJson('/api/categories');

        $response->assertOk()
            ->assertJsonPath('categories.0.items_count', 2);
    });
});

describe('categories store', function () {
    it('creates a category', function () {
        $response = $this->postJson('/api/categories', [
            'name' => 'Appliances',
            'color' => '#FF5733',
            'icon' => 'package',
        ]);

        $response->assertCreated()
            ->assertJsonPath('category.name', 'Appliances')
            ->assertJsonPath('category.color', '#FF5733');

        expect(Category::where('name', 'Appliances')->exists())->toBeTrue();
    });

    it('assigns category to user household', function () {
        $response = $this->postJson('/api/categories', [
            'name' => 'Electronics',
        ]);

        $response->assertCreated();
        
        $category = Category::where('name', 'Electronics')->first();
        expect($category->household_id)->toBe($this->household->id);
    });

    it('validates required fields', function () {
        $response = $this->postJson('/api/categories', []);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['name']);
    });

    it('validates unique name per household', function () {
        Category::factory()->create([
            'household_id' => $this->household->id,
            'name' => 'Appliances',
        ]);

        $response = $this->postJson('/api/categories', [
            'name' => 'Appliances',
        ]);

        $response->assertUnprocessable();
    });
});

describe('categories update', function () {
    it('updates a category', function () {
        $category = Category::factory()->create([
            'household_id' => $this->household->id,
            'name' => 'Old Name',
        ]);

        $response = $this->putJson("/api/categories/{$category->id}", [
            'name' => 'New Name',
        ]);

        $response->assertOk()
            ->assertJsonPath('category.name', 'New Name');
    });

    it('prevents updating other household categories', function () {
        $otherHousehold = Household::factory()->create();
        $category = Category::factory()->create([
            'household_id' => $otherHousehold->id,
        ]);

        $response = $this->putJson("/api/categories/{$category->id}", [
            'name' => 'Hacked',
        ]);

        $response->assertForbidden();
    });
});

describe('categories destroy', function () {
    it('deletes a category', function () {
        $category = Category::factory()->create([
            'household_id' => $this->household->id,
        ]);

        $response = $this->deleteJson("/api/categories/{$category->id}");

        $response->assertNoContent();
        expect(Category::find($category->id))->toBeNull();
    });

    it('prevents deleting other household categories', function () {
        $otherHousehold = Household::factory()->create();
        $category = Category::factory()->create([
            'household_id' => $otherHousehold->id,
        ]);

        $response = $this->deleteJson("/api/categories/{$category->id}");

        $response->assertForbidden();
    });

    it('nullifies category_id on items when deleted', function () {
        $category = Category::factory()->create([
            'household_id' => $this->household->id,
        ]);
        $item = \App\Models\Item::factory()->create([
            'household_id' => $this->household->id,
            'category_id' => $category->id,
        ]);

        $this->deleteJson("/api/categories/{$category->id}");

        $item->refresh();
        expect($item->category_id)->toBeNull();
    });
});
