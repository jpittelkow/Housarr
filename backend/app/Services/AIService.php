<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Facades\Http;

class AIService
{
    protected ?int $householdId;
    protected string $provider;
    protected ?string $model;

    public function __construct(?int $householdId = null)
    {
        $this->householdId = $householdId;
        $this->provider = Setting::get('ai_provider', $householdId, 'none');
        $this->model = Setting::get('ai_model', $householdId);
    }

    /**
     * Create an AIService instance for a household.
     */
    public static function forHousehold(?int $householdId): self
    {
        return new self($householdId);
    }

    /**
     * Check if AI is configured and available.
     */
    public function isAvailable(): bool
    {
        if ($this->provider === 'none') {
            return false;
        }

        return match ($this->provider) {
            'claude' => !empty(Setting::get('anthropic_api_key', $this->householdId)),
            'openai' => !empty(Setting::get('openai_api_key', $this->householdId)),
            'gemini' => !empty(Setting::get('gemini_api_key', $this->householdId)),
            'local' => !empty(Setting::get('local_base_url', $this->householdId)),
            default => false,
        };
    }

    /**
     * Get the current provider name.
     */
    public function getProvider(): string
    {
        return $this->provider;
    }

    /**
     * Get the current model name.
     */
    public function getModel(): ?string
    {
        return $this->model ?: $this->getDefaultModel();
    }

    /**
     * Get the default model for the current provider.
     */
    protected function getDefaultModel(): ?string
    {
        return match ($this->provider) {
            'claude' => 'claude-sonnet-4-20250514',
            'openai' => 'gpt-4o',
            'gemini' => 'gemini-1.5-pro',
            'local' => Setting::get('local_model', $this->householdId, 'llama3'),
            default => null,
        };
    }

    /**
     * Send a completion request to the configured AI provider.
     */
    public function complete(string $prompt, array $options = []): ?string
    {
        if (!$this->isAvailable()) {
            return null;
        }

        return match ($this->provider) {
            'claude' => $this->completeClaude($prompt, $options),
            'openai' => $this->completeOpenAI($prompt, $options),
            'gemini' => $this->completeGemini($prompt, $options),
            'local' => $this->completeLocal($prompt, $options),
            default => null,
        };
    }

    /**
     * Complete using Claude (Anthropic).
     */
    protected function completeClaude(string $prompt, array $options = []): ?string
    {
        $apiKey = Setting::get('anthropic_api_key', $this->householdId);
        $model = $options['model'] ?? $this->getModel();

        try {
            $response = Http::withHeaders([
                'x-api-key' => $apiKey,
                'anthropic-version' => '2023-06-01',
                'Content-Type' => 'application/json',
            ])->post('https://api.anthropic.com/v1/messages', [
                'model' => $model,
                'max_tokens' => $options['max_tokens'] ?? 1024,
                'messages' => [
                    ['role' => 'user', 'content' => $prompt],
                ],
            ]);

            if ($response->successful()) {
                $data = $response->json();
                return $data['content'][0]['text'] ?? null;
            }
        } catch (\Exception $e) {
            report($e);
        }

        return null;
    }

    /**
     * Complete using OpenAI.
     */
    protected function completeOpenAI(string $prompt, array $options = []): ?string
    {
        $apiKey = Setting::get('openai_api_key', $this->householdId);
        $baseUrl = Setting::get('openai_base_url', $this->householdId, 'https://api.openai.com/v1');
        $model = $options['model'] ?? $this->getModel();

        try {
            $response = Http::withHeaders([
                'Authorization' => "Bearer {$apiKey}",
                'Content-Type' => 'application/json',
            ])->post("{$baseUrl}/chat/completions", [
                'model' => $model,
                'max_tokens' => $options['max_tokens'] ?? 1024,
                'messages' => [
                    ['role' => 'user', 'content' => $prompt],
                ],
            ]);

            if ($response->successful()) {
                $data = $response->json();
                return $data['choices'][0]['message']['content'] ?? null;
            }
        } catch (\Exception $e) {
            report($e);
        }

        return null;
    }

    /**
     * Complete using Google Gemini.
     */
    protected function completeGemini(string $prompt, array $options = []): ?string
    {
        $apiKey = Setting::get('gemini_api_key', $this->householdId);
        $baseUrl = Setting::get('gemini_base_url', $this->householdId, 'https://generativelanguage.googleapis.com/v1beta');
        $model = $options['model'] ?? $this->getModel();

        try {
            $response = Http::withHeaders([
                'Content-Type' => 'application/json',
            ])->post("{$baseUrl}/models/{$model}:generateContent?key={$apiKey}", [
                'contents' => [
                    ['parts' => [['text' => $prompt]]],
                ],
                'generationConfig' => [
                    'maxOutputTokens' => $options['max_tokens'] ?? 1024,
                ],
            ]);

            if ($response->successful()) {
                $data = $response->json();
                return $data['candidates'][0]['content']['parts'][0]['text'] ?? null;
            }
        } catch (\Exception $e) {
            report($e);
        }

        return null;
    }

    /**
     * Complete using a local model (Ollama, LM Studio, etc.).
     */
    protected function completeLocal(string $prompt, array $options = []): ?string
    {
        $baseUrl = Setting::get('local_base_url', $this->householdId);
        $apiKey = Setting::get('local_api_key', $this->householdId);
        $model = $options['model'] ?? $this->getModel();

        // Detect if it's Ollama or OpenAI-compatible API
        $isOllama = str_contains($baseUrl, '11434');

        try {
            $headers = ['Content-Type' => 'application/json'];
            if ($apiKey) {
                $headers['Authorization'] = "Bearer {$apiKey}";
            }

            if ($isOllama) {
                // Ollama API format
                $response = Http::withHeaders($headers)
                    ->post("{$baseUrl}/api/generate", [
                        'model' => $model,
                        'prompt' => $prompt,
                        'stream' => false,
                    ]);

                if ($response->successful()) {
                    $data = $response->json();
                    return $data['response'] ?? null;
                }
            } else {
                // OpenAI-compatible API format (LM Studio, vLLM, etc.)
                $response = Http::withHeaders($headers)
                    ->post("{$baseUrl}/v1/chat/completions", [
                        'model' => $model,
                        'max_tokens' => $options['max_tokens'] ?? 1024,
                        'messages' => [
                            ['role' => 'user', 'content' => $prompt],
                        ],
                    ]);

                if ($response->successful()) {
                    $data = $response->json();
                    return $data['choices'][0]['message']['content'] ?? null;
                }
            }
        } catch (\Exception $e) {
            report($e);
        }

        return null;
    }
}
