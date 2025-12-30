<?php

use App\Services\AIAgentOrchestrator;
use App\Services\AIAgent;
use App\Models\Household;
use App\Models\Setting;

beforeEach(function () {
    $this->household = Household::factory()->create();
});

describe('AIAgentOrchestrator initialization', function () {
    it('can be instantiated', function () {
        $orchestrator = new AIAgentOrchestrator($this->household->id);
        
        expect($orchestrator)->toBeInstanceOf(AIAgentOrchestrator::class);
    });

    it('loads agents from settings', function () {
        // Create some AI settings for the household
        Setting::factory()->create([
            'household_id' => $this->household->id,
            'key' => 'ai_openai_enabled',
            'value' => 'true',
        ]);

        $orchestrator = new AIAgentOrchestrator($this->household->id);
        $agents = $orchestrator->getAgents();

        expect($agents)->toBeArray();
    });
});

describe('AIAgentOrchestrator agent management', function () {
    it('returns available agents', function () {
        $orchestrator = new AIAgentOrchestrator($this->household->id);
        $agents = $orchestrator->getAgents();

        expect($agents)->toBeArray();
        // Each agent should have required properties
        foreach ($agents as $agent) {
            expect($agent)->toHaveKeys(['name', 'enabled', 'configured']);
        }
    });

    it('returns only enabled agents', function () {
        $orchestrator = new AIAgentOrchestrator($this->household->id);
        $enabledAgents = $orchestrator->getEnabledAgents();

        foreach ($enabledAgents as $agent) {
            expect($agent['enabled'])->toBeTrue();
        }
    });

    it('identifies primary agent', function () {
        $orchestrator = new AIAgentOrchestrator($this->household->id);
        $primary = $orchestrator->getPrimaryAgent();

        // May be null if no agents configured
        expect($primary === null || is_array($primary))->toBeTrue();
    });
});

describe('AIAgentOrchestrator query execution', function () {
    it('handles no configured agents gracefully', function () {
        // Clear all AI settings
        Setting::where('household_id', $this->household->id)
            ->where('key', 'like', 'ai_%')
            ->delete();

        $orchestrator = new AIAgentOrchestrator($this->household->id);
        
        // Should not throw, should return empty or error result
        $result = $orchestrator->query('Test prompt');
        
        expect($result)->toBeArray();
        expect($result)->toHaveKey('success');
    });

    it('tracks query metadata', function () {
        $orchestrator = new AIAgentOrchestrator($this->household->id);
        $result = $orchestrator->query('Test prompt');

        expect($result)->toHaveKeys(['success', 'agents_used', 'total_duration_ms']);
    });

    it('returns agent details in response', function () {
        $orchestrator = new AIAgentOrchestrator($this->household->id);
        $result = $orchestrator->query('Test prompt');

        if (isset($result['agent_details'])) {
            expect($result['agent_details'])->toBeArray();
        }
    });
});

describe('AIAgentOrchestrator synthesis', function () {
    it('identifies synthesis agent', function () {
        $orchestrator = new AIAgentOrchestrator($this->household->id);
        $result = $orchestrator->query('Test prompt');

        // May have synthesis_agent key
        if (isset($result['synthesis_agent'])) {
            expect($result['synthesis_agent'])->toBeString();
        }
    });

    it('aggregates results from multiple agents', function () {
        $orchestrator = new AIAgentOrchestrator($this->household->id);
        $result = $orchestrator->query('Test prompt');

        expect($result)->toHaveKey('agents_succeeded');
        expect($result['agents_succeeded'])->toBeInt();
    });
});

describe('AIAgentOrchestrator error handling', function () {
    it('handles invalid prompts', function () {
        $orchestrator = new AIAgentOrchestrator($this->household->id);
        
        $result = $orchestrator->query('');
        
        expect($result['success'])->toBeFalse();
    });

    it('includes error message on failure', function () {
        // Clear all AI configuration to force failure
        Setting::where('household_id', $this->household->id)
            ->where('key', 'like', 'ai_%')
            ->delete();

        $orchestrator = new AIAgentOrchestrator($this->household->id);
        $result = $orchestrator->query('Test');

        if (!$result['success']) {
            expect($result)->toHaveKey('error');
        }
    });
});

describe('AIAgent value object', function () {
    it('can create AIAgent instance', function () {
        $agent = new AIAgent(
            name: 'openai',
            displayName: 'OpenAI GPT-4',
            enabled: true,
            configured: true,
            available: true,
            model: 'gpt-4',
            isPrimary: true
        );

        expect($agent->name)->toBe('openai');
        expect($agent->displayName)->toBe('OpenAI GPT-4');
        expect($agent->enabled)->toBeTrue();
        expect($agent->isPrimary)->toBeTrue();
    });

    it('converts to array', function () {
        $agent = new AIAgent(
            name: 'claude',
            displayName: 'Claude',
            enabled: true,
            configured: true,
            available: true,
            model: 'claude-3',
            isPrimary: false
        );

        $array = $agent->toArray();

        expect($array)->toBeArray();
        expect($array)->toHaveKeys(['name', 'display_name', 'enabled', 'configured']);
    });
});
