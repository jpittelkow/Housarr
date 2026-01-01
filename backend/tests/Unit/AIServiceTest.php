<?php

use App\Services\AIService;
use App\Models\Household;
use App\Models\Setting;

beforeEach(function () {
    $this->household = Household::factory()->create();
});

describe('AIService', function () {
    describe('availability', function () {
        it('reports unavailable when provider is none', function () {
            Setting::set('ai_provider', 'none', $this->household->id);
            
            $service = new AIService($this->household->id);
            
            expect($service->isAvailable())->toBeFalse();
        });

        it('reports available when claude is configured', function () {
            Setting::set('ai_provider', 'claude', $this->household->id);
            Setting::set('anthropic_api_key', 'test-key', $this->household->id);
            
            $service = new AIService($this->household->id);
            
            expect($service->isAvailable())->toBeTrue();
            expect($service->getProvider())->toBe('claude');
        });

        it('reports available when openai is configured', function () {
            Setting::set('ai_provider', 'openai', $this->household->id);
            Setting::set('openai_api_key', 'test-key', $this->household->id);
            
            $service = new AIService($this->household->id);
            
            expect($service->isAvailable())->toBeTrue();
            expect($service->getProvider())->toBe('openai');
        });

        it('reports available when gemini is configured', function () {
            Setting::set('ai_provider', 'gemini', $this->household->id);
            Setting::set('gemini_api_key', 'test-key', $this->household->id);
            
            $service = new AIService($this->household->id);
            
            expect($service->isAvailable())->toBeTrue();
            expect($service->getProvider())->toBe('gemini');
        });

        it('reports available when local is configured', function () {
            Setting::set('ai_provider', 'local', $this->household->id);
            Setting::set('local_base_url', 'http://localhost:11434', $this->household->id);
            
            $service = new AIService($this->household->id);
            
            expect($service->isAvailable())->toBeTrue();
            expect($service->getProvider())->toBe('local');
        });

        it('reports unavailable when provider set but api key missing', function () {
            Setting::set('ai_provider', 'claude', $this->household->id);
            // No anthropic_api_key set
            
            $service = new AIService($this->household->id);
            
            expect($service->isAvailable())->toBeFalse();
        });
    });

    describe('model selection', function () {
        it('returns default model for claude', function () {
            Setting::set('ai_provider', 'claude', $this->household->id);
            Setting::set('anthropic_api_key', 'test-key', $this->household->id);
            
            $service = new AIService($this->household->id);
            
            expect($service->getModel())->toBe('claude-sonnet-4-20250514');
        });

        it('returns default model for openai', function () {
            Setting::set('ai_provider', 'openai', $this->household->id);
            Setting::set('openai_api_key', 'test-key', $this->household->id);
            
            $service = new AIService($this->household->id);
            
            expect($service->getModel())->toBe('gpt-4o');
        });

        it('returns custom model when configured', function () {
            Setting::set('ai_provider', 'claude', $this->household->id);
            Setting::set('ai_model', 'claude-3-opus-20240229', $this->household->id);
            Setting::set('anthropic_api_key', 'test-key', $this->household->id);
            
            $service = new AIService($this->household->id);
            
            expect($service->getModel())->toBe('claude-3-opus-20240229');
        });
    });

    describe('static factory', function () {
        it('creates instance via forHousehold', function () {
            $service = AIService::forHousehold($this->household->id);
            
            expect($service)->toBeInstanceOf(AIService::class);
        });
    });

    describe('completion', function () {
        it('returns null when not available', function () {
            Setting::set('ai_provider', 'none', $this->household->id);
            
            $service = new AIService($this->household->id);
            $result = $service->complete('test prompt');
            
            expect($result)->toBeNull();
        });

        it('returns error in completeWithError when not available', function () {
            Setting::set('ai_provider', 'none', $this->household->id);
            
            $service = new AIService($this->household->id);
            $result = $service->completeWithError('test prompt');
            
            expect($result)->toHaveKey('response');
            expect($result)->toHaveKey('error');
            expect($result['response'])->toBeNull();
            expect($result['error'])->toBe('AI provider is not configured');
        });
    });
});
