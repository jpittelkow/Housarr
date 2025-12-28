<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Storage;
use Illuminate\Contracts\Filesystem\Filesystem;

class StorageService
{
    /**
     * Get the storage disk for a household.
     * Configures S3 dynamically if household uses S3 storage.
     */
    public static function getDiskForHousehold(?int $householdId): Filesystem
    {
        $driver = Setting::get('storage_driver', $householdId, 'local');

        if ($driver === 's3') {
            return self::getS3Disk($householdId);
        }

        return Storage::disk('public');
    }

    /**
     * Get the disk name for a household (for path generation).
     */
    public static function getDiskName(?int $householdId): string
    {
        $driver = Setting::get('storage_driver', $householdId, 'local');
        return $driver === 's3' ? 'household_s3' : 'public';
    }

    /**
     * Configure and return an S3 disk with household-specific credentials.
     */
    protected static function getS3Disk(?int $householdId): Filesystem
    {
        $accessKey = Setting::get('aws_access_key_id', $householdId);
        $secretKey = Setting::get('aws_secret_access_key', $householdId);
        $region = Setting::get('aws_default_region', $householdId, 'us-east-1');
        $bucket = Setting::get('aws_bucket', $householdId);
        $endpoint = Setting::get('aws_endpoint', $householdId);

        // Dynamically configure the S3 disk
        $config = [
            'driver' => 's3',
            'key' => $accessKey,
            'secret' => $secretKey,
            'region' => $region,
            'bucket' => $bucket,
        ];

        // Add endpoint for S3-compatible services (MinIO, DigitalOcean Spaces, etc.)
        if ($endpoint) {
            $config['endpoint'] = $endpoint;
            $config['use_path_style_endpoint'] = true;
        }

        // Set the configuration at runtime
        Config::set('filesystems.disks.household_s3', $config);

        return Storage::disk('household_s3');
    }

    /**
     * Check if storage is properly configured for a household.
     */
    public static function isConfigured(?int $householdId): bool
    {
        $driver = Setting::get('storage_driver', $householdId, 'local');

        if ($driver === 'local') {
            return true;
        }

        // For S3, check required credentials
        $accessKey = Setting::get('aws_access_key_id', $householdId);
        $secretKey = Setting::get('aws_secret_access_key', $householdId);
        $bucket = Setting::get('aws_bucket', $householdId);

        return $accessKey && $secretKey && $bucket;
    }

    /**
     * Test S3 connection for a household.
     */
    public static function testConnection(?int $householdId): array
    {
        $driver = Setting::get('storage_driver', $householdId, 'local');

        if ($driver === 'local') {
            return ['success' => true, 'message' => 'Local storage is working'];
        }

        try {
            $disk = self::getS3Disk($householdId);
            // Try to list files to verify connection
            $disk->files('/');
            return ['success' => true, 'message' => 'S3 connection successful'];
        } catch (\Exception $e) {
            return ['success' => false, 'message' => 'S3 connection failed: ' . $e->getMessage()];
        }
    }
}
