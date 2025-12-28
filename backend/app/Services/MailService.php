<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Mail;

class MailService
{
    /**
     * Configure the mailer for a household based on their settings.
     */
    public static function configureForHousehold(?int $householdId): void
    {
        $driver = Setting::get('mail_driver', $householdId, 'log');

        // Set the default mailer
        Config::set('mail.default', $driver === 'sendgrid' ? 'smtp' : $driver);

        // Configure from address
        $fromAddress = Setting::get('mail_from_address', $householdId, config('mail.from.address'));
        $fromName = Setting::get('mail_from_name', $householdId, config('mail.from.name'));
        Config::set('mail.from.address', $fromAddress);
        Config::set('mail.from.name', $fromName);

        switch ($driver) {
            case 'smtp':
                self::configureSmtp($householdId);
                break;
            case 'mailgun':
                self::configureMailgun($householdId);
                break;
            case 'sendgrid':
                self::configureSendGrid($householdId);
                break;
            case 'ses':
                self::configureSes($householdId);
                break;
            case 'cloudflare':
                self::configureCloudflare($householdId);
                break;
            case 'log':
            default:
                // Log driver needs no configuration
                break;
        }
    }

    /**
     * Configure SMTP mailer.
     */
    protected static function configureSmtp(?int $householdId): void
    {
        $host = Setting::get('mail_host', $householdId);
        $port = Setting::get('mail_port', $householdId, 587);
        $username = Setting::get('mail_username', $householdId);
        $password = Setting::get('mail_password', $householdId);
        $encryption = Setting::get('mail_encryption', $householdId, 'tls');

        Config::set('mail.mailers.smtp.host', $host);
        Config::set('mail.mailers.smtp.port', (int) $port);
        Config::set('mail.mailers.smtp.username', $username);
        Config::set('mail.mailers.smtp.password', $password);
        Config::set('mail.mailers.smtp.encryption', $encryption === 'null' ? null : $encryption);
    }

    /**
     * Configure Mailgun mailer.
     */
    protected static function configureMailgun(?int $householdId): void
    {
        $domain = Setting::get('mailgun_domain', $householdId);
        $secret = Setting::get('mailgun_secret', $householdId);
        $endpoint = Setting::get('mailgun_endpoint', $householdId, 'api.mailgun.net');

        Config::set('services.mailgun.domain', $domain);
        Config::set('services.mailgun.secret', $secret);
        Config::set('services.mailgun.endpoint', $endpoint);
    }

    /**
     * Configure SendGrid (via SMTP).
     */
    protected static function configureSendGrid(?int $householdId): void
    {
        $apiKey = Setting::get('sendgrid_api_key', $householdId);

        // SendGrid uses SMTP transport
        Config::set('mail.mailers.smtp.host', 'smtp.sendgrid.net');
        Config::set('mail.mailers.smtp.port', 587);
        Config::set('mail.mailers.smtp.username', 'apikey');
        Config::set('mail.mailers.smtp.password', $apiKey);
        Config::set('mail.mailers.smtp.encryption', 'tls');
    }

    /**
     * Configure Amazon SES mailer.
     */
    protected static function configureSes(?int $householdId): void
    {
        $key = Setting::get('ses_key', $householdId);
        $secret = Setting::get('ses_secret', $householdId);
        $region = Setting::get('ses_region', $householdId, 'us-east-1');

        Config::set('services.ses.key', $key);
        Config::set('services.ses.secret', $secret);
        Config::set('services.ses.region', $region);
    }

    /**
     * Configure Cloudflare Email (via HTTP API).
     * Cloudflare Email Workers use an HTTP-based API.
     */
    protected static function configureCloudflare(?int $householdId): void
    {
        $apiToken = Setting::get('cloudflare_api_token', $householdId);
        $accountId = Setting::get('cloudflare_account_id', $householdId);

        // Store Cloudflare credentials in services config for use by custom transport
        Config::set('services.cloudflare.api_token', $apiToken);
        Config::set('services.cloudflare.account_id', $accountId);

        // Cloudflare uses a custom HTTP transport - configure as SMTP fallback
        // In production, you'd create a custom Cloudflare mail transport
        // For now, we store the config for the application to use
        Config::set('mail.default', 'smtp');
        Config::set('mail.mailers.smtp.host', 'smtp.cloudflare.com');
        Config::set('mail.mailers.smtp.port', 587);
        Config::set('mail.mailers.smtp.encryption', 'tls');
    }

    /**
     * Get the configured mailer name for a household.
     */
    public static function getDriverName(?int $householdId): string
    {
        return Setting::get('mail_driver', $householdId, 'log');
    }

    /**
     * Check if email is properly configured for a household.
     */
    public static function isConfigured(?int $householdId): bool
    {
        $driver = self::getDriverName($householdId);

        switch ($driver) {
            case 'log':
                return true;
            case 'smtp':
                return !empty(Setting::get('mail_host', $householdId));
            case 'mailgun':
                return !empty(Setting::get('mailgun_domain', $householdId))
                    && !empty(Setting::get('mailgun_secret', $householdId));
            case 'sendgrid':
                return !empty(Setting::get('sendgrid_api_key', $householdId));
            case 'ses':
                return !empty(Setting::get('ses_key', $householdId))
                    && !empty(Setting::get('ses_secret', $householdId));
            case 'cloudflare':
                return !empty(Setting::get('cloudflare_api_token', $householdId))
                    && !empty(Setting::get('cloudflare_account_id', $householdId));
            default:
                return false;
        }
    }
}
