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

WORKDIR /var/www/html

EXPOSE 8000
