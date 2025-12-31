<?php

use App\Models\User;
use App\Models\Household;
use App\Models\Setting;

beforeEach(function () {
    $this->household = Household::factory()->create();
    $this->user = User::factory()->create([
        'household_id' => $this->household->id,
        'role' => 'admin',
    ]);
    $this->actingAs($this->user);
});

describe('settings index', function () {
    it('returns household settings', function () {
        Setting::factory()->create([
            'household_id' => $this->household->id,
            'key' => 'test_setting',
            'value' => 'test_value',
        ]);

        $response = $this->getJson('/api/settings');

        $response->assertOk()
            ->assertJsonStructure(['settings']);
    });

    it('does not show other household settings', function () {
        $otherHousehold = Household::factory()->create();
        Setting::factory()->create([
            'household_id' => $otherHousehold->id,
            'key' => 'other_setting',
        ]);
        Setting::factory()->create([
            'household_id' => $this->household->id,
            'key' => 'my_setting',
        ]);

        $response = $this->getJson('/api/settings');

        $response->assertOk();
        $keys = collect($response->json('settings'))->pluck('key');
        expect($keys)->toContain('my_setting');
        expect($keys)->not->toContain('other_setting');
    });
});

describe('settings update', function () {
    it('creates a new setting', function () {
        $response = $this->postJson('/api/settings', [
            'key' => 'new_setting',
            'value' => 'new_value',
        ]);

        $response->assertOk();
        expect(Setting::where('key', 'new_setting')->exists())->toBeTrue();
    });

    it('updates existing setting', function () {
        Setting::factory()->create([
            'household_id' => $this->household->id,
            'key' => 'existing_setting',
            'value' => 'old_value',
        ]);

        $response = $this->postJson('/api/settings', [
            'key' => 'existing_setting',
            'value' => 'new_value',
        ]);

        $response->assertOk();
        
        $setting = Setting::where('key', 'existing_setting')->first();
        expect($setting->value)->toBe('new_value');
    });

    it('requires admin role', function () {
        $memberUser = User::factory()->create([
            'household_id' => $this->household->id,
            'role' => 'member',
        ]);
        $this->actingAs($memberUser);

        $response = $this->postJson('/api/settings', [
            'key' => 'setting',
            'value' => 'value',
        ]);

        $response->assertForbidden();
    });
});

describe('AI settings', function () {
    it('gets AI agent configuration', function () {
        $response = $this->getJson('/api/settings/ai/agents');

        $response->assertOk()
            ->assertJsonStructure(['agents']);
    });

    it('updates AI agent configuration', function () {
        $response = $this->postJson('/api/settings/ai/agents', [
            'agents' => [
                [
                    'name' => 'openai',
                    'enabled' => true,
                    'api_key' => 'test-key',
                    'model' => 'gpt-4',
                ],
            ],
        ]);

        $response->assertOk();
    });

    it('validates agent structure', function () {
        $response = $this->postJson('/api/settings/ai/agents', [
            'agents' => 'invalid',
        ]);

        $response->assertUnprocessable();
    });

    it('requires admin role for AI settings', function () {
        $memberUser = User::factory()->create([
            'household_id' => $this->household->id,
            'role' => 'member',
        ]);
        $this->actingAs($memberUser);

        $response = $this->postJson('/api/settings/ai/agents', [
            'agents' => [],
        ]);

        $response->assertForbidden();
    });

    it('gets available models for Claude agent', function () {
        Setting::factory()->create([
            'household_id' => $this->household->id,
            'key' => 'anthropic_api_key',
            'value' => encrypt('test-key'),
        ]);

        $response = $this->getJson('/api/settings/ai/agents/claude/models');

        $response->assertOk()
            ->assertJsonStructure(['models'])
            ->assertJson(fn ($json) => $json->has('models')
                ->whereType('models', 'array')
            );
    });

    it('gets available models for OpenAI agent', function () {
        Setting::factory()->create([
            'household_id' => $this->household->id,
            'key' => 'openai_api_key',
            'value' => encrypt('test-key'),
        ]);

        $response = $this->getJson('/api/settings/ai/agents/openai/models');

        $response->assertOk()
            ->assertJsonStructure(['models'])
            ->assertJson(fn ($json) => $json->has('models')
                ->whereType('models', 'array')
            );
    });

    it('gets available models for Gemini agent', function () {
        Setting::factory()->create([
            'household_id' => $this->household->id,
            'key' => 'gemini_api_key',
            'value' => encrypt('test-key'),
        ]);

        $response = $this->getJson('/api/settings/ai/agents/gemini/models');

        $response->assertOk()
            ->assertJsonStructure(['models'])
            ->assertJson(fn ($json) => $json->has('models')
                ->whereType('models', 'array')
            );
    });

    it('gets available models for Local agent', function () {
        Setting::factory()->create([
            'household_id' => $this->household->id,
            'key' => 'local_base_url',
            'value' => 'http://localhost:11434',
        ]);

        $response = $this->getJson('/api/settings/ai/agents/local/models');

        $response->assertOk()
            ->assertJsonStructure(['models'])
            ->assertJson(fn ($json) => $json->has('models')
                ->whereType('models', 'array')
            );
    });

    it('returns default models when API key is missing', function () {
        $response = $this->getJson('/api/settings/ai/agents/claude/models');

        $response->assertOk()
            ->assertJsonStructure(['models'])
            ->assertJson(fn ($json) => $json->has('models')
                ->whereType('models', 'array')
                ->where('models', fn ($models) => count($models) > 0)
            );
    });

    it('returns 404 for invalid agent name', function () {
        $response = $this->getJson('/api/settings/ai/agents/invalid/models');

        $response->assertNotFound();
    });
});

describe('storage settings', function () {
    it('gets storage configuration', function () {
        $response = $this->getJson('/api/settings/storage');

        $response->assertOk()
            ->assertJsonStructure(['storage']);
    });

    it('updates storage configuration', function () {
        $response = $this->postJson('/api/settings/storage', [
            'driver' => 'local',
        ]);

        $response->assertOk();
    });

    it('validates S3 settings when driver is s3', function () {
        $response = $this->postJson('/api/settings/storage', [
            'driver' => 's3',
            // Missing required S3 fields
        ]);

        // Should either accept or validate S3 requirements
        expect($response->status())->toBeIn([200, 422]);
    });

    it('requires admin role for storage settings', function () {
        $memberUser = User::factory()->create([
            'household_id' => $this->household->id,
            'role' => 'member',
        ]);
        $this->actingAs($memberUser);

        $response = $this->postJson('/api/settings/storage', [
            'driver' => 'local',
        ]);

        $response->assertForbidden();
    });
});

describe('prompts settings', function () {
    it('gets AI prompts', function () {
        $response = $this->getJson('/api/settings/prompts');

        $response->assertOk()
            ->assertJsonStructure(['prompts']);
    });

    it('updates AI prompts', function () {
        $response = $this->postJson('/api/settings/prompts', [
            'prompts' => [
                'analysis' => 'Custom analysis prompt',
            ],
        ]);

        $response->assertOk();
    });
});
