<?php

use App\Models\User;
use App\Models\Household;
use App\Models\Item;
use App\Models\Reminder;
use App\Models\Todo;
use App\Models\MaintenanceLog;
use App\Models\Vendor;
use App\Models\Location;

beforeEach(function () {
    $this->household = Household::factory()->create();
    $this->user = User::factory()->create([
        'household_id' => $this->household->id,
    ]);
    $this->actingAs($this->user);
});

describe('report data endpoints', function () {
    it('returns items for household', function () {
        Item::factory()->count(3)->create([
            'household_id' => $this->household->id,
        ]);

        $response = $this->getJson('/api/reports/data/items');

        $response->assertOk()
            ->assertJsonStructure(['items' => [['id', 'name']]])
            ->assertJsonCount(3, 'items');
    });

    it('does not return items from other households', function () {
        $otherHousehold = Household::factory()->create();
        Item::factory()->create(['household_id' => $otherHousehold->id]);
        Item::factory()->create(['household_id' => $this->household->id]);

        $response = $this->getJson('/api/reports/data/items');

        $response->assertOk()
            ->assertJsonCount(1, 'items');
    });

    it('returns reminders for household', function () {
        Reminder::factory()->count(2)->create([
            'household_id' => $this->household->id,
        ]);

        $response = $this->getJson('/api/reports/data/reminders');

        $response->assertOk()
            ->assertJsonStructure(['reminders' => [['id', 'title']]])
            ->assertJsonCount(2, 'reminders');
    });

    it('returns todos for household', function () {
        Todo::factory()->count(2)->create([
            'household_id' => $this->household->id,
        ]);

        $response = $this->getJson('/api/reports/data/todos');

        $response->assertOk()
            ->assertJsonStructure(['todos' => [['id', 'title']]])
            ->assertJsonCount(2, 'todos');
    });

    it('returns maintenance logs for household', function () {
        $item = Item::factory()->create(['household_id' => $this->household->id]);
        MaintenanceLog::factory()->count(2)->create(['item_id' => $item->id]);

        $response = $this->getJson('/api/reports/data/maintenance-logs');

        $response->assertOk()
            ->assertJsonStructure(['maintenance_logs' => [['id', 'type']]])
            ->assertJsonCount(2, 'maintenance_logs');
    });

    it('returns vendors for household', function () {
        Vendor::factory()->count(2)->create([
            'household_id' => $this->household->id,
        ]);

        $response = $this->getJson('/api/reports/data/vendors');

        $response->assertOk()
            ->assertJsonStructure(['vendors' => [['id', 'name']]])
            ->assertJsonCount(2, 'vendors');
    });

    it('returns locations for household', function () {
        Location::factory()->count(2)->create([
            'household_id' => $this->household->id,
        ]);

        $response = $this->getJson('/api/reports/data/locations');

        $response->assertOk()
            ->assertJsonStructure(['locations' => [['id', 'name']]])
            ->assertJsonCount(2, 'locations');
    });

    it('returns dashboard data for household', function () {
        Item::factory()->count(5)->create(['household_id' => $this->household->id]);
        Reminder::factory()->count(3)->create(['household_id' => $this->household->id]);
        Todo::factory()->count(2)->create(['household_id' => $this->household->id]);

        $response = $this->getJson('/api/reports/data/dashboard');

        $response->assertOk()
            ->assertJsonStructure([
                'items_count',
                'upcoming_reminders',
                'overdue_reminders',
                'incomplete_todos_count',
            ])
            ->assertJson([
                'items_count' => 5,
            ]);
    });
});
