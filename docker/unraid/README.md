# Housarr on Unraid

Single-container deployment with SQLite - simple and self-contained.

**Docker Image:** `ghcr.io/jpittelkow/housarr:latest`

## Quick Start

### Step 1: Generate APP_KEY (Required)

Run this in Unraid terminal to generate a secure key:

```bash
docker run --rm php:8.2-cli php -r "echo 'base64:' . base64_encode(random_bytes(32)) . PHP_EOL;"
```

This outputs something like:
```
base64:K7n9x2mPq3wR5tY8uI0oL6jH4gF1dS9aZ2xC5vB8nM4=
```

**⚠️ Important:** Copy the **entire output** including `base64:`. The key must be exactly 44 characters after `base64:` (32 bytes encoded). Do not create your own key.

---

## Option 1: Add Container (Unraid UI)

The easiest method - no command line needed!

### Step 1: Add Container

Go to **Docker** → **Add Container**:

| Field | Value |
|-------|-------|
| **Name** | `housarr` |
| **Repository** | `ghcr.io/jpittelkow/housarr:latest` |
| **Network Type** | `bridge` |
| **WebUI** | `http://[IP]:[PORT:8000]/` |
| **Icon URL** | `https://raw.githubusercontent.com/jpittelkow/Housarr/main/frontend/public/vite.svg` |

### Step 2: Add Port

Click **Add another Path, Port, Variable, Label or Device** → **Port**

| Field | Value |
|-------|-------|
| **Name** | `WebUI` |
| **Container Port** | `80` |
| **Host Port** | `8000` |
| **Connection Type** | `TCP` |

### Step 3: Add Paths

Click **Add another Path...** → **Path** (repeat 3 times):

| Name | Container Path | Host Path |
|------|----------------|-----------|
| `Database` | `/var/www/html/database` | `/mnt/user/appdata/housarr/database` |
| `Storage` | `/var/www/html/storage/app` | `/mnt/user/appdata/housarr/storage` |
| `Logs` | `/var/www/html/storage/logs` | `/mnt/user/appdata/housarr/logs` |

### Step 4: Add Variables

Click **Add another Path...** → **Variable** (repeat for each):

**Required:**

| Name | Key | Value |
|------|-----|-------|
| `App Key` | `APP_KEY` | `base64:YOUR_KEY_HERE` ⬅️ **From Step 1 above** |
| `App URL` | `APP_URL` | `http://YOUR_UNRAID_IP:8000` |

**Optional (have sensible defaults):**

| Name | Key | Value | Default |
|------|-----|-------|---------|
| `App Env` | `APP_ENV` | `production` | `production` |
| `Debug` | `APP_DEBUG` | `false` | `false` |
| `DB Connection` | `DB_CONNECTION` | `sqlite` | `sqlite` |
| `DB Database` | `DB_DATABASE` | `/var/www/html/database/database.sqlite` | auto |
| `Cache` | `CACHE_STORE` | `file` | `file` |
| `Session` | `SESSION_DRIVER` | `file` | `database` |
| `Queue` | `QUEUE_CONNECTION` | `sync` | `sync` |
| `Timezone` | `TZ` | `America/New_York` | `UTC` |

### Step 5: Apply

Click **Apply** - Housarr will:
1. Create the database if it doesn't exist
2. Run migrations automatically
3. Start and be available at `http://YOUR_UNRAID_IP:8000`

---

## What Happens on Startup

The container automatically:
1. ✅ Restores migration files (needed because volume mounts can overwrite them)
2. ✅ Creates the SQLite database file if it doesn't exist
3. ✅ Sets correct file permissions
4. ✅ Creates session directory
5. ✅ Caches configuration
6. ✅ Runs database migrations

If you see errors on first startup, wait 10-15 seconds and refresh - the container may still be initializing.

---

## Option 2: Docker Compose

### Step 1: Setup

```bash
mkdir -p /mnt/user/appdata/housarr
cd /mnt/user/appdata/housarr
git clone https://github.com/jpittelkow/Housarr.git .
cd docker/unraid
cp env.example .env
```

### Step 2: Configure

Generate APP_KEY and edit `.env`:
```bash
docker run --rm php:8.2-cli php -r "echo 'base64:' . base64_encode(random_bytes(32)) . PHP_EOL;"
nano .env  # Paste key, set APP_URL
```

### Step 3: Start

Using Docker Compose Manager plugin:
1. **Docker** → **Compose** → **Add New Stack**
2. Point to `/mnt/user/appdata/housarr/docker/unraid/docker-compose.unraid.yml`
3. Click **Compose Up**

Or via command line:
```bash
docker compose -f docker-compose.unraid.yml up -d
```

---

## Data Storage

| Folder | Contents |
|--------|----------|
| `/mnt/user/appdata/housarr/database/` | SQLite database |
| `/mnt/user/appdata/housarr/storage/` | Uploaded files, manuals, images |
| `/mnt/user/appdata/housarr/logs/` | Application logs |

**Back up `database/` and `storage/` regularly!**

---

## Updating

### Via Unraid UI
1. Go to **Docker** tab
2. Click the Housarr icon → **Check for Updates**
3. If update available, click **Update**

### Via Command Line
```bash
docker pull ghcr.io/jpittelkow/housarr:latest
docker restart housarr
```

---

## Reverse Proxy (Optional)

### Nginx Proxy Manager

1. Add Proxy Host:
   - **Domain:** `housarr.yourdomain.com`
   - **Forward Hostname/IP:** Your Unraid IP
   - **Forward Port:** `8000`
   - **Websockets:** ON
2. Update `APP_URL` variable to `https://housarr.yourdomain.com`
3. Restart container

---

## Troubleshooting

### View Logs
```bash
docker logs housarr -f
```

### View Application Logs
```bash
cat /mnt/user/appdata/housarr/logs/laravel.log
```

### Restart Container
```bash
docker restart housarr
```

### "Unsupported cipher or incorrect key length" Error

Your `APP_KEY` is invalid. It must be exactly 32 bytes encoded as base64.

**Fix:** Generate a new key:
```bash
docker run --rm php:8.2-cli php -r "echo 'base64:' . base64_encode(random_bytes(32)) . PHP_EOL;"
```

Update the `APP_KEY` variable in your container settings with the **full output** including `base64:`, then restart.

### "No such table: users" Error

Migrations haven't run. First check if `APP_KEY` is valid (see above), then:

```bash
# Check migration status
docker exec housarr php /var/www/html/artisan migrate:status

# Manually run migrations
docker exec housarr php /var/www/html/artisan migrate --force
```

### Reset Database (⚠️ Deletes all data)
```bash
docker stop housarr
rm /mnt/user/appdata/housarr/database/database.sqlite
docker start housarr
```

### Permission Issues
```bash
docker exec housarr chown -R www-data:www-data /var/www/html/storage /var/www/html/database
```

### Clear Application Cache
```bash
docker exec housarr php /var/www/html/artisan config:clear
docker exec housarr php /var/www/html/artisan cache:clear
docker restart housarr
```

### "Session store not set on request" Error

This means your Unraid IP isn't in the allowed stateful domains. Add this environment variable:

| Key | Value |
|-----|-------|
| `SANCTUM_STATEFUL_DOMAINS` | `localhost,127.0.0.1,YOUR_UNRAID_IP,YOUR_UNRAID_IP:8000` |

Replace `YOUR_UNRAID_IP` with your actual IP (e.g., `192.168.1.100`), then restart the container.
