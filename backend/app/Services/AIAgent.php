<?php

namespace App\Services;

/**
 * Value object representing an AI agent's configuration and status.
 *
 * An agent is a provider (Claude, OpenAI, Gemini, Local) that can be independently
 * configured, enabled/disabled, and used for AI operations.
 */
class AIAgent
{
    public const AGENTS = ['claude', 'openai', 'gemini', 'local'];

    public const DISPLAY_NAMES = [
        'claude' => 'Claude (Anthropic)',
        'openai' => 'OpenAI',
        'gemini' => 'Gemini (Google)',
        'local' => 'Local Model',
    ];

    public const DEFAULT_MODELS = [
        'claude' => 'claude-sonnet-4-20250514',
        'openai' => 'gpt-4o',
        'gemini' => 'gemini-1.5-pro',
        'local' => 'llama3',
    ];

    public function __construct(
        public readonly string $name,
        public readonly string $displayName,
        public readonly bool $enabled,
        public readonly bool $configured,
        public readonly bool $available,
        public readonly ?string $model,
        public readonly ?string $lastSuccessAt,
        public readonly ?array $lastTestResult,
        public readonly bool $isPrimary,
    ) {}

    /**
     * Create an AIAgent from settings array.
     */
    public static function fromSettings(string $name, array $settings, ?string $primaryAgent): self
    {
        if (!in_array($name, self::AGENTS)) {
            throw new \InvalidArgumentException("Invalid agent name: {$name}");
        }

        $enabled = ($settings["ai_agent_{$name}_enabled"] ?? '0') === '1';
        $configured = self::isConfigured($name, $settings);
        $model = $settings["ai_agent_{$name}_model"] ?? null;
        $lastSuccessAt = $settings["ai_agent_{$name}_last_success"] ?? null;
        $lastTestResultJson = $settings["ai_agent_{$name}_test_result"] ?? null;
        $lastTestResult = $lastTestResultJson ? json_decode($lastTestResultJson, true) : null;

        return new self(
            name: $name,
            displayName: self::DISPLAY_NAMES[$name],
            enabled: $enabled,
            configured: $configured,
            available: $enabled && $configured,
            model: $model,
            lastSuccessAt: $lastSuccessAt,
            lastTestResult: $lastTestResult,
            isPrimary: $primaryAgent === $name,
        );
    }

    /**
     * Check if an agent has the required credentials configured.
     */
    public static function isConfigured(string $name, array $settings): bool
    {
        return match ($name) {
            'claude' => !empty($settings['anthropic_api_key']),
            'openai' => !empty($settings['openai_api_key']),
            'gemini' => !empty($settings['gemini_api_key']),
            'local' => !empty($settings['local_base_url']),
            default => false,
        };
    }

    /**
     * Get the API key setting name for an agent.
     */
    public static function getApiKeySettingName(string $name): ?string
    {
        return match ($name) {
            'claude' => 'anthropic_api_key',
            'openai' => 'openai_api_key',
            'gemini' => 'gemini_api_key',
            'local' => 'local_api_key',
            default => null,
        };
    }

    /**
     * Get the base URL setting name for an agent (if applicable).
     */
    public static function getBaseUrlSettingName(string $name): ?string
    {
        return match ($name) {
            'openai' => 'openai_base_url',
            'gemini' => 'gemini_base_url',
            'local' => 'local_base_url',
            default => null,
        };
    }

    /**
     * Convert to array for JSON serialization.
     */
    public function toArray(): array
    {
        return [
            'name' => $this->name,
            'display_name' => $this->displayName,
            'enabled' => $this->enabled,
            'configured' => $this->configured,
            'available' => $this->available,
            'model' => $this->model,
            'default_model' => self::DEFAULT_MODELS[$this->name] ?? null,
            'last_success_at' => $this->lastSuccessAt,
            'last_test' => $this->lastTestResult,
            'is_primary' => $this->isPrimary,
        ];
    }
}
