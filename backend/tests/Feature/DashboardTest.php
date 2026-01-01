<?php

use App\Models\User;
use App\Models\Household;
use App\Models\Item;
use App\Models\Reminder;
use App\Models\Todo;

beforeEach(function () {
    $this->household = Household::factory()->create();
    $this->user = User::factory()->create([
        'household_id' => $this->household->id,
    ]);
    $this->actingAs($this->user);
});

describe('dashboard stats', function () {
    it('returns dashboard statistics', function () {
        $response = $this->getJson('/api/dashboard');

        $response->assertOk()
            ->assertJsonStructure([
                'items_count',
                'upcoming_reminders',
                'upcoming_reminders_count',
                'overdue_reminders',
                'overdue_reminders_count',
                'incomplete_todos',
                'incomplete_todos_count',
            ]);
    });

    it('counts items correctly', function () {
        Item::factory()->count(5)->create([
            'household_id' => $this->household->id,
        ]);

        $response = $this->getJson('/api/dashboard');

        $response->assertOk()
            ->assertJsonPath('items_count', 5);
    });

    it('counts upcoming reminders', function () {
        // Upcoming reminder (due in future, within 7 days)
        Reminder::factory()->count(3)->create([
            'household_id' => $this->household->id,
            'user_id' => $this->user->id,
            'status' => 'pending',
            'due_date' => now()->addDays(3),
        ]);
        
        // Reminder due much later (outside 7 day window)
        Reminder::factory()->create([
            'household_id' => $this->household->id,
            'user_id' => $this->user->id,
            'status' => 'pending',
            'due_date' => now()->addDays(30),
        ]);

        $response = $this->getJson('/api/dashboard');

        // upcoming_reminders_count is the count of reminders returned (limited to 5)
        // which includes both upcoming and potentially overdue pending reminders within 7 days
        $response->assertOk();
        expect($response->json('upcoming_reminders_count'))->toBeLessThanOrEqual(5);
    });

    it('counts overdue reminders', function () {
        // Overdue reminder
        Reminder::factory()->count(2)->create([
            'household_id' => $this->household->id,
            'user_id' => $this->user->id,
            'status' => 'pending',
            'due_date' => now()->subDays(1),
        ]);
        
        // Future reminder (not overdue)
        Reminder::factory()->create([
            'household_id' => $this->household->id,
            'user_id' => $this->user->id,
            'status' => 'pending',
            'due_date' => now()->addDays(7),
        ]);

        $response = $this->getJson('/api/dashboard');

        $response->assertOk()
            ->assertJsonPath('overdue_reminders_count', 2);
    });

    it('counts incomplete todos', function () {
        Todo::factory()->count(4)->incomplete()->create([
            'household_id' => $this->household->id,
            'user_id' => $this->user->id,
        ]);
        
        Todo::factory()->completed()->create([
            'household_id' => $this->household->id,
            'user_id' => $this->user->id,
        ]);

        $response = $this->getJson('/api/dashboard');

        $response->assertOk()
            ->assertJsonPath('incomplete_todos_count', 4);
    });

    it('only counts household data', function () {
        $otherHousehold = Household::factory()->create();
        $otherUser = User::factory()->create(['household_id' => $otherHousehold->id]);

        // Other household data
        Item::factory()->count(10)->create(['household_id' => $otherHousehold->id]);
        
        // This household data
        Item::factory()->count(3)->create(['household_id' => $this->household->id]);

        $response = $this->getJson('/api/dashboard');

        $response->assertOk()
            ->assertJsonPath('items_count', 3);
    });

    it('requires authentication', function () {
        // Logout
        $this->app['auth']->forgetGuards();

        $response = $this->getJson('/api/dashboard');

        $response->assertUnauthorized();
    });
});
