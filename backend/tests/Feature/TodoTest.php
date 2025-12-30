<?php

use App\Models\User;
use App\Models\Household;
use App\Models\Todo;
use App\Models\Item;

beforeEach(function () {
    $this->household = Household::factory()->create();
    $this->user = User::factory()->create([
        'household_id' => $this->household->id,
    ]);
    $this->actingAs($this->user);
});

describe('todos index', function () {
    it('lists todos for household', function () {
        Todo::factory()->count(3)->create([
            'household_id' => $this->household->id,
        ]);

        $response = $this->getJson('/api/todos');

        $response->assertOk()
            ->assertJsonCount(3, 'todos');
    });

    it('does not show todos from other households', function () {
        $otherHousehold = Household::factory()->create();
        Todo::factory()->create(['household_id' => $otherHousehold->id]);
        Todo::factory()->create(['household_id' => $this->household->id]);

        $response = $this->getJson('/api/todos');

        $response->assertOk()
            ->assertJsonCount(1, 'todos');
    });

    it('filters by status', function () {
        Todo::factory()->count(2)->create([
            'household_id' => $this->household->id,
            'completed' => false,
        ]);
        Todo::factory()->create([
            'household_id' => $this->household->id,
            'completed' => true,
        ]);

        $response = $this->getJson('/api/todos?completed=false');

        $response->assertOk()
            ->assertJsonCount(2, 'todos');
    });
});

describe('todos store', function () {
    it('creates a todo', function () {
        $response = $this->postJson('/api/todos', [
            'title' => 'Test Todo',
            'priority' => 'high',
        ]);

        $response->assertCreated()
            ->assertJsonPath('todo.title', 'Test Todo')
            ->assertJsonPath('todo.priority', 'high');

        expect(Todo::where('title', 'Test Todo')->exists())->toBeTrue();
    });

    it('assigns todo to user household', function () {
        $response = $this->postJson('/api/todos', [
            'title' => 'Test Todo',
        ]);

        $response->assertCreated();
        
        $todo = Todo::where('title', 'Test Todo')->first();
        expect($todo->household_id)->toBe($this->household->id);
    });

    it('validates required fields', function () {
        $response = $this->postJson('/api/todos', []);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['title']);
    });

    it('can link todo to item', function () {
        $item = Item::factory()->create([
            'household_id' => $this->household->id,
        ]);

        $response = $this->postJson('/api/todos', [
            'title' => 'Fix item',
            'item_id' => $item->id,
        ]);

        $response->assertCreated()
            ->assertJsonPath('todo.item_id', $item->id);
    });
});

describe('todos update', function () {
    it('updates a todo', function () {
        $todo = Todo::factory()->create([
            'household_id' => $this->household->id,
            'title' => 'Old Title',
        ]);

        $response = $this->putJson("/api/todos/{$todo->id}", [
            'title' => 'New Title',
        ]);

        $response->assertOk()
            ->assertJsonPath('todo.title', 'New Title');
    });

    it('prevents updating other household todos', function () {
        $otherHousehold = Household::factory()->create();
        $todo = Todo::factory()->create([
            'household_id' => $otherHousehold->id,
        ]);

        $response = $this->putJson("/api/todos/{$todo->id}", [
            'title' => 'Hacked',
        ]);

        $response->assertForbidden();
    });

    it('toggles completion status', function () {
        $todo = Todo::factory()->create([
            'household_id' => $this->household->id,
            'completed' => false,
        ]);

        $response = $this->putJson("/api/todos/{$todo->id}", [
            'completed' => true,
        ]);

        $response->assertOk()
            ->assertJsonPath('todo.completed', true);
    });
});

describe('todos destroy', function () {
    it('deletes a todo', function () {
        $todo = Todo::factory()->create([
            'household_id' => $this->household->id,
        ]);

        $response = $this->deleteJson("/api/todos/{$todo->id}");

        $response->assertNoContent();
        expect(Todo::find($todo->id))->toBeNull();
    });

    it('prevents deleting other household todos', function () {
        $otherHousehold = Household::factory()->create();
        $todo = Todo::factory()->create([
            'household_id' => $otherHousehold->id,
        ]);

        $response = $this->deleteJson("/api/todos/{$todo->id}");

        $response->assertForbidden();
    });
});
