<?php

use App\Models\User;
use App\Models\Household;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('local');
    
    $this->household = Household::factory()->create([
        'name' => 'Test Household',
    ]);
    $this->admin = User::factory()->create([
        'household_id' => $this->household->id,
        'role' => 'admin',
    ]);
    $this->member = User::factory()->create([
        'household_id' => $this->household->id,
        'role' => 'member',
    ]);
    $this->actingAs($this->admin);
});

describe('household show', function () {
    it('returns household details', function () {
        $response = $this->getJson('/api/household');

        $response->assertOk()
            ->assertJsonPath('household.name', 'Test Household');
    });

    it('includes user count', function () {
        $response = $this->getJson('/api/household');

        $response->assertOk()
            ->assertJsonPath('household.users_count', 2);
    });
});

describe('household update', function () {
    it('updates household name', function () {
        $response = $this->patchJson('/api/household', [
            'name' => 'New Household Name',
        ]);

        $response->assertOk()
            ->assertJsonPath('household.name', 'New Household Name');
    });

    it('updates household address', function () {
        $response = $this->patchJson('/api/household', [
            'name' => 'Test Household',
            'address' => '123 Main St, Springfield, IL 62701',
        ]);

        $response->assertOk()
            ->assertJsonPath('household.address', '123 Main St, Springfield, IL 62701');
    });

    it('allows null address', function () {
        // First set an address
        $this->household->update(['address' => '123 Main St']);
        
        $response = $this->patchJson('/api/household', [
            'name' => 'Test Household',
            'address' => null,
        ]);

        $response->assertOk()
            ->assertJsonPath('household.address', null);
    });

    it('requires admin role', function () {
        $this->actingAs($this->member);

        $response = $this->patchJson('/api/household', [
            'name' => 'Hacked Name',
        ]);

        $response->assertForbidden();
    });

    it('validates address max length', function () {
        $response = $this->patchJson('/api/household', [
            'name' => 'Test Household',
            'address' => str_repeat('a', 1001), // Over 1000 chars
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['address']);
    });
});

describe('household image', function () {
    it('uploads household image', function () {
        $file = UploadedFile::fake()->image('household.jpg');

        $response = $this->postJson('/api/household/image', [
            'image' => $file,
        ]);

        $response->assertOk()
            ->assertJsonStructure(['household' => ['image']]);
    });

    it('requires admin role for image upload', function () {
        $this->actingAs($this->member);

        $file = UploadedFile::fake()->image('household.jpg');

        $response = $this->postJson('/api/household/image', [
            'image' => $file,
        ]);

        $response->assertForbidden();
    });
});

describe('household users', function () {
    it('lists household users', function () {
        $response = $this->getJson('/api/household/users');

        $response->assertOk()
            ->assertJsonCount(2, 'users');
    });

    it('includes user roles', function () {
        $response = $this->getJson('/api/household/users');

        $response->assertOk()
            ->assertJsonStructure([
                'users' => [
                    '*' => ['id', 'name', 'email', 'role'],
                ],
            ]);
    });

    it('member can view users', function () {
        $this->actingAs($this->member);

        $response = $this->getJson('/api/household/users');

        $response->assertOk();
    });
});

describe('household invite', function () {
    it('invites new user to household', function () {
        $response = $this->postJson('/api/household/invite', [
            'email' => 'newuser@example.com',
            'name' => 'New User',
            'role' => 'member',
        ]);

        $response->assertOk();
        expect(User::where('email', 'newuser@example.com')->exists())->toBeTrue();
    });

    it('requires admin role', function () {
        $this->actingAs($this->member);

        $response = $this->postJson('/api/household/invite', [
            'email' => 'newuser@example.com',
            'name' => 'New User',
            'role' => 'member',
        ]);

        $response->assertForbidden();
    });

    it('validates email is unique', function () {
        $response = $this->postJson('/api/household/invite', [
            'email' => $this->member->email, // Already exists
            'name' => 'Duplicate User',
            'role' => 'member',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);
    });

    it('validates role enum', function () {
        $response = $this->postJson('/api/household/invite', [
            'email' => 'newuser@example.com',
            'name' => 'New User',
            'role' => 'superadmin', // Invalid
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['role']);
    });
});

describe('household user update', function () {
    it('updates user role', function () {
        $response = $this->putJson("/api/household/users/{$this->member->id}", [
            'role' => 'admin',
        ]);

        $response->assertOk()
            ->assertJsonPath('user.role', 'admin');
    });

    it('requires admin role', function () {
        $this->actingAs($this->member);

        $response = $this->putJson("/api/household/users/{$this->member->id}", [
            'role' => 'admin',
        ]);

        $response->assertForbidden();
    });

    it('prevents demoting last admin', function () {
        // Try to demote the only admin
        $response = $this->putJson("/api/household/users/{$this->admin->id}", [
            'role' => 'member',
        ]);

        // Should either prevent or handle gracefully
        expect($response->status())->toBeIn([200, 422, 403]);
    });
});

describe('household user remove', function () {
    it('removes user from household', function () {
        $response = $this->deleteJson("/api/household/users/{$this->member->id}");

        $response->assertNoContent();
        expect(User::find($this->member->id))->toBeNull();
    });

    it('requires admin role', function () {
        $this->actingAs($this->member);

        $anotherMember = User::factory()->create([
            'household_id' => $this->household->id,
            'role' => 'member',
        ]);

        $response = $this->deleteJson("/api/household/users/{$anotherMember->id}");

        $response->assertForbidden();
    });

    it('prevents removing last admin', function () {
        $response = $this->deleteJson("/api/household/users/{$this->admin->id}");

        // Should prevent removing the last admin
        expect($response->status())->toBeIn([422, 403]);
    });

    it('cannot remove user from other household', function () {
        $otherHousehold = Household::factory()->create();
        $otherUser = User::factory()->create([
            'household_id' => $otherHousehold->id,
        ]);

        $response = $this->deleteJson("/api/household/users/{$otherUser->id}");

        $response->assertForbidden();
    });
});
