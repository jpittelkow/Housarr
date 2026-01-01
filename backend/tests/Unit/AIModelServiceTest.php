<?php

use App\Services\AIModelService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    $this->service = new AIModelService();
    Cache::flush();
});

describe('AIModelService - Claude models', function () {
    it('returns default models when API key is null', function () {
        $models = $this->service->getClaudeModels(null);

        expect($models)->toBeArray()
            ->not->toBeEmpty()
            ->toContain('claude-sonnet-4-20250514');
    });

    it('returns models when API key is provided', function () {
        $models = $this->service->getClaudeModels('test-key');

        expect($models)->toBeArray()
            ->not->toBeEmpty()
            ->toContain('claude-sonnet-4-20250514');
    });

    it('caches Claude models', function () {
        $models1 = $this->service->getClaudeModels('test-key');
        $models2 = $this->service->getClaudeModels('test-key');

        expect($models1)->toBe($models2);
    });
});

describe('AIModelService - OpenAI models', function () {
    it('returns default models when API key is null', function () {
        $models = $this->service->getOpenAIModels(null);

        expect($models)->toBeArray()
            ->not->toBeEmpty()
            ->toContain('gpt-4o');
    });

    it('returns default models when API call fails', function () {
        Http::fake([
            '*' => Http::response([], 500),
        ]);

        $models = $this->service->getOpenAIModels('test-key');

        expect($models)->toBeArray()
            ->not->toBeEmpty()
            ->toContain('gpt-4o');
    });

    it('fetches models from OpenAI API when successful', function () {
        Http::fake([
            'api.openai.com/v1/models' => Http::response([
                'data' => [
                    ['id' => 'gpt-4o'],
                    ['id' => 'gpt-4-turbo'],
                    ['id' => 'gpt-3.5-turbo'],
                    ['id' => 'text-embedding-ada-002'], // Should be filtered out
                ],
            ], 200),
        ]);

        $models = $this->service->getOpenAIModels('test-key');

        expect($models)->toBeArray()
            ->toContain('gpt-4o')
            ->toContain('gpt-4-turbo')
            ->toContain('gpt-3.5-turbo')
            ->not->toContain('text-embedding-ada-002');
    });

    it('uses custom base URL when provided', function () {
        Http::fake([
            'custom-api.com/v1/models' => Http::response([
                'data' => [
                    ['id' => 'gpt-4o'],
                    ['id' => 'gpt-custom'], // Not gpt-* prefix, will be filtered
                ],
            ], 200),
        ]);

        $models = $this->service->getOpenAIModels('test-key', 'https://custom-api.com/v1');

        // Only gpt-* models are included from API, plus defaults
        expect($models)->toBeArray()
            ->toContain('gpt-4o');
    });
});

describe('AIModelService - Gemini models', function () {
    it('returns default models when API key is null', function () {
        $models = $this->service->getGeminiModels(null);

        expect($models)->toBeArray()
            ->not->toBeEmpty()
            ->toContain('gemini-1.5-pro');
    });

    it('returns default models when API call fails', function () {
        Http::fake([
            '*' => Http::response([], 500),
        ]);

        $models = $this->service->getGeminiModels('test-key');

        expect($models)->toBeArray()
            ->not->toBeEmpty()
            ->toContain('gemini-1.5-pro');
    });

    it('fetches models from Gemini API when successful', function () {
        Http::fake([
            'generativelanguage.googleapis.com/v1beta/models*' => Http::response([
                'models' => [
                    [
                        'name' => 'models/gemini-1.5-pro',
                        'supportedGenerationMethods' => ['generateContent'],
                    ],
                    [
                        'name' => 'models/gemini-1.5-flash',
                        'supportedGenerationMethods' => ['generateContent'],
                    ],
                ],
            ], 200),
        ]);

        $models = $this->service->getGeminiModels('test-key');

        expect($models)->toBeArray()
            ->toContain('gemini-1.5-pro')
            ->toContain('gemini-1.5-flash');
    });
});

describe('AIModelService - Local models', function () {
    it('returns default models when base URL is null', function () {
        $models = $this->service->getLocalModels(null);

        expect($models)->toBeArray()
            ->not->toBeEmpty()
            ->toContain('llama3');
    });

    it('fetches models from Ollama when base URL contains 11434', function () {
        Http::fake([
            'localhost:11434/api/tags' => Http::response([
                'models' => [
                    ['name' => 'llama3'],
                    ['name' => 'mistral'],
                ],
            ], 200),
        ]);

        $models = $this->service->getLocalModels('http://localhost:11434');

        expect($models)->toBeArray()
            ->toContain('llama3')
            ->toContain('mistral');
    });

    it('fetches models from OpenAI-compatible API', function () {
        Http::fake([
            'localhost:1234/v1/models' => Http::response([
                'data' => [
                    ['id' => 'custom-llm'],
                ],
            ], 200),
        ]);

        $models = $this->service->getLocalModels('http://localhost:1234');

        expect($models)->toBeArray()
            ->toContain('custom-llm');
    });

    it('returns default models when API call fails', function () {
        Http::fake([
            '*' => Http::response([], 500),
        ]);

        $models = $this->service->getLocalModels('http://localhost:11434');

        expect($models)->toBeArray()
            ->not->toBeEmpty()
            ->toContain('llama3');
    });
});

describe('AIModelService - caching', function () {
    it('caches models for 5 minutes', function () {
        Http::fake([
            'api.openai.com/v1/models' => Http::response([
                'data' => [['id' => 'gpt-4o']],
            ], 200),
        ]);

        $models1 = $this->service->getOpenAIModels('test-key');
        $models2 = $this->service->getOpenAIModels('test-key');

        // Should only make one HTTP request due to caching
        Http::assertSentCount(1);
        expect($models1)->toBe($models2);
    });
});
