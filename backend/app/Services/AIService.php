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
     * Analyze an image using the configured AI provider's vision capabilities.
     *
     * @param string $base64Image Base64-encoded image data
     * @param string $mimeType The MIME type of the image (e.g., 'image/jpeg')
     * @param string $prompt The prompt to send with the image
     * @param array $options Additional options
     * @return array|null The parsed analysis results or null on failure
     */
    public function analyzeImage(string $base64Image, string $mimeType, string $prompt, array $options = []): ?array
    {
        if (!$this->isAvailable()) {
            return null;
        }

        $response = match ($this->provider) {
            'claude' => $this->analyzeImageClaude($base64Image, $mimeType, $prompt, $options),
            'openai' => $this->analyzeImageOpenAI($base64Image, $mimeType, $prompt, $options),
            'gemini' => $this->analyzeImageGemini($base64Image, $mimeType, $prompt, $options),
            'local' => $this->analyzeImageLocal($base64Image, $mimeType, $prompt, $options),
            default => null,
        };

        if (!$response) {
            return null;
        }

        // Parse the JSON response from the AI
        return $this->parseAnalysisResponse($response);
    }

    /**
     * Parse the AI's response to extract structured data.
     */
    protected function parseAnalysisResponse(string $response): ?array
    {
        // Try to extract JSON from the response
        // The AI might return JSON wrapped in markdown code blocks
        $jsonPattern = '/\[[\s\S]*\]/';
        if (preg_match($jsonPattern, $response, $matches)) {
            try {
                $parsed = json_decode($matches[0], true);
                if (is_array($parsed)) {
                    return $parsed;
                }
            } catch (\Exception $e) {
                // Continue to fallback
            }
        }

        // Try parsing the whole response as JSON
        try {
            $parsed = json_decode($response, true);
            if (is_array($parsed)) {
                return $parsed;
            }
        } catch (\Exception $e) {
            // Response wasn't valid JSON
        }

        return null;
    }

    /**
     * Analyze image using Claude (Anthropic).
     */
    protected function analyzeImageClaude(string $base64Image, string $mimeType, string $prompt, array $options = []): ?string
    {
        $apiKey = Setting::get('anthropic_api_key', $this->householdId);
        // Use a vision-capable model
        $model = $options['model'] ?? 'claude-sonnet-4-20250514';

        try {
            $response = Http::withHeaders([
                'x-api-key' => $apiKey,
                'anthropic-version' => '2023-06-01',
                'Content-Type' => 'application/json',
            ])->post('https://api.anthropic.com/v1/messages', [
                'model' => $model,
                'max_tokens' => $options['max_tokens'] ?? 2048,
                'messages' => [
                    [
                        'role' => 'user',
                        'content' => [
                            [
                                'type' => 'image',
                                'source' => [
                                    'type' => 'base64',
                                    'media_type' => $mimeType,
                                    'data' => $base64Image,
                                ],
                            ],
                            [
                                'type' => 'text',
                                'text' => $prompt,
                            ],
                        ],
                    ],
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
     * Analyze image using OpenAI.
     */
    protected function analyzeImageOpenAI(string $base64Image, string $mimeType, string $prompt, array $options = []): ?string
    {
        $apiKey = Setting::get('openai_api_key', $this->householdId);
        $baseUrl = Setting::get('openai_base_url', $this->householdId, 'https://api.openai.com/v1');
        // Use a vision-capable model
        $model = $options['model'] ?? 'gpt-4o';

        try {
            $response = Http::withHeaders([
                'Authorization' => "Bearer {$apiKey}",
                'Content-Type' => 'application/json',
            ])->post("{$baseUrl}/chat/completions", [
                'model' => $model,
                'max_tokens' => $options['max_tokens'] ?? 2048,
                'messages' => [
                    [
                        'role' => 'user',
                        'content' => [
                            [
                                'type' => 'text',
                                'text' => $prompt,
                            ],
                            [
                                'type' => 'image_url',
                                'image_url' => [
                                    'url' => "data:{$mimeType};base64,{$base64Image}",
                                ],
                            ],
                        ],
                    ],
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
     * Analyze image using Google Gemini.
     */
    protected function analyzeImageGemini(string $base64Image, string $mimeType, string $prompt, array $options = []): ?string
    {
        $apiKey = Setting::get('gemini_api_key', $this->householdId);
        $baseUrl = Setting::get('gemini_base_url', $this->householdId, 'https://generativelanguage.googleapis.com/v1beta');
        // Use a vision-capable model
        $model = $options['model'] ?? 'gemini-1.5-pro';

        try {
            $response = Http::withHeaders([
                'Content-Type' => 'application/json',
            ])->post("{$baseUrl}/models/{$model}:generateContent?key={$apiKey}", [
                'contents' => [
                    [
                        'parts' => [
                            ['text' => $prompt],
                            [
                                'inline_data' => [
                                    'mime_type' => $mimeType,
                                    'data' => $base64Image,
                                ],
                            ],
                        ],
                    ],
                ],
                'generationConfig' => [
                    'maxOutputTokens' => $options['max_tokens'] ?? 2048,
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
     * Analyze image using a local model (Ollama with vision model, or OpenAI-compatible).
     */
    protected function analyzeImageLocal(string $base64Image, string $mimeType, string $prompt, array $options = []): ?string
    {
        $baseUrl = Setting::get('local_base_url', $this->householdId);
        $apiKey = Setting::get('local_api_key', $this->householdId);
        $model = $options['model'] ?? Setting::get('local_model', $this->householdId, 'llava');

        // Detect if it's Ollama or OpenAI-compatible API
        $isOllama = str_contains($baseUrl, '11434');

        try {
            $headers = ['Content-Type' => 'application/json'];
            if ($apiKey) {
                $headers['Authorization'] = "Bearer {$apiKey}";
            }

            if ($isOllama) {
                // Ollama API format with images
                $response = Http::withHeaders($headers)
                    ->post("{$baseUrl}/api/generate", [
                        'model' => $model,
                        'prompt' => $prompt,
                        'images' => [$base64Image],
                        'stream' => false,
                    ]);

                if ($response->successful()) {
                    $data = $response->json();
                    return $data['response'] ?? null;
                }
            } else {
                // OpenAI-compatible API format
                $response = Http::withHeaders($headers)
                    ->post("{$baseUrl}/v1/chat/completions", [
                        'model' => $model,
                        'max_tokens' => $options['max_tokens'] ?? 2048,
                        'messages' => [
                            [
                                'role' => 'user',
                                'content' => [
                                    [
                                        'type' => 'text',
                                        'text' => $prompt,
                                    ],
                                    [
                                        'type' => 'image_url',
                                        'image_url' => [
                                            'url' => "data:{$mimeType};base64,{$base64Image}",
                                        ],
                                    ],
                                ],
                            ],
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
