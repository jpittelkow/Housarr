<?php

use App\Models\User;
use App\Models\Household;
use App\Models\Vendor;

beforeEach(function () {
    $this->household = Household::factory()->create();
    $this->user = User::factory()->create([
        'household_id' => $this->household->id,
    ]);
    $this->actingAs($this->user);
});

describe('vendors index', function () {
    it('lists vendors for household', function () {
        Vendor::factory()->count(3)->create([
            'household_id' => $this->household->id,
        ]);

        $response = $this->getJson('/api/vendors');

        $response->assertOk()
            ->assertJsonCount(3, 'vendors');
    });

    it('does not show vendors from other households', function () {
        $otherHousehold = Household::factory()->create();
        Vendor::factory()->create(['household_id' => $otherHousehold->id]);
        Vendor::factory()->create(['household_id' => $this->household->id]);

        $response = $this->getJson('/api/vendors');

        $response->assertOk()
            ->assertJsonCount(1, 'vendors');
    });
});

describe('vendors store', function () {
    it('creates a vendor', function () {
        $response = $this->postJson('/api/vendors', [
            'name' => 'Test Vendor',
            'phone' => '555-1234',
            'email' => 'vendor@example.com',
        ]);

        $response->assertCreated()
            ->assertJsonPath('vendor.name', 'Test Vendor')
            ->assertJsonPath('vendor.phone', '555-1234');

        expect(Vendor::where('name', 'Test Vendor')->exists())->toBeTrue();
    });

    it('assigns vendor to user household', function () {
        $response = $this->postJson('/api/vendors', [
            'name' => 'Test Vendor',
        ]);

        $response->assertCreated();
        
        $vendor = Vendor::where('name', 'Test Vendor')->first();
        expect($vendor->household_id)->toBe($this->household->id);
    });

    it('validates required fields', function () {
        $response = $this->postJson('/api/vendors', []);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['name']);
    });

    it('validates email format', function () {
        $response = $this->postJson('/api/vendors', [
            'name' => 'Test Vendor',
            'email' => 'invalid-email',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);
    });
});

describe('vendors show', function () {
    it('shows vendor details', function () {
        $vendor = Vendor::factory()->create([
            'household_id' => $this->household->id,
        ]);

        $response = $this->getJson("/api/vendors/{$vendor->id}");

        $response->assertOk()
            ->assertJsonPath('vendor.id', $vendor->id);
    });

    it('prevents viewing other household vendors', function () {
        $otherHousehold = Household::factory()->create();
        $vendor = Vendor::factory()->create([
            'household_id' => $otherHousehold->id,
        ]);

        $response = $this->getJson("/api/vendors/{$vendor->id}");

        $response->assertForbidden();
    });
});

describe('vendors update', function () {
    it('updates a vendor', function () {
        $vendor = Vendor::factory()->create([
            'household_id' => $this->household->id,
            'name' => 'Old Name',
        ]);

        $response = $this->putJson("/api/vendors/{$vendor->id}", [
            'name' => 'New Name',
        ]);

        $response->assertOk()
            ->assertJsonPath('vendor.name', 'New Name');
    });

    it('prevents updating other household vendors', function () {
        $otherHousehold = Household::factory()->create();
        $vendor = Vendor::factory()->create([
            'household_id' => $otherHousehold->id,
        ]);

        $response = $this->putJson("/api/vendors/{$vendor->id}", [
            'name' => 'Hacked',
        ]);

        $response->assertForbidden();
    });
});

describe('vendors destroy', function () {
    it('deletes a vendor', function () {
        $vendor = Vendor::factory()->create([
            'household_id' => $this->household->id,
        ]);

        $response = $this->deleteJson("/api/vendors/{$vendor->id}");

        $response->assertOk()
            ->assertJsonPath('message', 'Vendor deleted successfully');
        expect(Vendor::find($vendor->id))->toBeNull();
    });

    it('prevents deleting other household vendors', function () {
        $otherHousehold = Household::factory()->create();
        $vendor = Vendor::factory()->create([
            'household_id' => $otherHousehold->id,
        ]);

        $response = $this->deleteJson("/api/vendors/{$vendor->id}");

        $response->assertForbidden();
    });
});

describe('vendors search nearby', function () {
    it('requires household address', function () {
        // Ensure household has no address
        $this->household->update(['address' => null]);

        $response = $this->postJson('/api/vendors/search-nearby', [
            'query' => 'plumber',
        ]);

        $response->assertUnprocessable()
            ->assertJsonPath('success', false)
            ->assertJsonPath('error', 'Please set your household address in Settings before searching for nearby vendors.');
    });

    it('validates query is required', function () {
        $this->household->update(['address' => '123 Main St, City, State 12345']);

        $response = $this->postJson('/api/vendors/search-nearby', []);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['query']);
    });

    it('validates query minimum length', function () {
        $this->household->update(['address' => '123 Main St, City, State 12345']);

        $response = $this->postJson('/api/vendors/search-nearby', [
            'query' => 'a',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['query']);
    });
});
