# Housarr - Development Dockerfile
# Lightweight PHP setup for local development

FROM php:8.3-cli-alpine

# Install system dependencies
RUN apk add --no-cache \
    curl \
    git \
    sqlite \
    libpng \
    libzip \
    icu-libs \
    oniguruma \
    libxml2 \
    freetype \
    libjpeg-turbo

# Install PHP extensions required by Laravel
RUN apk add --no-cache --virtual .build-deps \
    $PHPIZE_DEPS \
    libpng-dev \
    libzip-dev \
    icu-dev \
    sqlite-dev \
    oniguruma-dev \
    libxml2-dev \
    freetype-dev \
    libjpeg-turbo-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        pdo_sqlite \
        gd \
        zip \
        intl \
        bcmath \
        mbstring \
        exif \
        pcntl \
    && apk del .build-deps \
    && rm -rf /tmp/*

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Configure PHP for larger file uploads
RUN echo "upload_max_filesize = 100M" > /usr/local/etc/php/conf.d/uploads.ini \
    && echo "post_max_size = 100M" >> /usr/local/etc/php/conf.d/uploads.ini \
    && echo "memory_limit = 256M" >> /usr/local/etc/php/conf.d/uploads.ini \
    && echo "max_execution_time = 300" >> /usr/local/etc/php/conf.d/uploads.ini

WORKDIR /var/www/html

EXPOSE 8000
