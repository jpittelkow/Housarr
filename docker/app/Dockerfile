# Housarr - Optimized Single Container
# SQLite + File cache (no MySQL/Redis needed)

# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci --prefer-offline
COPY frontend/ ./
RUN npm run build

# Stage 2: PHP + Nginx (minimal)
FROM php:8.3-fpm-alpine

# Install only essential system deps
RUN apk add --no-cache \
    nginx \
    supervisor \
    curl \
    sqlite \
    libpng \
    libzip \
    icu-libs

# Install only required PHP extensions (no mysql/postgres/redis)
RUN apk add --no-cache --virtual .build-deps \
    $PHPIZE_DEPS \
    libpng-dev \
    libzip-dev \
    icu-dev \
    sqlite-dev \
    && docker-php-ext-install -j$(nproc) \
        pdo_sqlite \
        gd \
        zip \
        intl \
        opcache \
        bcmath \
    && apk del .build-deps \
    && rm -rf /tmp/*

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Configure nginx
RUN mkdir -p /run/nginx
COPY docker/app/nginx.conf /etc/nginx/http.d/default.conf

# Configure PHP
COPY docker/app/php.ini /usr/local/etc/php/conf.d/99-custom.ini

# Configure supervisord
COPY docker/app/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Copy entrypoint
COPY docker/app/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

WORKDIR /var/www/html

# Copy backend
COPY backend/composer.json backend/composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction

COPY backend/ ./
RUN composer dump-autoload --optimize

# Backup migrations to a location that won't be overwritten by volume mounts
# Use explicit paths and verify the backup succeeded
RUN mkdir -p /var/www/migrations-backup && \
    cp -r /var/www/html/database/migrations/* /var/www/migrations-backup/ && \
    echo "Migrations backed up: $(ls /var/www/migrations-backup | wc -l) files"

# Setup directories
RUN mkdir -p storage/framework/{cache,sessions,views} storage/logs bootstrap/cache database \
    && chown -R www-data:www-data /var/www/html \
    && chmod -R 775 storage bootstrap/cache database

# Copy frontend build
COPY --from=frontend-builder /app/dist /var/www/frontend

# Storage symlink
RUN ln -sf /var/www/html/storage/app/public /var/www/html/public/storage

EXPOSE 80

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
