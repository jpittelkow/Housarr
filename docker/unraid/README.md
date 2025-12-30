# Housarr on Unraid

Single-container deployment with SQLite - simple and self-contained.

**Docker Image:** `ghcr.io/jpittelkow/housarr:latest`

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

| Name | Key | Value |
|------|-----|-------|
| `App Key` | `APP_KEY` | `base64:YOUR_KEY_HERE` ⬅️ **Generate below** |
| `App URL` | `APP_URL` | `http://YOUR_UNRAID_IP:8000` |
| `App Env` | `APP_ENV` | `production` |
| `Debug` | `APP_DEBUG` | `false` |
| `DB Connection` | `DB_CONNECTION` | `sqlite` |
| `DB Database` | `DB_DATABASE` | `/var/www/html/database/database.sqlite` |
| `Cache` | `CACHE_STORE` | `file` |
| `Session` | `SESSION_DRIVER` | `file` |
| `Queue` | `QUEUE_CONNECTION` | `sync` |
| `Timezone` | `TZ` | `America/New_York` |

**Generate APP_KEY** (run in Unraid terminal):
```bash
docker run --rm php:8.2-cli php -r "echo 'base64:' . base64_encode(random_bytes(32)) . PHP_EOL;"
```

### Step 5: Apply

Click **Apply** - Housarr will start and be available at `http://YOUR_UNRAID_IP:8000`

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

### Restart Container
```bash
docker restart housarr
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
