<?php

use App\Models\User;
use App\Models\Household;

describe('authentication', function () {
    describe('login', function () {
        it('logs in with valid credentials', function () {
            $household = Household::factory()->create();
            $user = User::factory()->create([
                'email' => 'test@example.com',
                'password' => bcrypt('password123'),
                'household_id' => $household->id,
            ]);

            $response = $this->postJson('/api/auth/login', [
                'email' => 'test@example.com',
                'password' => 'password123',
            ]);

            $response->assertOk()
                ->assertJsonStructure(['user', 'token']);
        });

        it('rejects invalid credentials', function () {
            $household = Household::factory()->create();
            User::factory()->create([
                'email' => 'test@example.com',
                'password' => bcrypt('password123'),
                'household_id' => $household->id,
            ]);

            $response = $this->postJson('/api/auth/login', [
                'email' => 'test@example.com',
                'password' => 'wrongpassword',
            ]);

            $response->assertUnauthorized();
        });

        it('validates required fields', function () {
            $response = $this->postJson('/api/auth/login', []);

            $response->assertUnprocessable()
                ->assertJsonValidationErrors(['email', 'password']);
        });

        it('validates email format', function () {
            $response = $this->postJson('/api/auth/login', [
                'email' => 'not-an-email',
                'password' => 'password123',
            ]);

            $response->assertUnprocessable()
                ->assertJsonValidationErrors(['email']);
        });
    });

    describe('registration', function () {
        it('registers a new user with new household', function () {
            $response = $this->postJson('/api/auth/register', [
                'name' => 'Test User',
                'email' => 'newuser@example.com',
                'password' => 'password123',
                'password_confirmation' => 'password123',
                'household_name' => 'Test Household',
            ]);

            $response->assertCreated()
                ->assertJsonStructure(['user', 'token']);

            expect(User::where('email', 'newuser@example.com')->exists())->toBeTrue();
            expect(Household::where('name', 'Test Household')->exists())->toBeTrue();
        });

        it('validates required fields', function () {
            $response = $this->postJson('/api/auth/register', []);

            $response->assertUnprocessable()
                ->assertJsonValidationErrors(['name', 'email', 'password', 'household_name']);
        });

        it('prevents duplicate email registration', function () {
            $household = Household::factory()->create();
            User::factory()->create([
                'email' => 'existing@example.com',
                'household_id' => $household->id,
            ]);

            $response = $this->postJson('/api/auth/register', [
                'name' => 'Test User',
                'email' => 'existing@example.com',
                'password' => 'password123',
                'password_confirmation' => 'password123',
                'household_name' => 'Test Household',
            ]);

            $response->assertUnprocessable()
                ->assertJsonValidationErrors(['email']);
        });

        it('requires password confirmation', function () {
            $response = $this->postJson('/api/auth/register', [
                'name' => 'Test User',
                'email' => 'test@example.com',
                'password' => 'password123',
                'password_confirmation' => 'different',
                'household_name' => 'Test',
            ]);

            $response->assertUnprocessable()
                ->assertJsonValidationErrors(['password']);
        });
    });

    describe('logout', function () {
        it('logs out authenticated user', function () {
            $user = loginAsUser();

            $response = $this->postJson('/api/auth/logout');

            $response->assertOk();
        });

        it('requires authentication', function () {
            $response = $this->postJson('/api/auth/logout');

            $response->assertUnauthorized();
        });
    });

    describe('get user', function () {
        it('returns authenticated user', function () {
            $user = loginAsUser();

            $response = $this->getJson('/api/auth/user');

            $response->assertOk()
                ->assertJsonPath('user.id', $user->id)
                ->assertJsonPath('user.email', $user->email);
        });

        it('requires authentication', function () {
            $response = $this->getJson('/api/auth/user');

            $response->assertUnauthorized();
        });

        it('includes household information', function () {
            $user = loginAsUser();

            $response = $this->getJson('/api/auth/user');

            $response->assertOk()
                ->assertJsonStructure([
                    'user' => [
                        'id',
                        'name',
                        'email',
                        'household_id',
                        'household' => ['id', 'name'],
                    ],
                ]);
        });
    });
});
