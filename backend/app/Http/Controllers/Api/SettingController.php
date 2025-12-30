<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Services\AIAgent;
use App\Services\AIAgentOrchestrator;
use App\Services\AIService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    /**
     * Get household settings (non-sensitive only).
     */
    public function index(Request $request): JsonResponse
    {
        $householdId = $request->user()->household_id;

        // Whitelist of readable settings keys (non-sensitive)
        $readableKeys = [
            // Storage
            'storage_driver',
            'aws_default_region',
            'aws_bucket',
            'aws_endpoint',
            // Email
            'mail_driver',
            'mail_host',
            'mail_port',
            'mail_encryption',
            'mail_from_address',
            'mail_from_name',
            'mailgun_domain',
            'mailgun_endpoint',
            'ses_region',
            'cloudflare_account_id',
            // AI
            'ai_provider',
            'ai_model',
            'openai_base_url',
            'gemini_base_url',
            'local_base_url',
            'local_model',
        ];

        // Fetch all settings in a single query (including encrypted keys for flag checking)
        $encryptedKeys = ['anthropic_api_key', 'openai_api_key', 'gemini_api_key', 'local_api_key'];
        $allSettings = Setting::getMany(array_merge($readableKeys, $encryptedKeys), $householdId);

        // Separate readable settings from encrypted key flags
        $settings = array_filter(
            array_intersect_key($allSettings, array_flip($readableKeys)),
            fn($value) => $value !== null
        );

        // Build flags without additional queries
        $encryptedKeyFlags = [
            'anthropic_api_key_set' => !empty($allSettings['anthropic_api_key'] ?? null),
            'openai_api_key_set' => !empty($allSettings['openai_api_key'] ?? null),
            'gemini_api_key_set' => !empty($allSettings['gemini_api_key'] ?? null),
            'local_api_key_set' => !empty($allSettings['local_api_key'] ?? null),
        ];

        return response()->json([
            'settings' => $settings,
            'key_status' => $encryptedKeyFlags,
        ]);
    }

    /**
     * Update household settings (admin only).
     */
    public function update(Request $request): JsonResponse
    {
        if (!$request->user()->isAdmin()) {
            abort(403, 'Only admins can update settings');
        }

        $validated = $request->validate([
            'settings' => ['required', 'array'],
            // Storage settings
            'settings.storage_driver' => ['sometimes', 'in:local,s3'],
            'settings.aws_access_key_id' => ['sometimes', 'nullable', 'string', 'max:255'],
            'settings.aws_secret_access_key' => ['sometimes', 'nullable', 'string', 'max:255'],
            'settings.aws_default_region' => ['sometimes', 'nullable', 'string', 'max:255'],
            'settings.aws_bucket' => ['sometimes', 'nullable', 'string', 'max:255'],
            'settings.aws_endpoint' => ['sometimes', 'nullable', 'url', 'max:255'],
            // Email settings
            'settings.mail_driver' => ['sometimes', 'in:smtp,mailgun,sendgrid,ses,cloudflare,log'],
            'settings.mail_host' => ['sometimes', 'nullable', 'string', 'max:255'],
            'settings.mail_port' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:65535'],
            'settings.mail_username' => ['sometimes', 'nullable', 'string', 'max:255'],
            'settings.mail_password' => ['sometimes', 'nullable', 'string', 'max:255'],
            'settings.mail_encryption' => ['sometimes', 'nullable', 'in:tls,ssl,null'],
            'settings.mail_from_address' => ['sometimes', 'nullable', 'email', 'max:255'],
            'settings.mail_from_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            // Mailgun
            'settings.mailgun_domain' => ['sometimes', 'nullable', 'string', 'max:255'],
            'settings.mailgun_secret' => ['sometimes', 'nullable', 'string', 'max:255'],
            'settings.mailgun_endpoint' => ['sometimes', 'nullable', 'string', 'max:255'],
            // SendGrid
            'settings.sendgrid_api_key' => ['sometimes', 'nullable', 'string', 'max:255'],
            // SES
            'settings.ses_key' => ['sometimes', 'nullable', 'string', 'max:255'],
            'settings.ses_secret' => ['sometimes', 'nullable', 'string', 'max:255'],
            'settings.ses_region' => ['sometimes', 'nullable', 'string', 'max:255'],
            // Cloudflare
            'settings.cloudflare_api_token' => ['sometimes', 'nullable', 'string', 'max:255'],
            'settings.cloudflare_account_id' => ['sometimes', 'nullable', 'string', 'max:255'],
            // AI settings
            'settings.ai_provider' => ['sometimes', 'in:none,claude,openai,gemini,local'],
            'settings.ai_model' => ['sometimes', 'nullable', 'string', 'max:255'],
            'settings.anthropic_api_key' => ['sometimes', 'nullable', 'string', 'max:255'],
            'settings.openai_api_key' => ['sometimes', 'nullable', 'string', 'max:255'],
            'settings.openai_base_url' => ['sometimes', 'nullable', 'url', 'max:255'],
            'settings.gemini_api_key' => ['sometimes', 'nullable', 'string', 'max:255'],
            'settings.gemini_base_url' => ['sometimes', 'nullable', 'url', 'max:255'],
            'settings.local_base_url' => ['sometimes', 'nullable', 'url', 'max:255'],
            'settings.local_model' => ['sometimes', 'nullable', 'string', 'max:255'],
            'settings.local_api_key' => ['sometimes', 'nullable', 'string', 'max:255'],
        ]);

        $householdId = $request->user()->household_id;

        // Keys that should be encrypted
        $encryptedKeys = [
            'aws_access_key_id',
            'aws_secret_access_key',
            'mail_username',
            'mail_password',
            'mailgun_secret',
            'sendgrid_api_key',
            'ses_key',
            'ses_secret',
            'cloudflare_api_token',
            'anthropic_api_key',
            'openai_api_key',
            'gemini_api_key',
            'local_api_key',
        ];

        foreach ($validated['settings'] as $key => $value) {
            // Handle deletion of encrypted keys
            if (in_array($key, $encryptedKeys) && $value === '__DELETE__') {
                Setting::where('household_id', $householdId)
                    ->where('key', $key)
                    ->delete();
                continue;
            }
            // Skip empty strings for encrypted fields (means "keep current")
            if (in_array($key, $encryptedKeys) && $value === '') {
                continue;
            }
            $isEncrypted = in_array($key, $encryptedKeys);
            Setting::set($key, $value, $householdId, $isEncrypted);
        }

        return response()->json(['message' => 'Settings updated successfully']);
    }

    /**
     * Check if S3 credentials are configured.
     */
    public function checkStorage(Request $request): JsonResponse
    {
        $householdId = $request->user()->household_id;

        // Batch all storage settings in one query
        $storageSettings = Setting::getMany([
            'storage_driver', 'aws_access_key_id', 'aws_secret_access_key', 'aws_bucket'
        ], $householdId);

        $driver = $storageSettings['storage_driver'] ?? 'local';
        $hasS3Credentials = $driver === 's3'
            && !empty($storageSettings['aws_access_key_id'])
            && !empty($storageSettings['aws_secret_access_key'])
            && !empty($storageSettings['aws_bucket']);

        return response()->json([
            'driver' => $driver,
            'configured' => $driver === 'local' || $hasS3Credentials,
        ]);
    }

    /**
     * Check email configuration status.
     */
    public function checkEmail(Request $request): JsonResponse
    {
        $householdId = $request->user()->household_id;

        // Batch all email settings in one query
        $emailSettings = Setting::getMany([
            'mail_driver', 'mail_host', 'mailgun_domain', 'mailgun_secret',
            'sendgrid_api_key', 'ses_key', 'ses_secret',
            'cloudflare_api_token', 'cloudflare_account_id'
        ], $householdId);

        $driver = $emailSettings['mail_driver'] ?? 'log';

        $configured = match ($driver) {
            'log' => true,
            'smtp' => !empty($emailSettings['mail_host']),
            'mailgun' => !empty($emailSettings['mailgun_domain']) && !empty($emailSettings['mailgun_secret']),
            'sendgrid' => !empty($emailSettings['sendgrid_api_key']),
            'ses' => !empty($emailSettings['ses_key']) && !empty($emailSettings['ses_secret']),
            'cloudflare' => !empty($emailSettings['cloudflare_api_token']) && !empty($emailSettings['cloudflare_account_id']),
            default => false,
        };

        return response()->json([
            'driver' => $driver,
            'configured' => $configured,
        ]);
    }

    /**
     * Check AI configuration status.
     */
    public function checkAI(Request $request): JsonResponse
    {
        $householdId = $request->user()->household_id;

        // Batch all AI settings in one query
        $aiSettings = Setting::getMany([
            'ai_provider', 'anthropic_api_key', 'openai_api_key',
            'gemini_api_key', 'local_base_url'
        ], $householdId);

        $provider = $aiSettings['ai_provider'] ?? 'none';

        $configured = match ($provider) {
            'none' => true,
            'claude' => !empty($aiSettings['anthropic_api_key']),
            'openai' => !empty($aiSettings['openai_api_key']),
            'gemini' => !empty($aiSettings['gemini_api_key']),
            'local' => !empty($aiSettings['local_base_url']),
            default => false,
        };

        return response()->json([
            'provider' => $provider,
            'configured' => $configured,
        ]);
    }

    /**
     * Test AI connection by making a simple request.
     */
    public function testAI(Request $request): JsonResponse
    {
        $householdId = $request->user()->household_id;

        // If settings are passed in the request, temporarily save them for testing
        $testSettings = $request->input('settings');
        if ($testSettings) {
            // Temporarily set the settings for this request
            $encryptedKeys = [
                'anthropic_api_key',
                'openai_api_key',
                'gemini_api_key',
                'local_api_key',
            ];

            foreach ($testSettings as $key => $value) {
                if ($value !== '' && $value !== null) {
                    $isEncrypted = in_array($key, $encryptedKeys);
                    Setting::set($key, $value, $householdId, $isEncrypted);
                }
            }
        }

        $aiService = AIService::forHousehold($householdId);

        if (!$aiService->isAvailable()) {
            return response()->json([
                'success' => false,
                'message' => 'AI is not configured. Please set up an AI provider first.',
            ], 422);
        }

        // Try a simple completion request with error details
        $result = $aiService->completeWithError('Respond with only the word "OK" and nothing else.');

        if ($result['error']) {
            return response()->json([
                'success' => false,
                'message' => $result['error'],
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'AI connection successful!',
            'provider' => $aiService->getProvider(),
            'model' => $aiService->getModel(),
        ]);
    }

    /**
     * Get all AI agents with their status.
     */
    public function getAgentsStatus(Request $request): JsonResponse
    {
        $householdId = $request->user()->household_id;
        $orchestrator = AIAgentOrchestrator::forHousehold($householdId);

        // Get key status for each agent (whether API key is set)
        $keyStatus = [];
        $settings = Setting::getMany([
            'anthropic_api_key',
            'openai_api_key',
            'gemini_api_key',
            'local_api_key',
        ], $householdId);

        foreach (AIAgent::AGENTS as $agent) {
            $keyName = AIAgent::getApiKeySettingName($agent);
            $keyStatus[$agent] = !empty($settings[$keyName] ?? null);
        }

        return response()->json([
            'agents' => $orchestrator->getAllAgentsStatus(),
            'primary_agent' => $orchestrator->getPrimaryAgent(),
            'key_status' => $keyStatus,
        ]);
    }

    /**
     * Update an AI agent's settings.
     */
    public function updateAgent(Request $request, string $agent): JsonResponse
    {
        if (!$request->user()->isAdmin()) {
            abort(403, 'Only admins can update AI agent settings');
        }

        if (!in_array($agent, AIAgent::AGENTS)) {
            abort(404, 'Unknown agent');
        }

        $validated = $request->validate([
            'enabled' => ['sometimes', 'boolean'],
            'model' => ['sometimes', 'nullable', 'string', 'max:255'],
            'api_key' => ['sometimes', 'nullable', 'string', 'max:255'],
            'base_url' => ['sometimes', 'nullable', 'url', 'max:255'],
        ]);

        $householdId = $request->user()->household_id;
        $orchestrator = AIAgentOrchestrator::forHousehold($householdId);

        // Update enabled status
        if (isset($validated['enabled'])) {
            $orchestrator->setAgentEnabled($agent, $validated['enabled']);
        }

        // Update model
        if (array_key_exists('model', $validated)) {
            $orchestrator->setAgentModel($agent, $validated['model']);
        }

        // Update API key
        if (isset($validated['api_key'])) {
            $keyName = AIAgent::getApiKeySettingName($agent);
            if ($keyName) {
                if ($validated['api_key'] === '__DELETE__') {
                    Setting::where('household_id', $householdId)
                        ->where('key', $keyName)
                        ->delete();
                } elseif ($validated['api_key'] !== '') {
                    Setting::set($keyName, $validated['api_key'], $householdId, true);
                }
            }
        }

        // Update base URL
        if (array_key_exists('base_url', $validated)) {
            $urlName = AIAgent::getBaseUrlSettingName($agent);
            if ($urlName) {
                if ($validated['base_url']) {
                    Setting::set($urlName, $validated['base_url'], $householdId);
                } else {
                    Setting::where('household_id', $householdId)
                        ->where('key', $urlName)
                        ->delete();
                }
            }
        }

        return response()->json(['message' => 'Agent settings updated']);
    }

    /**
     * Test connection for a specific AI agent.
     */
    public function testAgentConnection(Request $request, string $agent): JsonResponse
    {
        if (!in_array($agent, AIAgent::AGENTS)) {
            abort(404, 'Unknown agent');
        }

        $householdId = $request->user()->household_id;

        // If settings are passed in the request, temporarily save them for testing
        $testSettings = $request->input('settings');
        if ($testSettings) {
            $encryptedKeys = ['anthropic_api_key', 'openai_api_key', 'gemini_api_key', 'local_api_key'];

            foreach ($testSettings as $key => $value) {
                if ($value !== '' && $value !== null) {
                    $isEncrypted = in_array($key, $encryptedKeys);
                    Setting::set($key, $value, $householdId, $isEncrypted);
                }
            }
        }

        $orchestrator = AIAgentOrchestrator::forHousehold($householdId);
        $result = $orchestrator->testAgent($agent);

        if (!$result['success']) {
            return response()->json($result, 422);
        }

        return response()->json($result);
    }

    /**
     * Set the primary AI agent.
     */
    public function setPrimaryAgent(Request $request): JsonResponse
    {
        if (!$request->user()->isAdmin()) {
            abort(403, 'Only admins can set the primary AI agent');
        }

        $validated = $request->validate([
            'agent' => ['required', 'string', 'in:' . implode(',', AIAgent::AGENTS)],
        ]);

        $householdId = $request->user()->household_id;
        $orchestrator = AIAgentOrchestrator::forHousehold($householdId);
        $orchestrator->setPrimaryAgent($validated['agent']);

        return response()->json(['message' => 'Primary agent updated']);
    }
}
