# ADR 012: Docker Self-Hosted Deployment Strategy

## Status

Accepted

## Date

2024-12-31

## Context

Housarr is designed as a self-hosted application deployed via Docker on home servers (Unraid, Synology, TrueNAS, etc.). Several challenges arise in this environment:

1. **Volume mounts overwrite container files**: When users mount host directories for persistence (e.g., `/var/www/html/database`), the empty host directory replaces the container's files, including critical migration files.

2. **Session handling for private networks**: Laravel Sanctum requires stateful domains to be configured for session-based authentication. Self-hosted users access the app from various private network IPs (192.168.x.x, 10.x.x.x, etc.) that aren't known at build time.

3. **Single-container simplicity**: Home server users prefer single-container deployments with SQLite over multi-container setups with MySQL/Redis.

## Decision

### 1. Migration Backup and Sync

**Problem**: Volume mount for `/var/www/html/database` overwrites migration files. Additionally, if users have an older version of migrations on their host, simply checking for "empty" doesn't capture new migrations from image updates.

**Solution**: 
- At Docker build time, copy migrations to `/var/www/migrations-backup` (outside any volume mount path)
- At container startup (entrypoint.sh), **always sync** migrations from backup to the mounted volume

```dockerfile
# Dockerfile
RUN mkdir -p /var/www/migrations-backup && \
    cp -r /var/www/html/database/migrations/* /var/www/migrations-backup/
```

```bash
# entrypoint.sh - Always sync to ensure latest migrations
if [ -d "/var/www/migrations-backup" ] && [ -n "$(ls -A /var/www/migrations-backup 2>/dev/null)" ]; then
    mkdir -p /var/www/html/database/migrations
    cp -r /var/www/migrations-backup/* /var/www/html/database/migrations/
    chown -R www-data:www-data /var/www/html/database/migrations
fi
```

This ensures that even when upgrading from an older image, new migration files are always copied to the host volume.

### 2. Auto-Configure Sanctum Stateful Domains

**Problem**: Users on private networks get "Session store not set" errors because their IP isn't in the allowed domains.

**Solution**: 
- Parse `APP_URL` environment variable to extract host and port
- Include wildcard patterns for common private network ranges
- Allow override via `SANCTUM_STATEFUL_DOMAINS` env var

```php
// config/sanctum.php
$appUrlHost = parse_url(env('APP_URL', ''), PHP_URL_HOST) ?: '';
$appUrlPort = parse_url(env('APP_URL', ''), PHP_URL_PORT);

'stateful' => [
    'localhost', '127.0.0.1', '::1',
    '192.168.*.*', '10.*.*.*', '172.16.*.*',  // Private networks
    $appUrlHost,                               // From APP_URL
    $appUrlHost . ':' . $appUrlPort,          // With port
]
```

### 3. Session Directory Creation

**Problem**: File-based sessions fail if `/tmp/sessions` doesn't exist.

**Solution**: Create the directory in entrypoint.sh:

```bash
mkdir -p /tmp/sessions
chmod 777 /tmp/sessions
```

## Consequences

### Positive

- **Zero-config deployment**: Users only need to set `APP_URL` and `APP_KEY`
- **Works on any private network**: No manual `SANCTUM_STATEFUL_DOMAINS` configuration needed
- **Resilient to volume mounts**: Migrations are always synced from the image, ensuring new migrations from updates are applied
- **Single-container simplicity**: SQLite + file sessions work out of the box

### Negative

- **Wildcard security**: Allowing `192.168.*.*` means any device on the local network could potentially make authenticated requests (acceptable for home use)
- **Startup overhead**: Migration restoration adds ~1 second to container startup
- **File duplication**: Migrations exist in two locations within the image

### Mitigations

- Document that this is designed for trusted home networks, not public internet exposure
- Users requiring stricter security can set `SANCTUM_STATEFUL_DOMAINS` explicitly
- Migration backup is small (~100KB) so duplication is negligible

## Related Decisions

- ADR 004: Development Guidelines (file storage patterns)
- ADR 009: ZIP Backup with Files (data portability)
