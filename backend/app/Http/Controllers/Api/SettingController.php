<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
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

        $settings = Setting::getMany($readableKeys, $householdId);

        // Filter out null values
        $settings = array_filter($settings, fn($value) => $value !== null);

        return response()->json(['settings' => $settings]);
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
        $driver = Setting::get('storage_driver', $householdId, 'local');

        $hasS3Credentials = false;
        if ($driver === 's3') {
            $accessKey = Setting::get('aws_access_key_id', $householdId);
            $secretKey = Setting::get('aws_secret_access_key', $householdId);
            $bucket = Setting::get('aws_bucket', $householdId);
            $hasS3Credentials = $accessKey && $secretKey && $bucket;
        }

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
        $driver = Setting::get('mail_driver', $householdId, 'log');

        $configured = false;
        switch ($driver) {
            case 'log':
                $configured = true;
                break;
            case 'smtp':
                $host = Setting::get('mail_host', $householdId);
                $configured = !empty($host);
                break;
            case 'mailgun':
                $domain = Setting::get('mailgun_domain', $householdId);
                $secret = Setting::get('mailgun_secret', $householdId);
                $configured = !empty($domain) && !empty($secret);
                break;
            case 'sendgrid':
                $apiKey = Setting::get('sendgrid_api_key', $householdId);
                $configured = !empty($apiKey);
                break;
            case 'ses':
                $key = Setting::get('ses_key', $householdId);
                $secret = Setting::get('ses_secret', $householdId);
                $configured = !empty($key) && !empty($secret);
                break;
            case 'cloudflare':
                $apiToken = Setting::get('cloudflare_api_token', $householdId);
                $accountId = Setting::get('cloudflare_account_id', $householdId);
                $configured = !empty($apiToken) && !empty($accountId);
                break;
        }

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
        $provider = Setting::get('ai_provider', $householdId, 'none');

        $configured = false;
        switch ($provider) {
            case 'none':
                $configured = true;
                break;
            case 'claude':
                $apiKey = Setting::get('anthropic_api_key', $householdId);
                $configured = !empty($apiKey);
                break;
            case 'openai':
                $apiKey = Setting::get('openai_api_key', $householdId);
                $configured = !empty($apiKey);
                break;
            case 'gemini':
                $apiKey = Setting::get('gemini_api_key', $householdId);
                $configured = !empty($apiKey);
                break;
            case 'local':
                $baseUrl = Setting::get('local_base_url', $householdId);
                $configured = !empty($baseUrl);
                break;
        }

        return response()->json([
            'provider' => $provider,
            'configured' => $configured,
        ]);
    }
}
