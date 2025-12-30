<?php

use App\Services\AIService;

describe('AIService', function () {
    describe('provider detection', function () {
        it('detects claude when api key is set', function () {
            config(['services.anthropic.api_key' => 'test-key']);
            
            $service = new AIService();
            
            expect($service->hasProvider('claude'))->toBeTrue();
        });

        it('returns false for unconfigured claude', function () {
            config(['services.anthropic.api_key' => null]);
            
            $service = new AIService();
            
            expect($service->hasProvider('claude'))->toBeFalse();
        });

        it('detects openai when api key is set', function () {
            config(['services.openai.api_key' => 'test-key']);
            
            $service = new AIService();
            
            expect($service->hasProvider('openai'))->toBeTrue();
        });

        it('detects gemini when api key is set', function () {
            config(['services.google.api_key' => 'test-key']);
            
            $service = new AIService();
            
            expect($service->hasProvider('gemini'))->toBeTrue();
        });
    });

    describe('prompt building', function () {
        it('builds image analysis prompt', function () {
            $service = new AIService();
            $categories = ['Appliances', 'Electronics', 'HVAC'];
            
            $prompt = $service->buildImageAnalysisPrompt($categories);
            
            expect($prompt)->toContain('Appliances')
                ->toContain('Electronics')
                ->toContain('HVAC')
                ->toContain('make')
                ->toContain('model');
        });

        it('includes JSON format instructions', function () {
            $service = new AIService();
            $categories = ['Test Category'];
            
            $prompt = $service->buildImageAnalysisPrompt($categories);
            
            expect($prompt)->toContain('JSON');
        });
    });

    describe('provider selection', function () {
        it('returns available providers', function () {
            config([
                'services.anthropic.api_key' => 'claude-key',
                'services.openai.api_key' => null,
                'services.google.api_key' => 'gemini-key',
            ]);
            
            $service = new AIService();
            $providers = $service->getAvailableProviders();
            
            expect($providers)->toContain('claude')
                ->toContain('gemini')
                ->not->toContain('openai');
        });
    });
});
