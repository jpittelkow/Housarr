<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AIModelService
{
    /**
     * Cache duration in seconds (5 minutes).
     */
    protected const CACHE_DURATION = 300;

    /**
     * Get available models for Claude (Anthropic).
     */
    public function getClaudeModels(?string $apiKey): array
    {
        if (!$apiKey) {
            return $this->getDefaultClaudeModels();
        }

        $cacheKey = "ai_models_claude_{$apiKey}";

        return Cache::remember($cacheKey, self::CACHE_DURATION, function () use ($apiKey) {
            try {
                // Anthropic doesn't have a public models endpoint, so we return known models
                // These are the current Claude models as of 2024
                return [
                    'claude-3-5-sonnet-20241022',
                    'claude-3-5-sonnet-20240620',
                    'claude-3-opus-20240229',
                    'claude-3-sonnet-20240229',
                    'claude-3-haiku-20240307',
                    'claude-sonnet-4-20250514', // Latest
                ];
            } catch (\Exception $e) {
                Log::warning("Failed to fetch Claude models: {$e->getMessage()}");
                return $this->getDefaultClaudeModels();
            }
        });
    }

    /**
     * Get available models for OpenAI.
     */
    public function getOpenAIModels(?string $apiKey, ?string $baseUrl = null): array
    {
        if (!$apiKey) {
            return $this->getDefaultOpenAIModels();
        }

        $baseUrl = rtrim($baseUrl ?? 'https://api.openai.com/v1', '/');
        $cacheKey = "ai_models_openai_{$baseUrl}_{$apiKey}";

        return Cache::remember($cacheKey, self::CACHE_DURATION, function () use ($apiKey, $baseUrl) {
            try {
                $response = Http::withHeaders([
                    'Authorization' => "Bearer {$apiKey}",
                ])->timeout(10)->get("{$baseUrl}/models");

                if ($response->successful()) {
                    $data = $response->json();
                    $models = [];

                    if (isset($data['data']) && is_array($data['data'])) {
                        foreach ($data['data'] as $model) {
                            if (isset($model['id'])) {
                                $modelId = $model['id'];
                                // Filter to only chat models (gpt-*)
                                if (str_starts_with($modelId, 'gpt-')) {
                                    $models[] = $modelId;
                                }
                            }
                        }
                    }

                    // Sort models, putting latest first
                    usort($models, function ($a, $b) {
                        return version_compare($b, $a);
                    });

                    // Ensure default model is included
                    $defaultModels = $this->getDefaultOpenAIModels();
                    $models = array_unique(array_merge($defaultModels, $models));

                    return array_values($models);
                }
            } catch (\Exception $e) {
                Log::warning("Failed to fetch OpenAI models: {$e->getMessage()}");
            }

            return $this->getDefaultOpenAIModels();
        });
    }

    /**
     * Get available models for Gemini (Google).
     */
    public function getGeminiModels(?string $apiKey, ?string $baseUrl = null): array
    {
        if (!$apiKey) {
            return $this->getDefaultGeminiModels();
        }

        $baseUrl = rtrim($baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta', '/');
        $cacheKey = "ai_models_gemini_{$baseUrl}_{$apiKey}";

        return Cache::remember($cacheKey, self::CACHE_DURATION, function () use ($apiKey, $baseUrl) {
            try {
                $response = Http::withHeaders([
                    'Content-Type' => 'application/json',
                ])->timeout(10)->get("{$baseUrl}/models?key={$apiKey}");

                if ($response->successful()) {
                    $data = $response->json();
                    $models = [];

                    if (isset($data['models']) && is_array($data['models'])) {
                        foreach ($data['models'] as $model) {
                            if (isset($model['name'])) {
                                // Extract model name from full path (e.g., "models/gemini-1.5-pro")
                                $modelName = str_replace('models/', '', $model['name']);
                                // Only include generation models
                                if (isset($model['supportedGenerationMethods']) && 
                                    in_array('generateContent', $model['supportedGenerationMethods'])) {
                                    $models[] = $modelName;
                                }
                            }
                        }
                    }

                    // Sort models, putting latest first
                    usort($models, function ($a, $b) {
                        return version_compare($b, $a);
                    });

                    // Ensure default model is included
                    $defaultModels = $this->getDefaultGeminiModels();
                    $models = array_unique(array_merge($defaultModels, $models));

                    return array_values($models);
                }
            } catch (\Exception $e) {
                Log::warning("Failed to fetch Gemini models: {$e->getMessage()}");
            }

            return $this->getDefaultGeminiModels();
        });
    }

    /**
     * Get available models for Local (Ollama or OpenAI-compatible).
     */
    public function getLocalModels(?string $baseUrl, ?string $apiKey = null): array
    {
        if (!$baseUrl) {
            return $this->getDefaultLocalModels();
        }

        $isOllama = str_contains($baseUrl, '11434');
        $cacheKey = "ai_models_local_{$baseUrl}";

        return Cache::remember($cacheKey, self::CACHE_DURATION, function () use ($baseUrl, $apiKey, $isOllama) {
            try {
                $headers = ['Content-Type' => 'application/json'];
                if ($apiKey) {
                    $headers['Authorization'] = "Bearer {$apiKey}";
                }

                if ($isOllama) {
                    // Ollama API
                    $response = Http::withHeaders($headers)
                        ->timeout(10)
                        ->get("{$baseUrl}/api/tags");

                    if ($response->successful()) {
                        $data = $response->json();
                        $models = [];

                        if (isset($data['models']) && is_array($data['models'])) {
                            foreach ($data['models'] as $model) {
                                if (isset($model['name'])) {
                                    $models[] = $model['name'];
                                }
                            }
                        }

                        // Ensure default model is included
                        $defaultModels = $this->getDefaultLocalModels();
                        $models = array_unique(array_merge($defaultModels, $models));

                        return array_values($models);
                    }
                } else {
                    // OpenAI-compatible API
                    $baseUrl = rtrim($baseUrl, '/');
                    $response = Http::withHeaders($headers)
                        ->timeout(10)
                        ->get("{$baseUrl}/v1/models");

                    if ($response->successful()) {
                        $data = $response->json();
                        $models = [];

                        if (isset($data['data']) && is_array($data['data'])) {
                            foreach ($data['data'] as $model) {
                                if (isset($model['id'])) {
                                    $models[] = $model['id'];
                                }
                            }
                        }

                        // Ensure default model is included
                        $defaultModels = $this->getDefaultLocalModels();
                        $models = array_unique(array_merge($defaultModels, $models));

                        return array_values($models);
                    }
                }
            } catch (\Exception $e) {
                Log::warning("Failed to fetch local models: {$e->getMessage()}");
            }

            return $this->getDefaultLocalModels();
        });
    }

    /**
     * Get default Claude models.
     */
    protected function getDefaultClaudeModels(): array
    {
        return [
            'claude-sonnet-4-20250514',
            'claude-3-5-sonnet-20241022',
            'claude-3-5-sonnet-20240620',
            'claude-3-opus-20240229',
            'claude-3-sonnet-20240229',
            'claude-3-haiku-20240307',
        ];
    }

    /**
     * Get default OpenAI models.
     */
    protected function getDefaultOpenAIModels(): array
    {
        return [
            'gpt-4o',
            'gpt-4o-mini',
            'gpt-4-turbo',
            'gpt-4',
            'gpt-3.5-turbo',
        ];
    }

    /**
     * Get default Gemini models.
     */
    protected function getDefaultGeminiModels(): array
    {
        return [
            'gemini-1.5-pro',
            'gemini-1.5-flash',
            'gemini-pro',
            'gemini-pro-vision',
        ];
    }

    /**
     * Get default Local models.
     */
    protected function getDefaultLocalModels(): array
    {
        return [
            'llama3',
            'llama3.1',
            'llama2',
            'mistral',
            'mixtral',
            'codellama',
        ];
    }
}
