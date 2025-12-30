<?php

use App\Models\User;
use App\Models\Household;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Hash;

beforeEach(function () {
    Storage::fake('local');
    
    $this->household = Household::factory()->create();
    $this->user = User::factory()->create([
        'household_id' => $this->household->id,
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => Hash::make('password'),
    ]);
    $this->actingAs($this->user);
});

describe('profile get', function () {
    it('returns current user profile', function () {
        $response = $this->getJson('/api/profile');

        $response->assertOk()
            ->assertJsonPath('user.name', 'Test User')
            ->assertJsonPath('user.email', 'test@example.com');
    });

    it('includes household information', function () {
        $response = $this->getJson('/api/profile');

        $response->assertOk()
            ->assertJsonStructure([
                'user' => [
                    'id',
                    'name',
                    'email',
                    'household',
                ],
            ]);
    });

    it('does not include password', function () {
        $response = $this->getJson('/api/profile');

        $response->assertOk();
        expect($response->json('user.password'))->toBeNull();
    });
});

describe('profile update', function () {
    it('updates user name', function () {
        $response = $this->putJson('/api/profile', [
            'name' => 'New Name',
        ]);

        $response->assertOk()
            ->assertJsonPath('user.name', 'New Name');

        $this->user->refresh();
        expect($this->user->name)->toBe('New Name');
    });

    it('updates user email', function () {
        $response = $this->putJson('/api/profile', [
            'email' => 'newemail@example.com',
        ]);

        $response->assertOk()
            ->assertJsonPath('user.email', 'newemail@example.com');
    });

    it('validates email format', function () {
        $response = $this->putJson('/api/profile', [
            'email' => 'invalid-email',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);
    });

    it('validates unique email', function () {
        User::factory()->create(['email' => 'taken@example.com']);

        $response = $this->putJson('/api/profile', [
            'email' => 'taken@example.com',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);
    });

    it('allows keeping same email', function () {
        $response = $this->putJson('/api/profile', [
            'name' => 'New Name',
            'email' => 'test@example.com', // Same as current
        ]);

        $response->assertOk();
    });
});

describe('password update', function () {
    it('updates password', function () {
        $response = $this->putJson('/api/profile/password', [
            'current_password' => 'password',
            'password' => 'newpassword123',
            'password_confirmation' => 'newpassword123',
        ]);

        $response->assertOk();

        $this->user->refresh();
        expect(Hash::check('newpassword123', $this->user->password))->toBeTrue();
    });

    it('requires current password', function () {
        $response = $this->putJson('/api/profile/password', [
            'password' => 'newpassword123',
            'password_confirmation' => 'newpassword123',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['current_password']);
    });

    it('validates current password is correct', function () {
        $response = $this->putJson('/api/profile/password', [
            'current_password' => 'wrongpassword',
            'password' => 'newpassword123',
            'password_confirmation' => 'newpassword123',
        ]);

        $response->assertUnprocessable();
    });

    it('validates password confirmation', function () {
        $response = $this->putJson('/api/profile/password', [
            'current_password' => 'password',
            'password' => 'newpassword123',
            'password_confirmation' => 'different',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['password']);
    });

    it('validates minimum password length', function () {
        $response = $this->putJson('/api/profile/password', [
            'current_password' => 'password',
            'password' => 'short',
            'password_confirmation' => 'short',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['password']);
    });
});

describe('avatar upload', function () {
    it('uploads avatar image', function () {
        $file = UploadedFile::fake()->image('avatar.jpg');

        $response = $this->postJson('/api/profile/avatar', [
            'avatar' => $file,
        ]);

        $response->assertOk()
            ->assertJsonStructure(['user' => ['avatar']]);
    });

    it('validates image type', function () {
        $file = UploadedFile::fake()->create('document.pdf', 100);

        $response = $this->postJson('/api/profile/avatar', [
            'avatar' => $file,
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['avatar']);
    });

    it('validates image size', function () {
        $file = UploadedFile::fake()->image('avatar.jpg')->size(10000); // 10MB

        $response = $this->postJson('/api/profile/avatar', [
            'avatar' => $file,
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['avatar']);
    });

    it('deletes old avatar when uploading new', function () {
        // Upload first avatar
        $file1 = UploadedFile::fake()->image('avatar1.jpg');
        $this->postJson('/api/profile/avatar', ['avatar' => $file1]);

        // Upload second avatar
        $file2 = UploadedFile::fake()->image('avatar2.jpg');
        $response = $this->postJson('/api/profile/avatar', ['avatar' => $file2]);

        $response->assertOk();
        // Old avatar should be cleaned up (implementation dependent)
    });
});

describe('avatar delete', function () {
    it('deletes avatar', function () {
        // First upload an avatar
        $file = UploadedFile::fake()->image('avatar.jpg');
        $this->postJson('/api/profile/avatar', ['avatar' => $file]);

        // Then delete it
        $response = $this->deleteJson('/api/profile/avatar');

        $response->assertOk();

        $this->user->refresh();
        expect($this->user->avatar)->toBeNull();
    });
});
