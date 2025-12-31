#!/bin/sh
set -e

echo "=== Housarr Container Starting ==="

# Always sync migrations from backup to handle volume mount overwrites
# This ensures the container's migrations are always up-to-date regardless of host state
if [ -d "/var/www/migrations-backup" ] && [ -n "$(ls -A /var/www/migrations-backup 2>/dev/null)" ]; then
    mkdir -p /var/www/html/database/migrations
    
    BACKUP_COUNT=$(ls /var/www/migrations-backup | wc -l)
    CURRENT_COUNT=$(ls /var/www/html/database/migrations 2>/dev/null | wc -l || echo "0")
    
    # Always copy to ensure we have the latest migrations
    cp -r /var/www/migrations-backup/* /var/www/html/database/migrations/
    chown -R www-data:www-data /var/www/html/database/migrations
    
    NEW_COUNT=$(ls /var/www/html/database/migrations | wc -l)
    echo "Migrations synced: $CURRENT_COUNT -> $NEW_COUNT files (backup has $BACKUP_COUNT)"
else
    echo "WARNING: No migration backup found at /var/www/migrations-backup"
fi

# Fix permissions for storage and database directories
if [ -d "/var/www/html/storage" ]; then
    chown -R www-data:www-data /var/www/html/storage
    chmod -R 775 /var/www/html/storage
fi

if [ -d "/var/www/html/database" ]; then
    chown -R www-data:www-data /var/www/html/database
    chmod -R 775 /var/www/html/database
fi

if [ -d "/var/www/html/bootstrap/cache" ]; then
    chown -R www-data:www-data /var/www/html/bootstrap/cache
    chmod -R 775 /var/www/html/bootstrap/cache
fi

# Create SQLite database if it doesn't exist and using SQLite
if [ "$DB_CONNECTION" = "sqlite" ] && [ ! -f "/var/www/html/database/database.sqlite" ]; then
    touch /var/www/html/database/database.sqlite
    chown www-data:www-data /var/www/html/database/database.sqlite
    chmod 664 /var/www/html/database/database.sqlite
fi

# Create session directory for file-based sessions
mkdir -p /tmp/sessions
chmod 777 /tmp/sessions

# Run migrations if needed (only if artisan exists and DB is configured)
if [ -f "/var/www/html/artisan" ]; then
    php /var/www/html/artisan config:cache --no-interaction 2>/dev/null || true
    php /var/www/html/artisan migrate --force --no-interaction 2>/dev/null || true
fi

exec "$@"
