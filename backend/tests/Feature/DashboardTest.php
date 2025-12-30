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
                'stats' => [
                    'total_items',
                    'upcoming_reminders',
                    'overdue_reminders',
                    'open_todos',
                ],
            ]);
    });

    it('counts items correctly', function () {
        Item::factory()->count(5)->create([
            'household_id' => $this->household->id,
        ]);

        $response = $this->getJson('/api/dashboard');

        $response->assertOk()
            ->assertJsonPath('stats.total_items', 5);
    });

    it('counts upcoming reminders', function () {
        // Upcoming reminder (due in future)
        Reminder::factory()->count(3)->create([
            'household_id' => $this->household->id,
            'user_id' => $this->user->id,
            'status' => 'pending',
            'due_date' => now()->addDays(3),
        ]);
        
        // Past reminder (overdue)
        Reminder::factory()->create([
            'household_id' => $this->household->id,
            'user_id' => $this->user->id,
            'status' => 'pending',
            'due_date' => now()->subDays(1),
        ]);

        $response = $this->getJson('/api/dashboard');

        $response->assertOk()
            ->assertJsonPath('stats.upcoming_reminders', 3);
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
            ->assertJsonPath('stats.overdue_reminders', 2);
    });

    it('counts open todos', function () {
        Todo::factory()->count(4)->create([
            'household_id' => $this->household->id,
            'user_id' => $this->user->id,
            'is_completed' => false,
        ]);
        
        Todo::factory()->create([
            'household_id' => $this->household->id,
            'user_id' => $this->user->id,
            'is_completed' => true,
        ]);

        $response = $this->getJson('/api/dashboard');

        $response->assertOk()
            ->assertJsonPath('stats.open_todos', 4);
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
            ->assertJsonPath('stats.total_items', 3);
    });

    it('requires authentication', function () {
        // Logout
        $this->app['auth']->forgetGuards();

        $response = $this->getJson('/api/dashboard');

        $response->assertUnauthorized();
    });
});
