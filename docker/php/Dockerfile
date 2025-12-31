# =============================================================================
# Housarr PHP Dockerfile - Multi-stage build for security and efficiency
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Base image with PHP extensions
# -----------------------------------------------------------------------------
FROM php:8.3-fpm-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    libpng \
    libzip \
    oniguruma \
    libxml2 \
    icu-libs \
    linux-headers

# Install PHP extensions
RUN apk add --no-cache --virtual .build-deps \
    $PHPIZE_DEPS \
    libpng-dev \
    libzip-dev \
    oniguruma-dev \
    libxml2-dev \
    icu-dev \
    && docker-php-ext-install -j$(nproc) \
        pdo_mysql \
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

# Create non-root user
RUN addgroup -g 1000 www \
    && adduser -u 1000 -G www -s /bin/sh -D www

# Set working directory
WORKDIR /var/www/html

# -----------------------------------------------------------------------------
# Stage 2: Development image
# -----------------------------------------------------------------------------
FROM base AS development

# Install development tools
RUN apk add --no-cache \
    git \
    curl \
    bash \
    nano \
    fcgi

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Copy development PHP config
COPY docker/php/php.ini /usr/local/etc/php/conf.d/99-custom.ini
COPY docker/php/php-fpm.conf /usr/local/etc/php-fpm.d/zz-custom.conf

# Install php-fpm-healthcheck
RUN curl -o /usr/local/bin/php-fpm-healthcheck \
    https://raw.githubusercontent.com/renatomefi/php-fpm-healthcheck/master/php-fpm-healthcheck \
    && chmod +x /usr/local/bin/php-fpm-healthcheck

# Copy scheduler script
COPY docker/php/scheduler.sh /usr/local/bin/scheduler.sh
RUN chmod +x /usr/local/bin/scheduler.sh

# Set ownership
RUN chown -R www:www /var/www/html

USER www

EXPOSE 9000
CMD ["php-fpm"]

# -----------------------------------------------------------------------------
# Stage 3: Production build (install dependencies)
# -----------------------------------------------------------------------------
FROM base AS build

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Install git for composer
RUN apk add --no-cache git

# Copy composer files first for better layer caching
COPY --chown=www:www backend/composer.json backend/composer.lock ./

# Install dependencies (no dev, optimized autoloader)
RUN composer install \
    --no-dev \
    --no-scripts \
    --no-autoloader \
    --prefer-dist \
    --no-progress

# Copy application code
COPY --chown=www:www backend/ .

# Generate optimized autoloader
RUN composer dump-autoload --optimize --no-dev --classmap-authoritative

# -----------------------------------------------------------------------------
# Stage 4: Production image
# -----------------------------------------------------------------------------
FROM base AS production

# Copy production PHP config
COPY docker/php/php.prod.ini /usr/local/etc/php/conf.d/99-custom.ini
COPY docker/php/php-fpm.prod.conf /usr/local/etc/php-fpm.d/zz-custom.conf

# Install php-fpm-healthcheck
RUN apk add --no-cache curl fcgi \
    && curl -o /usr/local/bin/php-fpm-healthcheck \
    https://raw.githubusercontent.com/renatomefi/php-fpm-healthcheck/master/php-fpm-healthcheck \
    && chmod +x /usr/local/bin/php-fpm-healthcheck \
    && apk del curl

# Copy scheduler script
COPY docker/php/scheduler.sh /usr/local/bin/scheduler.sh
RUN chmod +x /usr/local/bin/scheduler.sh

# Copy application from build stage
COPY --from=build --chown=www:www /var/www/html /var/www/html

# Ensure storage directories exist and are writable
RUN mkdir -p storage/framework/{cache,sessions,views} storage/logs bootstrap/cache \
    && chown -R www:www storage bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

USER www

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=30s \
    CMD php-fpm-healthcheck || exit 1

EXPOSE 9000
CMD ["php-fpm"]
