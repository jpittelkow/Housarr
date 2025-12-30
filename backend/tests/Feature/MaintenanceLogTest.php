<?php

use App\Models\User;
use App\Models\Household;
use App\Models\Item;
use App\Models\MaintenanceLog;
use App\Models\Vendor;
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

describe('maintenance logs index', function () {
    it('lists maintenance logs for an item', function () {
        MaintenanceLog::factory()->count(3)->create([
            'item_id' => $this->item->id,
        ]);

        $response = $this->getJson("/api/items/{$this->item->id}/maintenance-logs");

        $response->assertOk()
            ->assertJsonCount(3, 'logs');
    });

    it('does not show logs from other household items', function () {
        $otherHousehold = Household::factory()->create();
        $otherItem = Item::factory()->create([
            'household_id' => $otherHousehold->id,
        ]);
        MaintenanceLog::factory()->create(['item_id' => $otherItem->id]);

        $response = $this->getJson("/api/items/{$otherItem->id}/maintenance-logs");

        $response->assertForbidden();
    });

    it('orders by date descending', function () {
        MaintenanceLog::factory()->create([
            'item_id' => $this->item->id,
            'date' => '2024-01-01',
        ]);
        MaintenanceLog::factory()->create([
            'item_id' => $this->item->id,
            'date' => '2024-06-01',
        ]);

        $response = $this->getJson("/api/items/{$this->item->id}/maintenance-logs");

        $response->assertOk();
        $dates = collect($response->json('logs'))->pluck('date');
        expect($dates->first())->toContain('2024-06');
    });
});

describe('maintenance logs store', function () {
    it('creates a maintenance log', function () {
        $response = $this->postJson("/api/items/{$this->item->id}/maintenance-logs", [
            'type' => 'service',
            'date' => '2024-01-15',
            'notes' => 'Annual service completed',
            'cost' => 150.00,
        ]);

        $response->assertCreated()
            ->assertJsonPath('log.type', 'service')
            ->assertJsonPath('log.cost', 150.00);

        expect(MaintenanceLog::where('notes', 'Annual service completed')->exists())->toBeTrue();
    });

    it('validates required fields', function () {
        $response = $this->postJson("/api/items/{$this->item->id}/maintenance-logs", []);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['type', 'date']);
    });

    it('validates type enum', function () {
        $response = $this->postJson("/api/items/{$this->item->id}/maintenance-logs", [
            'type' => 'invalid',
            'date' => '2024-01-15',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['type']);
    });

    it('can link to vendor', function () {
        $vendor = Vendor::factory()->create([
            'household_id' => $this->household->id,
        ]);

        $response = $this->postJson("/api/items/{$this->item->id}/maintenance-logs", [
            'type' => 'service',
            'date' => '2024-01-15',
            'vendor_id' => $vendor->id,
        ]);

        $response->assertCreated()
            ->assertJsonPath('log.vendor_id', $vendor->id);
    });

    it('can link to parts', function () {
        $part1 = Part::factory()->create(['item_id' => $this->item->id]);
        $part2 = Part::factory()->create(['item_id' => $this->item->id]);

        $response = $this->postJson("/api/items/{$this->item->id}/maintenance-logs", [
            'type' => 'replacement',
            'date' => '2024-01-15',
            'part_ids' => [$part1->id, $part2->id],
        ]);

        $response->assertCreated();
        
        $log = MaintenanceLog::latest()->first();
        expect($log->parts()->count())->toBe(2);
    });

    it('prevents adding to other household items', function () {
        $otherHousehold = Household::factory()->create();
        $otherItem = Item::factory()->create([
            'household_id' => $otherHousehold->id,
        ]);

        $response = $this->postJson("/api/items/{$otherItem->id}/maintenance-logs", [
            'type' => 'service',
            'date' => '2024-01-15',
        ]);

        $response->assertForbidden();
    });
});

describe('maintenance logs update', function () {
    it('updates a maintenance log', function () {
        $log = MaintenanceLog::factory()->create([
            'item_id' => $this->item->id,
            'notes' => 'Old notes',
        ]);

        $response = $this->putJson("/api/maintenance-logs/{$log->id}", [
            'notes' => 'New notes',
        ]);

        $response->assertOk()
            ->assertJsonPath('log.notes', 'New notes');
    });

    it('prevents updating logs on other household items', function () {
        $otherHousehold = Household::factory()->create();
        $otherItem = Item::factory()->create([
            'household_id' => $otherHousehold->id,
        ]);
        $log = MaintenanceLog::factory()->create([
            'item_id' => $otherItem->id,
        ]);

        $response = $this->putJson("/api/maintenance-logs/{$log->id}", [
            'notes' => 'Hacked',
        ]);

        $response->assertForbidden();
    });
});

describe('maintenance logs destroy', function () {
    it('deletes a maintenance log', function () {
        $log = MaintenanceLog::factory()->create([
            'item_id' => $this->item->id,
        ]);

        $response = $this->deleteJson("/api/maintenance-logs/{$log->id}");

        $response->assertNoContent();
        expect(MaintenanceLog::find($log->id))->toBeNull();
    });

    it('prevents deleting logs on other household items', function () {
        $otherHousehold = Household::factory()->create();
        $otherItem = Item::factory()->create([
            'household_id' => $otherHousehold->id,
        ]);
        $log = MaintenanceLog::factory()->create([
            'item_id' => $otherItem->id,
        ]);

        $response = $this->deleteJson("/api/maintenance-logs/{$log->id}");

        $response->assertForbidden();
    });
});
