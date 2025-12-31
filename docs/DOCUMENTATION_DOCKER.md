# Docker Documentation

## Overview

Housarr is deployed as a single Docker container with everything included:
- PHP-FPM 8.3
- Nginx web server
- SQLite database (embedded)
- React frontend (pre-built)

**No external database or Redis required.**

## System Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| **RAM** | 256 MB | 512 MB |
| **CPU** | 1 core | 2 cores |
| **Disk** | 500 MB | 1 GB + storage for files |
| **Architecture** | amd64, arm64 | - |

## Quick Start

### Option 1: Docker Run

```bash
# Generate an APP_KEY
docker run --rm php:8.2-cli php -r "echo 'base64:' . base64_encode(random_bytes(32)) . PHP_EOL;"

# Run Housarr (replace YOUR_KEY with the generated key)
docker run -d \
  --name housarr \
  -p 8000:80 \
  -v housarr_data:/var/www/html/database \
  -v housarr_storage:/var/www/html/storage/app \
  -e APP_KEY=base64:YOUR_KEY_HERE \
  -e APP_URL=http://localhost:8000 \
  ghcr.io/jpittelkow/housarr:latest
```

### Option 2: Docker Compose (Recommended)

```bash
# Clone the repo
git clone https://github.com/jpittelkow/Housarr.git
cd Housarr

# Generate APP_KEY
docker run --rm php:8.2-cli php -r "echo 'base64:' . base64_encode(random_bytes(32)) . PHP_EOL;"

# Edit docker-compose.yml and set your APP_KEY, then:
docker compose up -d
```

Open [http://localhost:8000](http://localhost:8000) and create your account!

## Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `APP_KEY` | ✅ | Encryption key | - |
| `APP_URL` | ✅ | Your server URL | `http://localhost:8000` |
| `APP_PORT` | ❌ | Port to expose | `8000` |
| `TZ` | ❌ | Timezone | `UTC` |

### AI Configuration (Optional)

| Variable | Description |
|----------|-------------|
| `AI_PROVIDER` | `anthropic`, `openai`, `gemini`, or `ollama` |
| `ANTHROPIC_API_KEY` | Claude API key |
| `OPENAI_API_KEY` | OpenAI API key |
| `GEMINI_API_KEY` | Google Gemini API key |
| `OLLAMA_HOST` | Ollama server URL (e.g., `http://host.docker.internal:11434`) |

### Mail Configuration (Optional)

| Variable | Description |
|----------|-------------|
| `MAIL_MAILER` | `smtp`, `sendmail`, or `log` |
| `MAIL_HOST` | SMTP server hostname |
| `MAIL_PORT` | SMTP port (587 for TLS) |
| `MAIL_USERNAME` | SMTP username |
| `MAIL_PASSWORD` | SMTP password |
| `MAIL_FROM_ADDRESS` | From email address |

## Volumes

Housarr persists data in two volumes:

| Volume | Container Path | Purpose |
|--------|----------------|---------|
| `housarr_database` | `/var/www/html/database` | SQLite database |
| `housarr_storage` | `/var/www/html/storage/app` | Uploaded files (manuals, images) |

### Backup

To backup your Housarr data:

```bash
# Stop the container (optional, but recommended)
docker compose stop

# Backup database
docker run --rm -v housarr_database:/data -v $(pwd):/backup alpine tar czf /backup/housarr-db.tar.gz -C /data .

# Backup storage
docker run --rm -v housarr_storage:/data -v $(pwd):/backup alpine tar czf /backup/housarr-storage.tar.gz -C /data .

# Restart
docker compose start
```

### Restore

```bash
# Stop the container
docker compose stop

# Restore database
docker run --rm -v housarr_database:/data -v $(pwd):/backup alpine sh -c "rm -rf /data/* && tar xzf /backup/housarr-db.tar.gz -C /data"

# Restore storage
docker run --rm -v housarr_storage:/data -v $(pwd):/backup alpine sh -c "rm -rf /data/* && tar xzf /backup/housarr-storage.tar.gz -C /data"

# Start
docker compose start
```

## Platform Guides

### Unraid

See [docker/unraid/README.md](../docker/unraid/README.md) for Unraid-specific setup.

### Synology / TrueNAS

Use the Docker Compose method above. Map volumes to your preferred storage location:

```yaml
volumes:
  - /volume1/docker/housarr/database:/var/www/html/database
  - /volume1/docker/housarr/storage:/var/www/html/storage/app
```

### Reverse Proxy

If running behind a reverse proxy (Traefik, Nginx Proxy Manager, Caddy):

1. Set `APP_URL` to your external URL (e.g., `https://housarr.example.com`)
2. Remove the `ports` section from docker-compose.yml
3. Connect the container to your proxy network

**Traefik example:**

```yaml
services:
  housarr:
    image: ghcr.io/jpittelkow/housarr:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.housarr.rule=Host(`housarr.example.com`)"
      - "traefik.http.services.housarr.loadbalancer.server.port=80"
    networks:
      - proxy
    environment:
      APP_KEY: base64:your-key-here
      APP_URL: https://housarr.example.com
```

## Architecture

```
┌─────────────────────────────────────────────┐
│              housarr container               │
│                                             │
│  ┌─────────────┐     ┌─────────────────┐   │
│  │    Nginx    │────▶│  React Frontend │   │
│  │   (port 80) │     │  /var/www/frontend  │
│  └──────┬──────┘     └─────────────────┘   │
│         │ /api/*                            │
│         ▼                                   │
│  ┌─────────────┐     ┌─────────────────┐   │
│  │   PHP-FPM   │────▶│  SQLite Database │   │
│  │   Laravel   │     │  /var/www/html/database │
│  └─────────────┘     └─────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

### Container Details

**Image:** `ghcr.io/jpittelkow/housarr:latest`

**Base:** `php:8.3-fpm-alpine`

**Exposed Port:** 80

**Processes (managed by Supervisor):**
- Nginx
- PHP-FPM

**PHP Extensions:**
- pdo_sqlite, pdo_mysql, pdo_pgsql
- mbstring, gd, zip, intl
- opcache, redis

## Files

### docker-compose.yml

The main compose file for deployment.

### docker/app/Dockerfile

Multi-stage build:
1. **Stage 1 (frontend):** Builds React frontend with Node.js
2. **Stage 2 (app):** PHP-FPM + Nginx + compiled frontend

### docker/app/entrypoint.sh

Startup script that:
1. Syncs migrations from backup (handles volume mount overwrites)
2. Sets correct permissions
3. Creates SQLite database if needed
4. Runs migrations

### docker/app/nginx.conf

Nginx configuration:
- Serves React frontend at `/`
- Proxies `/api/*` and `/sanctum/*` to PHP-FPM
- Serves uploaded files from `/storage`

### docker/app/supervisord.conf

Manages Nginx and PHP-FPM processes.

## Troubleshooting

### Container won't start

Check logs:
```bash
docker compose logs housarr
```

Common issues:
- **Missing APP_KEY:** Generate one with the command above
- **Permission denied:** The container handles permissions automatically, but host volume permissions may need adjustment

### Session errors / "Unauthenticated"

Ensure `APP_URL` matches how you access the app:
- ✅ `APP_URL=http://192.168.1.100:8000` → access via `http://192.168.1.100:8000`
- ❌ `APP_URL=http://localhost:8000` → accessing via IP won't work

### Database errors

The SQLite database is created automatically. If you have issues:

```bash
# Enter the container
docker compose exec housarr sh

# Check database
ls -la /var/www/html/database/

# Run migrations manually
php artisan migrate --force
```

### File upload issues

Ensure the storage volume is mounted correctly and has write permissions:

```bash
docker compose exec housarr ls -la /var/www/html/storage/app/
```

## Development

For local development without Docker:

```bash
# Backend
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

## Building the Image

To build locally:

```bash
docker build -f docker/app/Dockerfile -t housarr:local .
```

To build for multiple architectures:

```bash
docker buildx build -f docker/app/Dockerfile \
  --platform linux/amd64,linux/arm64 \
  -t ghcr.io/jpittelkow/housarr:latest \
  --push .
```
