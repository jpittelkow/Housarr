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
        Setting::set('ai_agent_openai_enabled', '1', $this->household->id);
        Setting::set('openai_api_key', 'test-key', $this->household->id);

        $orchestrator = new AIAgentOrchestrator($this->household->id);
        $agents = $orchestrator->getAllAgentsStatus();

        expect($agents)->toBeArray();
    });
});

describe('AIAgentOrchestrator agent management', function () {
    it('returns available agents', function () {
        $orchestrator = new AIAgentOrchestrator($this->household->id);
        $agents = $orchestrator->getAllAgentsStatus();

        expect($agents)->toBeArray();
        // Each agent should have required properties
        foreach ($agents as $agent) {
            expect($agent)->toHaveKeys(['name', 'enabled', 'configured']);
        }
    });

    it('returns only active agents', function () {
        Setting::set('ai_agent_openai_enabled', '1', $this->household->id);
        Setting::set('openai_api_key', 'test-key', $this->household->id);
        
        $orchestrator = new AIAgentOrchestrator($this->household->id);
        $activeAgents = $orchestrator->getActiveAgents();

        expect($activeAgents)->toBeArray();
        expect($activeAgents)->toContain('openai');
    });

    it('identifies primary agent', function () {
        $orchestrator = new AIAgentOrchestrator($this->household->id);
        $primary = $orchestrator->getPrimaryAgent();

        // May be null if no agents configured
        expect($primary === null || is_string($primary))->toBeTrue();
    });

    it('can set primary agent', function () {
        $orchestrator = new AIAgentOrchestrator($this->household->id);
        $orchestrator->setPrimaryAgent('claude');

        expect($orchestrator->getPrimaryAgent())->toBe('claude');
    });

    it('can enable and disable agents', function () {
        $orchestrator = new AIAgentOrchestrator($this->household->id);
        
        $orchestrator->setAgentEnabled('openai', true);
        $agentStatus = $orchestrator->getAgentStatus('openai');
        expect($agentStatus->enabled)->toBeTrue();

        $orchestrator->setAgentEnabled('openai', false);
        $agentStatus = $orchestrator->getAgentStatus('openai');
        expect($agentStatus->enabled)->toBeFalse();
    });
});

describe('AIAgentOrchestrator call execution', function () {
    it('handles no configured agents gracefully', function () {
        // Clear all AI settings
        Setting::where('household_id', $this->household->id)
            ->where('key', 'like', 'ai_%')
            ->delete();

        $orchestrator = new AIAgentOrchestrator($this->household->id);
        
        expect($orchestrator->isAvailable())->toBeFalse();
    });

    it('calls a specific agent', function () {
        Setting::set('ai_agent_claude_enabled', '1', $this->household->id);
        Setting::set('anthropic_api_key', 'test-key', $this->household->id);
        
        $orchestrator = new AIAgentOrchestrator($this->household->id);
        $result = $orchestrator->callAgent('claude', 'Test prompt');

        expect($result)->toHaveKeys(['agent', 'success', 'response', 'error', 'duration_ms']);
        expect($result['agent'])->toBe('claude');
    });

    it('returns error for unavailable agent', function () {
        $orchestrator = new AIAgentOrchestrator($this->household->id);
        $result = $orchestrator->callAgent('claude', 'Test prompt');

        expect($result['success'])->toBeFalse();
        expect($result['error'])->toContain('disabled');
    });

    it('returns error for unknown agent', function () {
        $orchestrator = new AIAgentOrchestrator($this->household->id);
        $result = $orchestrator->callAgent('unknown', 'Test prompt');

        expect($result['success'])->toBeFalse();
        expect($result['error'])->toContain('Unknown agent');
    });
});

describe('AIAgentOrchestrator multi-agent calls', function () {
    it('calls all active agents', function () {
        $orchestrator = new AIAgentOrchestrator($this->household->id);
        $result = $orchestrator->callActiveAgents('Test prompt');

        expect($result)->toHaveKeys(['agents', 'primary']);
        expect($result['agents'])->toBeArray();
    });

    it('reports primary agent in result when set', function () {
        // Create orchestrator and set primary agent
        $orchestrator = new AIAgentOrchestrator($this->household->id);
        $orchestrator->setPrimaryAgent('claude');
        
        // Verify the primary agent is set
        expect($orchestrator->getPrimaryAgent())->toBe('claude');
        
        // callActiveAgents includes the primary in the result
        $result = $orchestrator->callActiveAgents('Test prompt');
        expect($result)->toHaveKey('primary');
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
            lastSuccessAt: null,
            lastTestResult: null,
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
            lastSuccessAt: '2024-01-01T00:00:00Z',
            lastTestResult: ['success' => true],
            isPrimary: false
        );

        $array = $agent->toArray();

        expect($array)->toBeArray();
        expect($array)->toHaveKeys(['name', 'display_name', 'enabled', 'configured', 'available', 'model', 'is_primary']);
    });

    it('creates from settings', function () {
        $settings = [
            'ai_agent_openai_enabled' => '1',
            'ai_agent_openai_model' => 'gpt-4-turbo',
            'openai_api_key' => 'test-key',
        ];

        $agent = AIAgent::fromSettings('openai', $settings, 'openai');

        expect($agent->name)->toBe('openai');
        expect($agent->enabled)->toBeTrue();
        expect($agent->configured)->toBeTrue();
        expect($agent->model)->toBe('gpt-4-turbo');
        expect($agent->isPrimary)->toBeTrue();
    });
});
