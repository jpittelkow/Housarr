# Docker Infrastructure Documentation

## Overview

Housarr uses Docker Compose with two configuration files:
1. **docker-compose.yml**: Full development stack with all services
2. **docker-compose.prod.yml**: Production overlay with security hardening

## Quick Start

```bash
# Development
docker compose up -d

# Production
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Docker Compose Files

### docker-compose.yml (Development)

**Purpose**: Full development stack

**Services**:
- `nginx`: Web server (port 8000)
- `php`: PHP-FPM application server
- `mysql`: MySQL 8.0 database
- `redis`: Redis cache/queue
- `scheduler`: Laravel task scheduler
- `worker`: Laravel queue worker
- `node`: Vite dev server (optional, use `--profile dev`)

**Configuration**:
```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "${APP_PORT:-8000}:80"
  php:
    build:
      dockerfile: docker/php/Dockerfile
      target: development
  mysql:
    image: mysql:8.0
    ports:
      - "${DB_PORT:-3306}:3306"
  redis:
    image: redis:7-alpine
    ports:
      - "${REDIS_PORT:-6379}:6379"
```

**Ports**:
- `8000`: Web application (configurable via APP_PORT)
- `3306`: MySQL (configurable via DB_PORT)
- `6379`: Redis (configurable via REDIS_PORT)
- `5173`: Vite dev server (with `--profile dev`)

**Volumes**:
- `./backend`: Laravel application code (mounted)
- `./data`: Persistent storage (mapped to Laravel storage/app)
- `mysql_data`: MySQL data persistence
- `redis_data`: Redis data persistence

### docker-compose.prod.yml (Production Overlay)

**Purpose**: Production multi-container setup

**Usage**: `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d`

**Services**:

#### nginx
- **Volumes**: Production nginx config
- **Ports**: Exposed only (no direct access)
- **Read-only**: true
- **Tmpfs**: `/var/cache/nginx`, `/var/run`
- **Security**: `no-new-privileges:true`

#### php
- **Build Target**: production
- **Environment**: `APP_ENV=production`, `APP_DEBUG=false`
- **Read-only**: true
- **Tmpfs**: `/tmp`
- **Volumes**: 
  - `./backend:/var/www/html:cached,ro` (read-only)
  - `./backend/storage:/var/www/html/storage:cached` (writable)
  - `./backend/bootstrap/cache:/var/www/html/bootstrap/cache:cached` (writable)
- **Security**: `no-new-privileges:true`

#### mysql
- **Ports**: Exposed only (no direct access)
- **Expose**: 3306

#### redis
- **Ports**: Exposed only (no direct access)
- **Expose**: 6379
- **Command**: Redis server with appendonly, maxmemory 256mb, LRU policy, password required

#### scheduler
- **Build Target**: production
- **Environment**: `APP_ENV=production`
- **Read-only**: true
- **Tmpfs**: `/tmp`
- **Volumes**: Same as php service
- **Security**: `no-new-privileges:true`
- **Purpose**: Runs Laravel scheduler (`schedule:run`)

#### worker
- **Build Target**: production
- **Environment**: `APP_ENV=production`
- **Read-only**: true
- **Tmpfs**: `/tmp`
- **Volumes**: Same as php service
- **Security**: `no-new-privileges:true`
- **Deploy**: 
  - Replicas: 2
  - Memory limit: 256M
  - CPU limit: 0.5
  - Memory reservation: 128M
  - CPU reservation: 0.25
- **Purpose**: Processes Laravel queue jobs

#### node
- **Profile**: `donotstart` (not started in production)
- **Purpose**: Frontend should be pre-built

## Dockerfiles

### Single Container Dockerfile (`docker/app/Dockerfile`)

**Base Image**: `php:8.3-fpm-alpine`

**Stages**:

#### Stage 1: Frontend Builder
- **Base**: `node:20-alpine`
- **Steps**:
  1. Copy package files
  2. Install dependencies (`npm ci`)
  3. Copy frontend source
  4. Build frontend (`npm run build`)

#### Stage 2: PHP + Nginx
- **Base**: `php:8.3-fpm-alpine`
- **System Dependencies**: nginx, supervisor, libpng, libzip, oniguruma, libxml2, icu-libs, git, curl, sqlite, postgresql-libs
- **PHP Extensions**: pdo_mysql, pdo_pgsql, pdo_sqlite, mbstring, exif, pcntl, bcmath, gd, zip, intl, opcache, redis
- **Composer**: Copied from composer:2 image
- **Nginx Config**: Copied from `docker/app/nginx.conf`
- **PHP Config**: Copied from `docker/app/php.ini`
- **Supervisor Config**: Copied from `docker/app/supervisord.conf`
- **Entrypoint**: `docker/app/entrypoint.sh`
- **Frontend**: Copied from builder stage to `/var/www/frontend`
- **Working Directory**: `/var/www/html`
- **Storage Directories**: Created with www-data ownership
- **Expose**: Port 80
- **CMD**: Supervisor runs nginx and PHP-FPM

### PHP Dockerfile (`docker/php/Dockerfile`)

**Base Image**: `php:8.3-fpm-alpine`

**Stages**:

#### Stage 1: Base
- **System Dependencies**: libpng, libzip, oniguruma, libxml2, icu-libs, linux-headers
- **PHP Extensions**: pdo_mysql, mbstring, exif, pcntl, bcmath, gd, zip, intl, opcache, redis
- **User**: Creates www user (UID 1000, GID 1000)
- **Working Directory**: `/var/www/html`

#### Stage 2: Development
- **Extends**: base
- **Development Tools**: git, curl, bash, nano, fcgi
- **Composer**: Copied from composer:2
- **PHP Config**: Development configs (`php.ini`, `php-fpm.conf`)
- **Healthcheck**: php-fpm-healthcheck script
- **Scheduler Script**: Copied from `docker/php/scheduler.sh`
- **User**: www (non-root)
- **Expose**: Port 9000
- **CMD**: php-fpm

#### Stage 3: Build
- **Extends**: base
- **Composer**: Copied from composer:2
- **Git**: Installed for composer
- **Dependencies**: Installs composer dependencies (no-dev, optimized)
- **Application Code**: Copied from backend
- **Autoloader**: Generated optimized autoloader

#### Stage 4: Production
- **Extends**: base
- **PHP Config**: Production configs (`php.prod.ini`, `php-fpm.prod.conf`)
- **Healthcheck**: php-fpm-healthcheck script
- **Scheduler Script**: Copied from `docker/php/scheduler.sh`
- **Application**: Copied from build stage
- **Storage**: Directories created with www ownership and permissions
- **User**: www (non-root)
- **Healthcheck**: PHP-FPM healthcheck (30s interval, 10s timeout, 3 retries, 30s start period)
- **Expose**: Port 9000
- **CMD**: php-fpm

## Nginx Configurations

### Single Container Config (`docker/app/nginx.conf`)

**Server**:
- Listen: 80
- Server name: localhost
- Client max body size: 100M

**Locations**:

1. **Frontend** (`/`):
   - Root: `/var/www/frontend`
   - Index: `index.html`
   - Try files: SPA fallback to `index.html`

2. **API** (`/api`):
   - Root: `/var/www/html/public`
   - Try files: Laravel routing

3. **Sanctum** (`/sanctum`):
   - Root: `/var/www/html/public`
   - Try files: Laravel routing

4. **Storage** (`/storage`):
   - Alias: `/var/www/html/storage/app/public`
   - Try files: 404 if not found

5. **PHP** (`~ \.php$`):
   - Root: `/var/www/html/public`
   - FastCGI: `127.0.0.1:9000` (PHP-FPM)
   - Script filename: `$realpath_root$fastcgi_script_name`

6. **Hidden Files** (`~ /\.(?!well-known).*`):
   - Deny all

### Development Config (`docker/nginx/default.conf`)

**Server**:
- Listen: 80
- Server name: localhost
- Root: `/var/www/html/public`
- Index: `index.php index.html`
- Server tokens: off

**Security Headers**:
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin

**Logging**:
- Access log: `/var/log/nginx/access.log`
- Error log: `/var/log/nginx/error.log`

**Client Settings**:
- Max body size: 100M
- Body buffer: 128k

**Gzip**: Enabled with compression level 6

**Locations**:

1. **Health Check** (`/up`):
   - Returns 200 OK
   - No access logging

2. **Main** (`/`):
   - Try files: Laravel routing

3. **PHP** (`~ \.php$`):
   - FastCGI: `php:9000`
   - Timeouts: 60s connect, 300s send/read
   - Buffers: 16k buffer, 16 buffers

4. **Hidden Files**: Deny all

5. **Sensitive Files**: Deny common extensions

6. **Static Files**: 1 day cache

### Production Config (`docker/nginx/production.conf`)

**Server**:
- Listen: 80
- Server name: _ (any)
- Root: `/var/www/html/public`
- Index: `index.php`
- Server tokens: off

**Rate Limiting Zones**:
- `api`: 10r/s per IP
- `login`: 5r/m per IP
- `conn`: 20 connections per IP

**Security Headers** (Hardened):
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: Disables various features
- Content-Security-Policy: Restrictive policy

**Logging**:
- Access log: Buffered (512k buffer, 1m flush)
- Error log: Warn level

**Client Settings**:
- Max body size: 50M
- Body buffer: 128k
- Timeouts: 60s

**Connection Limits**: 20 per IP

**Gzip**: Enabled, level 6

**Locations**:

1. **Health Check** (`/up`):
   - Returns 200 OK
   - No access logging

2. **API** (`/api/`):
   - Rate limit: 10r/s burst 20
   - Status 429 on limit
   - Laravel routing

3. **Login** (`~* ^/api/auth/(login|register)`):
   - Rate limit: 5r/m burst 3
   - Status 429 on limit
   - Laravel routing

4. **Main** (`/`):
   - Laravel routing

5. **PHP** (`~ \.php$`):
   - FastCGI: `php:9000`
   - Timeouts: 60s connect, 120s send/read
   - Buffers: 32k buffer, 32 buffers
   - Hide PHP headers
   - Security params

6. **Hidden Files**: Deny all

7. **Sensitive Files**: Deny common extensions

8. **Exploit Paths**: Block wp-admin, phpmyadmin, etc.

9. **Static Files**: 30 day cache, immutable

10. **Favicon/Robots**: No logging

## PHP Configuration

### Development PHP (`docker/app/php.ini`)

**Error Handling**:
- Display errors: On
- Display startup errors: On
- Error reporting: E_ALL
- Log errors: On
- Error log: `/var/www/html/storage/logs/php_errors.log`

**Resource Limits**:
- Memory limit: 256M
- Max execution time: 300s
- Max input time: 300s
- Max input vars: 3000

**Upload Limits**:
- Upload max filesize: 100M
- Post max size: 100M

**Security**:
- Expose PHP: Off
- Allow URL fopen: On
- Allow URL include: Off

**Session**:
- Cookie httponly: 1
- Cookie secure: 0
- Use strict mode: 1
- Cookie samesite: Lax

**Timezone**: UTC

**OPcache**:
- Enable: 1
- Memory consumption: 128M
- Interned strings buffer: 16M
- Max accelerated files: 10000
- Validate timestamps: 1
- Revalidate freq: 0
- Save comments: 1

### Development PHP-FPM (`docker/php/php-fpm.conf`)

**Process Management**:
- PM: dynamic
- Max children: 10
- Start servers: 2
- Min spare: 1
- Max spare: 3
- Max requests: 500

**Status Page**:
- Status path: `/status`
- Ping path: `/ping`
- Ping response: pong

**Logging**:
- Access log: `/var/www/html/storage/logs/php-fpm-access.log`
- Slow log: `/var/www/html/storage/logs/php-fpm-slow.log`
- Slow log timeout: 5s

**Security**:
- Limit extensions: .php

**Environment**: Clear env: no

### Production PHP (`docker/php/php.prod.ini`)

**Error Handling**:
- Display errors: Off
- Display startup errors: Off
- Error reporting: E_ALL & ~E_DEPRECATED & ~E_STRICT
- Log errors: On
- Error log: `/var/www/html/storage/logs/php_errors.log`

**Resource Limits**:
- Memory limit: 256M
- Max execution time: 60s
- Max input time: 60s
- Max input vars: 3000

**Upload Limits**:
- Upload max filesize: 50M
- Post max size: 50M

**Security**:
- Expose PHP: Off
- Allow URL fopen: Off
- Allow URL include: Off

**Session**:
- Cookie httponly: 1
- Cookie secure: 1 (HTTPS)
- Use strict mode: 1
- Cookie samesite: Strict

**Timezone**: UTC

**OPcache**:
- Enable: 1
- Enable CLI: 1
- Memory consumption: 256M
- Interned strings buffer: 32M
- Max accelerated files: 20000
- Validate timestamps: 0 (production)
- Revalidate freq: 0
- Save comments: 0 (production)
- Fast shutdown: 1
- Enable file override: 1
- Max wasted percentage: 10
- JIT: 1255
- JIT buffer size: 128M

**Realpath Cache**:
- Cache size: 4096K
- Cache TTL: 600s

**Disabled Functions**: exec, passthru, shell_exec, system, proc_open, popen, curl_multi_exec, parse_ini_file, show_source, pcntl_exec

### Production PHP-FPM (`docker/php/php-fpm.prod.conf`)

**Process Management**:
- PM: dynamic
- Max children: 50
- Start servers: 5
- Min spare: 5
- Max spare: 35
- Max requests: 1000
- Process idle timeout: 10s

**Status Page**:
- Status path: `/status`
- Ping path: `/ping`
- Ping response: pong

**Logging**:
- Access log: `/dev/null` (disabled in production)
- Slow log: `/var/www/html/storage/logs/php-fpm-slow.log`
- Slow log timeout: 10s
- Request terminate timeout: 120s
- Catch workers output: yes
- Decorate workers output: no

**Security**:
- Limit extensions: .php

**Environment**: Clear env: yes

## Scripts

### Entrypoint (`docker/app/entrypoint.sh`)

**Purpose**: Sets up container before starting services

**Actions**:
1. Fixes permissions for storage, database, bootstrap/cache directories
2. Creates SQLite database if using SQLite and doesn't exist
3. Runs config cache and migrations (if artisan exists)
4. Executes command (supervisord)

**Permissions**: Sets www-data ownership and 775 permissions

### Scheduler (`docker/php/scheduler.sh`)

**Purpose**: Runs Laravel scheduler in production

**Actions**:
1. Traps SIGTERM/SIGINT/SIGQUIT for graceful shutdown
2. Waits 5 seconds for PHP-FPM
3. Runs `php artisan schedule:run` every 60 seconds
4. Checks for signals every second during sleep

**Usage**: Used by scheduler container in production

## Supervisor Configuration (`docker/app/supervisord.conf`)

**Purpose**: Manages nginx and PHP-FPM processes in single container

**Configuration**:
- Nodaemon: true
- User: root
- Logfile: stdout
- PID file: `/run/supervisord.pid`

**Programs**:

1. **php-fpm**:
   - Command: `php-fpm -F`
   - Autostart: true
   - Autorestart: true
   - Logs: stdout/stderr

2. **nginx**:
   - Command: `nginx -g "daemon off;"`
   - Autostart: true
   - Autorestart: true
   - Logs: stdout/stderr

## MySQL Configuration (`docker/mysql/my.cnf`)

**Purpose**: MySQL server configuration for production

**Character Set**:
- Server: utf8mb4
- Collation: utf8mb4_unicode_ci
- Client default: utf8mb4

**Performance**:
- InnoDB buffer pool: 256M
- InnoDB log file: 64M
- InnoDB flush log at commit: 2
- InnoDB flush method: O_DIRECT

**Connections**:
- Max connections: 100
- Max connect errors: 10
- Wait timeout: 600s
- Interactive timeout: 600s

**Logging**:
- Slow query log: Enabled
- Slow query log file: `/var/lib/mysql/slow.log`
- Long query time: 2s
- Log queries not using indexes: Enabled

**Security**:
- Local infile: Disabled
- Skip symbolic links: Enabled

**Binary Logging**: Commented out (uncomment for replication/backup)

## Volume Mounts

### Single Container
- `./backend` → `/var/www/html`: Laravel application (mounted, writable)
- `./data` → `/var/www/html/storage/app`: Persistent storage

### Production Containers
- `./backend` → `/var/www/html`: Laravel application (read-only, cached)
- `./backend/storage` → `/var/www/html/storage`: Storage directory (writable, cached)
- `./backend/bootstrap/cache` → `/var/www/html/bootstrap/cache`: Cache directory (writable, cached)

## Environment Variables

### Application
- `APP_PORT`: Port for single container (default: 8000)
- `APP_ENV`: Environment (production/development)
- `APP_DEBUG`: Debug mode (false in production)

### Database
- `DB_CONNECTION`: Database driver (sqlite/mysql/pgsql)
- `DB_DATABASE`: Database name
- `DB_HOST`: Database host
- `DB_PORT`: Database port
- `DB_USERNAME`: Database username
- `DB_PASSWORD`: Database password

### Redis
- `REDIS_PASSWORD`: Redis password (required in production)

### Other
- Various Laravel environment variables for mail, storage, AI, etc.

## Security Features

### Production
- Read-only filesystem (except storage/cache)
- Non-root user (www, UID 1000)
- Security headers in nginx
- Rate limiting
- No new privileges
- Tmpfs for temporary files
- Resource limits on workers
- OPcache validation disabled (production)
- Error display disabled
- Session secure cookies

### Development
- Writable filesystem
- Error display enabled
- More permissive settings
- OPcache validates timestamps

## Health Checks

### PHP-FPM Healthcheck
- **Script**: php-fpm-healthcheck (from GitHub)
- **Interval**: 30s
- **Timeout**: 10s
- **Retries**: 3
- **Start Period**: 30s
- **Endpoints**: `/ping` (returns pong), `/status` (status page)

### Nginx Healthcheck
- **Endpoint**: `/up`
- **Response**: 200 OK
- **No logging**: Access log disabled

## Build Process

### Single Container
1. Build frontend (Node.js stage)
2. Build PHP + Nginx stage
3. Copy frontend build to `/var/www/frontend`
4. Configure nginx, PHP, supervisor
5. Set up entrypoint

### Production PHP
1. Build base stage (PHP extensions)
2. Build development stage (dev tools)
3. Build build stage (install dependencies)
4. Build production stage (copy from build, configure)

## Deployment Notes

### Single Container
- Suitable for development and simple deployments
- All services in one container
- Frontend pre-built and served by nginx
- PHP-FPM and nginx managed by supervisor
- Easy to start: `docker compose up -d`

### Production Multi-Container
- Separate containers for each service
- Scalable (multiple workers)
- Read-only application code
- Resource limits
- Security hardened
- Requires reverse proxy in front
- Start: `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d`
