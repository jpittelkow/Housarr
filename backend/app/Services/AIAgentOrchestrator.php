<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Facades\Http;
use Illuminate\Http\Client\Pool;

/**
 * AI Agent Orchestrator - Single entry point for all AI operations.
 *
 * This service manages multiple AI providers as "agents" that can be:
 * - Independently enabled/disabled
 * - Called individually or in parallel
 * - Summarized by a primary agent when calling multiple agents
 */
class AIAgentOrchestrator
{
    protected ?int $householdId;
    protected array $settings;
    protected array $agents = [];
    protected ?string $primaryAgent = null;

    public function __construct(?int $householdId = null)
    {
        $this->householdId = $householdId;
        $this->loadSettings();
        $this->initializeAgents();
    }

    /**
     * Create an orchestrator instance for a household.
     */
    public static function forHousehold(?int $householdId): self
    {
        return new self($householdId);
    }

    /**
     * Load all AI-related settings from the database.
     */
    protected function loadSettings(): void
    {
        $keys = [
            // Legacy settings
            'ai_provider',
            'ai_model',
            // API keys
            'anthropic_api_key',
            'openai_api_key',
            'gemini_api_key',
            'local_api_key',
            // Base URLs
            'openai_base_url',
            'gemini_base_url',
            'local_base_url',
            'local_model',
            // Agent-specific settings
            'ai_primary_agent',
        ];

        // Add agent-specific settings for each agent
        foreach (AIAgent::AGENTS as $agent) {
            $keys[] = "ai_agent_{$agent}_enabled";
            $keys[] = "ai_agent_{$agent}_model";
            $keys[] = "ai_agent_{$agent}_last_success";
            $keys[] = "ai_agent_{$agent}_test_result";
        }

        $this->settings = Setting::getMany($keys, $this->householdId);
        $this->primaryAgent = $this->settings['ai_primary_agent'] ?? null;

        // Migration: If no agents are enabled but legacy ai_provider is set,
        // auto-enable that agent and set it as primary
        $this->migrateFromLegacySettings();
    }

    /**
     * Migrate from legacy single-provider settings to new multi-agent system.
     */
    protected function migrateFromLegacySettings(): void
    {
        $legacyProvider = $this->settings['ai_provider'] ?? 'none';

        if ($legacyProvider !== 'none' && !$this->primaryAgent) {
            // Check if any agent is already enabled
            $anyEnabled = false;
            foreach (AIAgent::AGENTS as $agent) {
                if (($this->settings["ai_agent_{$agent}_enabled"] ?? '0') === '1') {
                    $anyEnabled = true;
                    break;
                }
            }

            // If no agents are enabled, migrate from legacy
            if (!$anyEnabled && in_array($legacyProvider, AIAgent::AGENTS)) {
                // Enable the legacy provider as an agent
                Setting::set("ai_agent_{$legacyProvider}_enabled", '1', $this->householdId);
                $this->settings["ai_agent_{$legacyProvider}_enabled"] = '1';

                // Set it as primary
                Setting::set('ai_primary_agent', $legacyProvider, $this->householdId);
                $this->primaryAgent = $legacyProvider;
                $this->settings['ai_primary_agent'] = $legacyProvider;

                // Migrate model if set
                $legacyModel = $this->settings['ai_model'] ?? null;
                if ($legacyModel) {
                    Setting::set("ai_agent_{$legacyProvider}_model", $legacyModel, $this->householdId);
                    $this->settings["ai_agent_{$legacyProvider}_model"] = $legacyModel;
                }
            }
        }
    }

    /**
     * Initialize agent objects from settings.
     */
    protected function initializeAgents(): void
    {
        foreach (AIAgent::AGENTS as $agentName) {
            $this->agents[$agentName] = AIAgent::fromSettings(
                $agentName,
                $this->settings,
                $this->primaryAgent
            );
        }
    }

    /**
     * Get the status of a specific agent.
     */
    public function getAgentStatus(string $name): ?AIAgent
    {
        return $this->agents[$name] ?? null;
    }

    /**
     * Get all agents with their status.
     */
    public function getAllAgentsStatus(): array
    {
        return array_values(array_map(fn(AIAgent $agent) => $agent->toArray(), $this->agents));
    }

    /**
     * Get the names of all active (enabled AND configured) agents.
     */
    public function getActiveAgents(): array
    {
        return array_keys(array_filter(
            $this->agents,
            fn(AIAgent $agent) => $agent->available
        ));
    }

    /**
     * Get the primary agent name.
     */
    public function getPrimaryAgent(): ?string
    {
        return $this->primaryAgent;
    }

    /**
     * Get the primary agent, or fall back to first available agent.
     */
    public function getPrimaryOrFirstAvailable(): ?string
    {
        if ($this->primaryAgent && ($this->agents[$this->primaryAgent]?->available ?? false)) {
            return $this->primaryAgent;
        }

        $active = $this->getActiveAgents();
        return $active[0] ?? null;
    }

    /**
     * Check if any AI agent is available.
     */
    public function isAvailable(): bool
    {
        return !empty($this->getActiveAgents());
    }

    /**
     * Call a specific agent with a prompt.
     */
    public function callAgent(string $name, string $prompt, array $options = []): array
    {
        $agent = $this->agents[$name] ?? null;

        if (!$agent) {
            return [
                'agent' => $name,
                'success' => false,
                'response' => null,
                'error' => "Unknown agent: {$name}",
                'duration_ms' => 0,
            ];
        }

        if (!$agent->available) {
            $reason = !$agent->enabled ? 'disabled' : 'not configured';
            return [
                'agent' => $name,
                'success' => false,
                'response' => null,
                'error' => "Agent {$name} is {$reason}",
                'duration_ms' => 0,
            ];
        }

        $startTime = microtime(true);
        $result = $this->executeAgentCall($name, $prompt, $options);
        $duration = (int) ((microtime(true) - $startTime) * 1000);

        if ($result['response']) {
            $this->recordSuccessfulCall($name);
        }

        return [
            'agent' => $name,
            'success' => $result['response'] !== null,
            'response' => $result['response'],
            'error' => $result['error'],
            'duration_ms' => $duration,
        ];
    }

    /**
     * Execute the actual API call to an agent.
     */
    protected function executeAgentCall(string $name, string $prompt, array $options = []): array
    {
        $model = $this->agents[$name]->model ?? AIAgent::DEFAULT_MODELS[$name];
        $options['model'] = $model;

        return match ($name) {
            'claude' => $this->callClaude($prompt, $options),
            'openai' => $this->callOpenAI($prompt, $options),
            'gemini' => $this->callGemini($prompt, $options),
            'local' => $this->callLocal($prompt, $options),
            default => ['response' => null, 'error' => 'Unknown agent'],
        };
    }

    /**
     * Call all active agents in parallel.
     */
    public function callActiveAgents(string $prompt, array $options = []): array
    {
        $activeAgents = $this->getActiveAgents();

        if (empty($activeAgents)) {
            return [
                'agents' => [],
                'primary' => null,
            ];
        }

        $results = [];
        $startTime = microtime(true);

        // Call each agent
        foreach ($activeAgents as $agentName) {
            $results[$agentName] = $this->callAgent($agentName, $prompt, $options);
        }

        return [
            'agents' => $results,
            'primary' => $this->primaryAgent,
            'total_duration_ms' => (int) ((microtime(true) - $startTime) * 1000),
        ];
    }

    /**
     * Call all active agents and summarize results using the primary agent.
     */
    public function callActiveAgentsWithSummary(string $prompt, array $options = []): array
    {
        $results = $this->callActiveAgents($prompt, $options);

        if (empty($results['agents'])) {
            return $results;
        }

        // If only one agent, no need to summarize
        $successfulResponses = array_filter(
            $results['agents'],
            fn($r) => $r['success'] && $r['response']
        );

        if (count($successfulResponses) <= 1) {
            $single = reset($successfulResponses);
            $results['summary'] = $single['response'] ?? null;
            return $results;
        }

        // Get the primary agent for summarization
        $primary = $this->getPrimaryOrFirstAvailable();
        if (!$primary) {
            $results['summary'] = null;
            $results['summary_error'] = 'No primary agent available for summarization';
            return $results;
        }

        // Build summarization prompt
        $responsesText = '';
        foreach ($successfulResponses as $agentName => $result) {
            $responsesText .= "\n\n--- Response from {$agentName} ---\n{$result['response']}";
        }

        $summaryPrompt = "You are summarizing responses from multiple AI assistants to the same question. "
            . "Synthesize the best answer, combining insights from all responses while eliminating redundancy. "
            . "If there are conflicting answers, note the disagreement. "
            . "Original question: {$prompt}\n\nResponses:{$responsesText}\n\nProvide a synthesized summary:";

        $summaryResult = $this->callAgent($primary, $summaryPrompt, $options);
        $results['summary'] = $summaryResult['response'];
        $results['summary_error'] = $summaryResult['error'];
        $results['summary_agent'] = $primary;

        return $results;
    }

    // ========================================
    // Image Analysis Methods (Multi-Agent)
    // ========================================

    /**
     * Analyze an image using a specific agent.
     */
    public function analyzeImageWithAgent(string $name, string $base64Image, string $mimeType, string $prompt, array $options = []): array
    {
        $agent = $this->agents[$name] ?? null;

        if (!$agent) {
            return [
                'agent' => $name,
                'success' => false,
                'response' => null,
                'error' => "Unknown agent: {$name}",
                'duration_ms' => 0,
            ];
        }

        if (!$agent->available) {
            $reason = !$agent->enabled ? 'disabled' : 'not configured';
            return [
                'agent' => $name,
                'success' => false,
                'response' => null,
                'error' => "Agent {$name} is {$reason}",
                'duration_ms' => 0,
            ];
        }

        $startTime = microtime(true);
        $model = $agent->model ?? AIAgent::DEFAULT_MODELS[$name];
        $options['model'] = $model;

        $result = match ($name) {
            'claude' => $this->analyzeImageClaude($base64Image, $mimeType, $prompt, $options),
            'openai' => $this->analyzeImageOpenAI($base64Image, $mimeType, $prompt, $options),
            'gemini' => $this->analyzeImageGemini($base64Image, $mimeType, $prompt, $options),
            'local' => $this->analyzeImageLocal($base64Image, $mimeType, $prompt, $options),
            default => ['response' => null, 'error' => 'Unknown agent'],
        };

        $duration = (int) ((microtime(true) - $startTime) * 1000);

        if ($result['response']) {
            $this->recordSuccessfulCall($name);
        }

        return [
            'agent' => $name,
            'success' => $result['response'] !== null,
            'response' => $result['response'],
            'error' => $result['error'],
            'duration_ms' => $duration,
        ];
    }

    /**
     * Analyze an image using ALL active agents in parallel.
     */
    public function analyzeImageWithAllAgents(string $base64Image, string $mimeType, string $prompt, array $options = []): array
    {
        $activeAgents = $this->getActiveAgents();

        if (empty($activeAgents)) {
            return [
                'agents' => [],
                'primary' => null,
                'total_duration_ms' => 0,
            ];
        }

        $results = [];
        $startTime = microtime(true);

        // Call each agent with the image
        foreach ($activeAgents as $agentName) {
            $results[$agentName] = $this->analyzeImageWithAgent($agentName, $base64Image, $mimeType, $prompt, $options);
        }

        return [
            'agents' => $results,
            'primary' => $this->primaryAgent,
            'total_duration_ms' => (int) ((microtime(true) - $startTime) * 1000),
        ];
    }

    /**
     * Analyze an image with all agents and synthesize results using the primary agent.
     */
    public function analyzeImageWithAllAgentsAndSynthesize(string $base64Image, string $mimeType, string $prompt, array $options = []): array
    {
        $results = $this->analyzeImageWithAllAgents($base64Image, $mimeType, $prompt, $options);

        if (empty($results['agents'])) {
            return $results;
        }

        // Get successful responses
        $successfulResponses = array_filter(
            $results['agents'],
            fn($r) => $r['success'] && $r['response']
        );

        // If only one agent succeeded, use its response directly
        if (count($successfulResponses) <= 1) {
            $single = reset($successfulResponses);
            $results['synthesized'] = $single['response'] ?? null;
            $results['agents_succeeded'] = count($successfulResponses);
            return $results;
        }

        // Get the primary agent for synthesis
        $primary = $this->getPrimaryOrFirstAvailable();
        if (!$primary) {
            $results['synthesized'] = null;
            $results['synthesis_error'] = 'No primary agent available for synthesis';
            $results['agents_succeeded'] = count($successfulResponses);
            return $results;
        }

        // Build synthesis prompt for product identification
        $responsesText = '';
        foreach ($successfulResponses as $agentName => $result) {
            $responsesText .= "\n\n--- Response from {$agentName} ---\n{$result['response']}";
        }

        $synthesisPrompt = <<<PROMPT
You are synthesizing product identification responses from multiple AI assistants.
Each assistant was asked to identify products from the same image or search query.

Your task:
1. Compare all responses and find consensus on make, model, and product type
2. If agents disagree, use your knowledge to determine the most likely correct answer
3. Combine confidence scores - if multiple agents agree, confidence should be higher
4. Return a single consolidated JSON array of the best product matches

Original analysis prompt: {$prompt}

Responses from different AI assistants:
{$responsesText}

Return ONLY a valid JSON array with the synthesized best matches, ranked by confidence.
Format:
[
  { "make": "Brand", "model": "Model", "type": "Category", "confidence": 0.95, "agents_agreed": 3 },
  { "make": "Brand", "model": "Alt Model", "type": "Category", "confidence": 0.70, "agents_agreed": 2 }
]
PROMPT;

        $synthesisResult = $this->callAgent($primary, $synthesisPrompt, array_merge($options, ['max_tokens' => 2048]));
        $results['synthesized'] = $synthesisResult['response'];
        $results['synthesis_error'] = $synthesisResult['error'];
        $results['synthesis_agent'] = $primary;
        $results['agents_succeeded'] = count($successfulResponses);

        return $results;
    }

    // ========================================
    // Provider-specific Image Analysis Methods
    // ========================================

    protected function analyzeImageClaude(string $base64Image, string $mimeType, string $prompt, array $options = []): array
    {
        $apiKey = $this->settings['anthropic_api_key'];
        $model = $options['model'] ?? 'claude-sonnet-4-20250514';

        try {
            $response = Http::withHeaders([
                'x-api-key' => $apiKey,
                'anthropic-version' => '2023-06-01',
                'Content-Type' => 'application/json',
            ])->timeout($options['timeout'] ?? 60)->post('https://api.anthropic.com/v1/messages', [
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
                return ['response' => $data['content'][0]['text'] ?? null, 'error' => null];
            }

            $error = $response->json();
            $errorMsg = $error['error']['message'] ?? "API error: HTTP {$response->status()}";
            return ['response' => null, 'error' => "Claude: $errorMsg"];
        } catch (\Exception $e) {
            report($e);
            return ['response' => null, 'error' => "Claude: {$e->getMessage()}"];
        }
    }

    protected function analyzeImageOpenAI(string $base64Image, string $mimeType, string $prompt, array $options = []): array
    {
        $apiKey = $this->settings['openai_api_key'];
        $baseUrl = rtrim($this->settings['openai_base_url'] ?? 'https://api.openai.com/v1', '/');
        $model = $options['model'] ?? 'gpt-4o';

        try {
            $response = Http::withHeaders([
                'Authorization' => "Bearer {$apiKey}",
                'Content-Type' => 'application/json',
            ])->timeout($options['timeout'] ?? 60)->post("{$baseUrl}/chat/completions", [
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
                return ['response' => $data['choices'][0]['message']['content'] ?? null, 'error' => null];
            }

            $error = $response->json();
            $errorMsg = $error['error']['message'] ?? "API error: HTTP {$response->status()}";
            return ['response' => null, 'error' => "OpenAI: $errorMsg"];
        } catch (\Exception $e) {
            report($e);
            return ['response' => null, 'error' => "OpenAI: {$e->getMessage()}"];
        }
    }

    protected function analyzeImageGemini(string $base64Image, string $mimeType, string $prompt, array $options = []): array
    {
        $apiKey = $this->settings['gemini_api_key'];
        $baseUrl = $this->settings['gemini_base_url'] ?? 'https://generativelanguage.googleapis.com/v1beta';
        $model = $options['model'] ?? 'gemini-1.5-pro';

        try {
            $response = Http::withHeaders([
                'Content-Type' => 'application/json',
            ])->timeout($options['timeout'] ?? 60)->post("{$baseUrl}/models/{$model}:generateContent?key={$apiKey}", [
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
                return ['response' => $data['candidates'][0]['content']['parts'][0]['text'] ?? null, 'error' => null];
            }

            $error = $response->json();
            $errorMsg = $error['error']['message'] ?? "API error: HTTP {$response->status()}";
            return ['response' => null, 'error' => "Gemini: $errorMsg"];
        } catch (\Exception $e) {
            report($e);
            return ['response' => null, 'error' => "Gemini: {$e->getMessage()}"];
        }
    }

    protected function analyzeImageLocal(string $base64Image, string $mimeType, string $prompt, array $options = []): array
    {
        $baseUrl = $this->settings['local_base_url'];
        $apiKey = $this->settings['local_api_key'];
        $model = $options['model'] ?? $this->settings['local_model'] ?? 'llava';

        $isOllama = str_contains($baseUrl, '11434');

        try {
            $headers = ['Content-Type' => 'application/json'];
            if ($apiKey) {
                $headers['Authorization'] = "Bearer {$apiKey}";
            }

            if ($isOllama) {
                // Ollama API format with images
                $response = Http::withHeaders($headers)
                    ->timeout($options['timeout'] ?? 120)
                    ->post("{$baseUrl}/api/generate", [
                        'model' => $model,
                        'prompt' => $prompt,
                        'images' => [$base64Image],
                        'stream' => false,
                    ]);

                if ($response->successful()) {
                    $data = $response->json();
                    return ['response' => $data['response'] ?? null, 'error' => null];
                }
            } else {
                // OpenAI-compatible API format
                $response = Http::withHeaders($headers)
                    ->timeout($options['timeout'] ?? 60)
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
                    return ['response' => $data['choices'][0]['message']['content'] ?? null, 'error' => null];
                }
            }

            $error = $response->json();
            $errorMsg = $error['error']['message'] ?? $error['error'] ?? "API error: HTTP {$response->status()}";
            return ['response' => null, 'error' => "Local: $errorMsg"];
        } catch (\Exception $e) {
            report($e);
            return ['response' => null, 'error' => "Local: {$e->getMessage()}"];
        }
    }

    /**
     * Test connection for a specific agent.
     */
    public function testAgent(string $name): array
    {
        $agent = $this->agents[$name] ?? null;

        if (!$agent) {
            return [
                'success' => false,
                'message' => "Unknown agent: {$name}",
            ];
        }

        if (!$agent->configured) {
            return [
                'success' => false,
                'message' => "Agent {$name} is not configured",
            ];
        }

        $startTime = microtime(true);
        $result = $this->executeAgentCall($name, 'Respond with only the word "OK" and nothing else.', []);
        $duration = (int) ((microtime(true) - $startTime) * 1000);

        $success = $result['response'] !== null;

        // Record the test result
        $this->recordTestResult($name, $success, $result['error']);

        return [
            'success' => $success,
            'message' => $success ? 'Connection successful!' : ($result['error'] ?? 'Connection failed'),
            'model' => $this->agents[$name]->model ?? AIAgent::DEFAULT_MODELS[$name],
            'response_time_ms' => $duration,
        ];
    }

    /**
     * Set whether an agent is enabled.
     */
    public function setAgentEnabled(string $name, bool $enabled): void
    {
        if (!in_array($name, AIAgent::AGENTS)) {
            throw new \InvalidArgumentException("Invalid agent name: {$name}");
        }

        Setting::set("ai_agent_{$name}_enabled", $enabled ? '1' : '0', $this->householdId);
        $this->settings["ai_agent_{$name}_enabled"] = $enabled ? '1' : '0';

        // Refresh the agent
        $this->agents[$name] = AIAgent::fromSettings($name, $this->settings, $this->primaryAgent);
    }

    /**
     * Set the primary agent.
     */
    public function setPrimaryAgent(string $name): void
    {
        if (!in_array($name, AIAgent::AGENTS)) {
            throw new \InvalidArgumentException("Invalid agent name: {$name}");
        }

        Setting::set('ai_primary_agent', $name, $this->householdId);
        $this->primaryAgent = $name;
        $this->settings['ai_primary_agent'] = $name;

        // Refresh all agents to update isPrimary flag
        $this->initializeAgents();
    }

    /**
     * Update an agent's model.
     */
    public function setAgentModel(string $name, ?string $model): void
    {
        if (!in_array($name, AIAgent::AGENTS)) {
            throw new \InvalidArgumentException("Invalid agent name: {$name}");
        }

        if ($model) {
            Setting::set("ai_agent_{$name}_model", $model, $this->householdId);
        } else {
            // Clear the model override
            Setting::where('household_id', $this->householdId)
                ->where('key', "ai_agent_{$name}_model")
                ->delete();
        }

        $this->settings["ai_agent_{$name}_model"] = $model;
        $this->agents[$name] = AIAgent::fromSettings($name, $this->settings, $this->primaryAgent);
    }

    /**
     * Record a successful AI call for an agent.
     */
    public function recordSuccessfulCall(string $name): void
    {
        $timestamp = now()->toIso8601String();
        Setting::set("ai_agent_{$name}_last_success", $timestamp, $this->householdId);
        $this->settings["ai_agent_{$name}_last_success"] = $timestamp;
    }

    /**
     * Record a test result for an agent.
     */
    public function recordTestResult(string $name, bool $success, ?string $error = null): void
    {
        $result = json_encode([
            'success' => $success,
            'tested_at' => now()->toIso8601String(),
            'error' => $error,
        ]);

        Setting::set("ai_agent_{$name}_test_result", $result, $this->householdId);
        $this->settings["ai_agent_{$name}_test_result"] = $result;
    }

    // ========================================
    // Provider-specific API call methods
    // ========================================

    protected function callClaude(string $prompt, array $options = []): array
    {
        $apiKey = $this->settings['anthropic_api_key'];
        $model = $options['model'] ?? AIAgent::DEFAULT_MODELS['claude'];

        try {
            $response = Http::withHeaders([
                'x-api-key' => $apiKey,
                'anthropic-version' => '2023-06-01',
                'Content-Type' => 'application/json',
            ])->timeout($options['timeout'] ?? 30)->post('https://api.anthropic.com/v1/messages', [
                'model' => $model,
                'max_tokens' => $options['max_tokens'] ?? 1024,
                'messages' => [
                    ['role' => 'user', 'content' => $prompt],
                ],
            ]);

            if ($response->successful()) {
                $data = $response->json();
                return ['response' => $data['content'][0]['text'] ?? null, 'error' => null];
            }

            $error = $response->json();
            $errorMsg = $error['error']['message'] ?? "API error: HTTP {$response->status()}";
            return ['response' => null, 'error' => "Claude: $errorMsg"];
        } catch (\Exception $e) {
            report($e);
            return ['response' => null, 'error' => "Claude: {$e->getMessage()}"];
        }
    }

    protected function callOpenAI(string $prompt, array $options = []): array
    {
        $apiKey = $this->settings['openai_api_key'];
        $baseUrl = rtrim($this->settings['openai_base_url'] ?? 'https://api.openai.com/v1', '/');
        $model = $options['model'] ?? AIAgent::DEFAULT_MODELS['openai'];

        try {
            $response = Http::withHeaders([
                'Authorization' => "Bearer {$apiKey}",
                'Content-Type' => 'application/json',
            ])->timeout($options['timeout'] ?? 30)->post("{$baseUrl}/chat/completions", [
                'model' => $model,
                'max_tokens' => $options['max_tokens'] ?? 1024,
                'messages' => [
                    ['role' => 'user', 'content' => $prompt],
                ],
            ]);

            if ($response->successful()) {
                $data = $response->json();
                return ['response' => $data['choices'][0]['message']['content'] ?? null, 'error' => null];
            }

            $error = $response->json();
            $errorMsg = $error['error']['message'] ?? "API error: HTTP {$response->status()}";
            return ['response' => null, 'error' => "OpenAI: $errorMsg"];
        } catch (\Exception $e) {
            report($e);
            return ['response' => null, 'error' => "OpenAI: {$e->getMessage()}"];
        }
    }

    protected function callGemini(string $prompt, array $options = []): array
    {
        $apiKey = $this->settings['gemini_api_key'];
        $baseUrl = $this->settings['gemini_base_url'] ?? 'https://generativelanguage.googleapis.com/v1beta';
        $model = $options['model'] ?? AIAgent::DEFAULT_MODELS['gemini'];

        try {
            $response = Http::withHeaders([
                'Content-Type' => 'application/json',
            ])->timeout($options['timeout'] ?? 30)->post("{$baseUrl}/models/{$model}:generateContent?key={$apiKey}", [
                'contents' => [
                    ['parts' => [['text' => $prompt]]],
                ],
                'generationConfig' => [
                    'maxOutputTokens' => $options['max_tokens'] ?? 1024,
                ],
            ]);

            if ($response->successful()) {
                $data = $response->json();
                return ['response' => $data['candidates'][0]['content']['parts'][0]['text'] ?? null, 'error' => null];
            }

            $error = $response->json();
            $errorMsg = $error['error']['message'] ?? "API error: HTTP {$response->status()}";
            return ['response' => null, 'error' => "Gemini: $errorMsg"];
        } catch (\Exception $e) {
            report($e);
            return ['response' => null, 'error' => "Gemini: {$e->getMessage()}"];
        }
    }

    protected function callLocal(string $prompt, array $options = []): array
    {
        $baseUrl = $this->settings['local_base_url'];
        $apiKey = $this->settings['local_api_key'];
        $model = $options['model'] ?? $this->settings['local_model'] ?? AIAgent::DEFAULT_MODELS['local'];

        $isOllama = str_contains($baseUrl, '11434');

        try {
            $headers = ['Content-Type' => 'application/json'];
            if ($apiKey) {
                $headers['Authorization'] = "Bearer {$apiKey}";
            }

            if ($isOllama) {
                $response = Http::withHeaders($headers)
                    ->timeout($options['timeout'] ?? 60)
                    ->post("{$baseUrl}/api/generate", [
                        'model' => $model,
                        'prompt' => $prompt,
                        'stream' => false,
                    ]);

                if ($response->successful()) {
                    $data = $response->json();
                    return ['response' => $data['response'] ?? null, 'error' => null];
                }
            } else {
                $response = Http::withHeaders($headers)
                    ->timeout($options['timeout'] ?? 30)
                    ->post("{$baseUrl}/v1/chat/completions", [
                        'model' => $model,
                        'max_tokens' => $options['max_tokens'] ?? 1024,
                        'messages' => [
                            ['role' => 'user', 'content' => $prompt],
                        ],
                    ]);

                if ($response->successful()) {
                    $data = $response->json();
                    return ['response' => $data['choices'][0]['message']['content'] ?? null, 'error' => null];
                }
            }

            $error = $response->json();
            $errorMsg = $error['error']['message'] ?? $error['error'] ?? "API error: HTTP {$response->status()}";
            return ['response' => null, 'error' => "Local: $errorMsg"];
        } catch (\Exception $e) {
            report($e);
            return ['response' => null, 'error' => "Local: {$e->getMessage()}"];
        }
    }
}
