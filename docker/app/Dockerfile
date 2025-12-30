# Housarr - Single Container (nginx + PHP-FPM + Frontend)

# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: PHP + Nginx
FROM php:8.3-fpm-alpine

# Install system dependencies and nginx
RUN apk add --no-cache \
    nginx \
    supervisor \
    libpng \
    libzip \
    oniguruma \
    libxml2 \
    icu-libs \
    git \
    curl \
    sqlite \
    postgresql-libs

# Install PHP extensions (MySQL, PostgreSQL, SQLite)
RUN apk add --no-cache --virtual .build-deps \
    $PHPIZE_DEPS \
    libpng-dev \
    libzip-dev \
    oniguruma-dev \
    libxml2-dev \
    icu-dev \
    linux-headers \
    sqlite-dev \
    postgresql-dev \
    && docker-php-ext-install -j$(nproc) \
        pdo_mysql \
        pdo_pgsql \
        pdo_sqlite \
        mbstring \
        exif \
        pcntl \
        bcmath \
        gd \
        zip \
        intl \
        opcache \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apk del .build-deps \
    && rm -rf /tmp/pear

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Configure nginx
RUN mkdir -p /run/nginx
COPY docker/app/nginx.conf /etc/nginx/http.d/default.conf

# Configure PHP
COPY docker/app/php.ini /usr/local/etc/php/conf.d/99-custom.ini

# Configure supervisord
COPY docker/app/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Copy entrypoint script
COPY docker/app/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Set working directory
WORKDIR /var/www/html

# Copy backend application
COPY backend/ ./

# Install PHP dependencies
RUN composer install --no-dev --optimize-autoloader --no-interaction

# Create storage directories
RUN mkdir -p storage/framework/{cache,sessions,views} storage/logs bootstrap/cache database \
    && chown -R www-data:www-data /var/www/html \
    && chmod -R 775 storage bootstrap/cache database

# Copy built frontend
COPY --from=frontend-builder /app/dist /var/www/frontend

# Create storage link
RUN ln -sf /var/www/html/storage/app/public /var/www/html/public/storage

EXPOSE 80

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
