<?php

use App\Models\User;
use App\Models\Household;
use App\Models\Reminder;
use App\Models\Item;
use Carbon\Carbon;

beforeEach(function () {
    $this->household = Household::factory()->create();
    $this->user = User::factory()->create([
        'household_id' => $this->household->id,
    ]);
    $this->actingAs($this->user);
});

describe('reminders index', function () {
    it('lists reminders for household', function () {
        Reminder::factory()->count(3)->create([
            'household_id' => $this->household->id,
            'user_id' => $this->user->id,
        ]);

        $response = $this->getJson('/api/reminders');

        $response->assertOk()
            ->assertJsonCount(3, 'reminders');
    });

    it('does not show reminders from other households', function () {
        $otherHousehold = Household::factory()->create();
        $otherUser = User::factory()->create(['household_id' => $otherHousehold->id]);
        
        Reminder::factory()->create([
            'household_id' => $otherHousehold->id,
            'user_id' => $otherUser->id,
        ]);
        Reminder::factory()->create([
            'household_id' => $this->household->id,
            'user_id' => $this->user->id,
        ]);

        $response = $this->getJson('/api/reminders');

        $response->assertOk()
            ->assertJsonCount(1, 'reminders');
    });

    it('filters by status', function () {
        Reminder::factory()->create([
            'household_id' => $this->household->id,
            'user_id' => $this->user->id,
            'status' => 'pending',
        ]);
        Reminder::factory()->create([
            'household_id' => $this->household->id,
            'user_id' => $this->user->id,
            'status' => 'completed',
        ]);

        $response = $this->getJson('/api/reminders?status=pending');

        $response->assertOk()
            ->assertJsonCount(1, 'reminders');
    });
});

describe('reminders store', function () {
    it('creates a reminder', function () {
        $response = $this->postJson('/api/reminders', [
            'title' => 'Test Reminder',
            'description' => 'Test description',
            'due_date' => now()->addDays(7)->toDateString(),
        ]);

        $response->assertCreated()
            ->assertJsonPath('reminder.title', 'Test Reminder');

        expect(Reminder::where('title', 'Test Reminder')->exists())->toBeTrue();
    });

    it('assigns reminder to user and household', function () {
        $response = $this->postJson('/api/reminders', [
            'title' => 'Test Reminder',
            'due_date' => now()->addDays(7)->toDateString(),
        ]);

        $response->assertCreated();
        
        $reminder = Reminder::where('title', 'Test Reminder')->first();
        expect($reminder->household_id)->toBe($this->household->id);
        expect($reminder->user_id)->toBe($this->user->id);
    });

    it('can link to an item', function () {
        $item = Item::factory()->create(['household_id' => $this->household->id]);

        $response = $this->postJson('/api/reminders', [
            'title' => 'Item Reminder',
            'due_date' => now()->addDays(7)->toDateString(),
            'item_id' => $item->id,
        ]);

        $response->assertCreated()
            ->assertJsonPath('reminder.item_id', $item->id);
    });

    it('validates required fields', function () {
        $response = $this->postJson('/api/reminders', []);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['title', 'due_date']);
    });

    it('validates due_date is a valid date', function () {
        $response = $this->postJson('/api/reminders', [
            'title' => 'Test',
            'due_date' => 'not-a-date',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['due_date']);
    });
});

describe('reminders complete', function () {
    it('marks reminder as complete', function () {
        $reminder = Reminder::factory()->create([
            'household_id' => $this->household->id,
            'user_id' => $this->user->id,
            'status' => 'pending',
        ]);

        $response = $this->postJson("/api/reminders/{$reminder->id}/complete");

        $response->assertOk()
            ->assertJsonPath('reminder.status', 'completed');

        $reminder->refresh();
        expect($reminder->status)->toBe('completed');
    });

    it('creates next reminder for recurring reminders', function () {
        $reminder = Reminder::factory()->create([
            'household_id' => $this->household->id,
            'user_id' => $this->user->id,
            'status' => 'pending',
            'repeat_interval_days' => 30,
            'due_date' => now()->toDateString(),
        ]);

        $response = $this->postJson("/api/reminders/{$reminder->id}/complete");

        $response->assertOk();

        // Should have created a new reminder
        $newReminder = Reminder::where('id', '!=', $reminder->id)
            ->where('title', $reminder->title)
            ->first();
        
        expect($newReminder)->not->toBeNull();
        expect($newReminder->due_date->format('Y-m-d'))
            ->toBe(now()->addDays(30)->format('Y-m-d'));
    });
});

describe('reminders snooze', function () {
    it('snoozes reminder by specified days', function () {
        $originalDate = now();
        $reminder = Reminder::factory()->create([
            'household_id' => $this->household->id,
            'user_id' => $this->user->id,
            'due_date' => $originalDate->toDateString(),
        ]);

        $response = $this->postJson("/api/reminders/{$reminder->id}/snooze", [
            'days' => 3,
        ]);

        $response->assertOk();

        $reminder->refresh();
        expect($reminder->due_date->format('Y-m-d'))
            ->toBe($originalDate->addDays(3)->format('Y-m-d'));
    });

    it('validates days is required', function () {
        $reminder = Reminder::factory()->create([
            'household_id' => $this->household->id,
            'user_id' => $this->user->id,
        ]);

        $response = $this->postJson("/api/reminders/{$reminder->id}/snooze", []);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['days']);
    });
});

describe('reminders authorization', function () {
    it('prevents completing other household reminders', function () {
        $otherHousehold = Household::factory()->create();
        $otherUser = User::factory()->create(['household_id' => $otherHousehold->id]);
        $reminder = Reminder::factory()->create([
            'household_id' => $otherHousehold->id,
            'user_id' => $otherUser->id,
        ]);

        $response = $this->postJson("/api/reminders/{$reminder->id}/complete");

        $response->assertForbidden();
    });
});
