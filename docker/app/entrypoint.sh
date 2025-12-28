#!/bin/sh
set -e

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

# Run migrations if needed (only if artisan exists and DB is configured)
if [ -f "/var/www/html/artisan" ]; then
    php /var/www/html/artisan config:cache --no-interaction 2>/dev/null || true
    php /var/www/html/artisan migrate --force --no-interaction 2>/dev/null || true
fi

exec "$@"
