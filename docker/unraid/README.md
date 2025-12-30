# Housarr on Unraid

This guide covers deploying Housarr on Unraid using Docker Compose Manager.

## Prerequisites

- Unraid 6.9+ with Docker enabled
- **Docker Compose Manager** plugin (install from Community Applications)
- Basic familiarity with Unraid terminal

## Quick Start

### 1. Create Directory Structure

SSH into Unraid or use the web terminal:

```bash
mkdir -p /mnt/user/appdata/housarr
cd /mnt/user/appdata/housarr
```

### 2. Clone Repository

```bash
git clone https://github.com/jpittelkow/Housarr.git .
```

### 3. Create Environment File

```bash
cp docker/unraid/.env.example .env
nano .env  # Edit with your settings
```

**Required settings to change:**
- `APP_KEY` - Generate with: `docker run --rm php:8.2-cli php -r "echo 'base64:' . base64_encode(random_bytes(32)) . PHP_EOL;"`
- `APP_URL` - Your Housarr URL (e.g., `http://192.168.1.100:8000`)
- `TZ` - Your timezone (e.g., `America/New_York`)

### 4. Build Frontend

```bash
cd frontend
docker run --rm -v $(pwd):/app -w /app node:20-alpine sh -c "npm ci && npm run build"
cd ..
```

### 5. Add to Docker Compose Manager

1. Go to **Docker** → **Compose** in Unraid web UI
2. Click **Add New Stack**
3. Configure:
   - **Name:** `housarr`
   - **Compose File:** Select `docker-compose.yml` from `/mnt/user/appdata/housarr`
4. Click **Save**

### 6. Start the Stack

1. Find **housarr** in the Compose stacks list
2. Click the **Play** button (Compose Up)
3. Wait for all services to be healthy (2-5 minutes first run)

### 7. Initialize Database

```bash
cd /mnt/user/appdata/housarr
docker compose exec php php artisan migrate --force
docker compose exec php php artisan storage:link
```

### 8. Access Housarr

Open your browser to `http://YOUR_UNRAID_IP:8000`

---

## Simplified Setup (SQLite)

For a simpler single-container setup with SQLite (no MySQL needed):

```bash
cd /mnt/user/appdata/housarr
docker compose -f docker/unraid/docker-compose.unraid.yml up -d
```

This uses:
- Single container with nginx + PHP
- SQLite database (simpler, no separate DB container)
- File-based cache/session (no Redis needed)

---

## Reverse Proxy Setup

### Using Nginx Proxy Manager (Recommended)

1. In Nginx Proxy Manager, add a new Proxy Host:
   - **Domain:** `housarr.yourdomain.com`
   - **Forward Hostname:** `housarr` (container name) or Unraid IP
   - **Forward Port:** `8000` (or `80` if using production overlay)
   - **Websockets Support:** ON
   - **SSL:** Request new certificate

2. Update your `.env`:
   ```
   APP_URL=https://housarr.yourdomain.com
   ```

3. Restart the stack.

### Using Traefik

Add these labels to the nginx service in your compose file:

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.housarr.rule=Host(`housarr.yourdomain.com`)"
  - "traefik.http.routers.housarr.entrypoints=websecure"
  - "traefik.http.routers.housarr.tls.certresolver=letsencrypt"
  - "traefik.http.services.housarr.loadbalancer.server.port=80"
```

---

## Data Persistence

All persistent data is stored in `/mnt/user/appdata/housarr/`:

| Path | Contents |
|------|----------|
| `data/` | Uploaded files, manuals, images |
| `backend/database/database.sqlite` | Database (if using SQLite) |
| `backend/storage/logs/` | Application logs |

**Backup these directories regularly!**

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `APP_PORT` | Web UI port | `8000` |
| `APP_KEY` | Encryption key (required) | - |
| `APP_URL` | Full URL to Housarr | `http://localhost:8000` |
| `APP_ENV` | Environment mode | `production` |
| `DB_CONNECTION` | Database type | `mysql` |
| `DB_PASSWORD` | MySQL password | - |
| `REDIS_PASSWORD` | Redis password | - |
| `TZ` | Timezone | `UTC` |

---

## Troubleshooting

### Container won't start

Check logs:
```bash
docker compose logs -f
```

### Database migration errors

```bash
docker compose exec php php artisan migrate:fresh --force
```
⚠️ This resets the database!

### Permission issues

```bash
docker compose exec php chown -R www-data:www-data /var/www/html/storage
docker compose exec php chmod -R 775 /var/www/html/storage
```

### Frontend shows blank page

Rebuild frontend:
```bash
cd frontend
docker run --rm -v $(pwd):/app -w /app node:20-alpine sh -c "npm ci && npm run build"
```

---

## Updating

```bash
cd /mnt/user/appdata/housarr
git pull
cd frontend && docker run --rm -v $(pwd):/app -w /app node:20-alpine sh -c "npm ci && npm run build" && cd ..
docker compose down
docker compose build --no-cache
docker compose up -d
docker compose exec php php artisan migrate --force
```

---

## Support

- [Documentation](../../docs/README.md)
- [GitHub Issues](https://github.com/jpittelkow/Housarr/issues)
