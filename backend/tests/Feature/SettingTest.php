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
        Setting::set('storage_driver', 'local', $this->household->id);

        $response = $this->getJson('/api/settings');

        $response->assertOk()
            ->assertJsonStructure(['settings', 'key_status']);
    });

    it('returns key status for API keys', function () {
        $response = $this->getJson('/api/settings');

        $response->assertOk()
            ->assertJsonStructure([
                'key_status' => [
                    'anthropic_api_key_set',
                    'openai_api_key_set',
                    'gemini_api_key_set',
                    'local_api_key_set',
                ],
            ]);
    });
});

describe('settings update', function () {
    it('updates settings via PATCH', function () {
        $response = $this->patchJson('/api/settings', [
            'settings' => [
                'ai_provider' => 'openai',
            ],
        ]);

        $response->assertOk();
    });

    it('updates multiple settings at once', function () {
        $response = $this->patchJson('/api/settings', [
            'settings' => [
                'ai_provider' => 'claude',
                'storage_driver' => 'local',
            ],
        ]);

        $response->assertOk();
    });

    it('requires admin role', function () {
        $memberUser = User::factory()->create([
            'household_id' => $this->household->id,
            'role' => 'member',
        ]);
        $this->actingAs($memberUser);

        $response = $this->patchJson('/api/settings', [
            'settings' => [
                'ai_provider' => 'openai',
            ],
        ]);

        $response->assertForbidden();
    });

    it('validates setting values', function () {
        $response = $this->patchJson('/api/settings', [
            'settings' => [
                'ai_provider' => 'invalid-provider',
            ],
        ]);

        $response->assertUnprocessable();
    });
});

describe('AI settings', function () {
    it('gets AI agent configuration', function () {
        $response = $this->getJson('/api/settings/ai/agents');

        $response->assertOk()
            ->assertJsonStructure(['agents']);
    });

    it('updates individual agent configuration', function () {
        $response = $this->patchJson('/api/settings/ai/agents/openai', [
            'enabled' => true,
            'api_key' => 'test-key',
            'model' => 'gpt-4',
        ]);

        $response->assertOk();
    });

    it('tests agent connection', function () {
        // Set up the agent first
        Setting::set('openai_api_key', encrypt('test-key'), $this->household->id);
        Setting::set('ai_agent_openai_enabled', '1', $this->household->id);

        $response = $this->postJson('/api/settings/ai/agents/openai/test');

        // May fail if API key is not valid, but shouldn't 404
        expect($response->status())->toBeIn([200, 422, 500]);
    });

    it('sets primary agent', function () {
        $response = $this->postJson('/api/settings/ai/primary', [
            'agent' => 'claude',
        ]);

        $response->assertOk();
    });

    it('requires admin role for AI settings', function () {
        $memberUser = User::factory()->create([
            'household_id' => $this->household->id,
            'role' => 'member',
        ]);
        $this->actingAs($memberUser);

        $response = $this->patchJson('/api/settings/ai/agents/openai', [
            'enabled' => true,
        ]);

        $response->assertForbidden();
    });

    it('gets available models for Claude agent', function () {
        $response = $this->getJson('/api/settings/ai/agents/claude/models');

        $response->assertOk()
            ->assertJsonStructure(['models'])
            ->assertJson(fn ($json) => $json->has('models')
                ->whereType('models', 'array')
            );
    });

    it('gets available models for OpenAI agent', function () {
        $response = $this->getJson('/api/settings/ai/agents/openai/models');

        $response->assertOk()
            ->assertJsonStructure(['models'])
            ->assertJson(fn ($json) => $json->has('models')
                ->whereType('models', 'array')
            );
    });

    it('gets available models for Gemini agent', function () {
        $response = $this->getJson('/api/settings/ai/agents/gemini/models');

        $response->assertOk()
            ->assertJsonStructure(['models'])
            ->assertJson(fn ($json) => $json->has('models')
                ->whereType('models', 'array')
            );
    });

    it('gets available models for Local agent', function () {
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

describe('AI check', function () {
    it('checks AI availability', function () {
        $response = $this->getJson('/api/settings/ai');

        $response->assertOk();
    });

    it('tests AI connection', function () {
        $response = $this->postJson('/api/settings/ai/test');

        // May return various statuses depending on configuration
        expect($response->status())->toBeIn([200, 422, 500]);
    });
});

describe('storage check', function () {
    it('checks storage configuration', function () {
        $response = $this->getJson('/api/settings/storage');

        $response->assertOk();
    });
});

describe('email check', function () {
    it('checks email configuration', function () {
        $response = $this->getJson('/api/settings/email');

        $response->assertOk();
    });
});
