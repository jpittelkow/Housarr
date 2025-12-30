# Housarr on Unraid

Single-container deployment with SQLite - simple and self-contained.

## Prerequisites

- Unraid 6.9+ with Docker enabled
- **Docker Compose Manager** plugin (install from Community Applications)

## Installation

### 1. Create Directory & Clone

SSH into Unraid (or use web terminal):

```bash
mkdir -p /mnt/user/appdata/housarr
cd /mnt/user/appdata/housarr
git clone https://github.com/jpittelkow/Housarr.git .
```

### 2. Configure Environment

```bash
cd docker/unraid
cp env.example .env
```

**Generate your APP_KEY:**
```bash
docker run --rm php:8.2-cli php -r "echo 'base64:' . base64_encode(random_bytes(32)) . PHP_EOL;"
```

**Edit `.env` and paste your key:**
```bash
nano .env
```

Update these values:
- `APP_KEY` - Paste the generated key
- `APP_URL` - Your Unraid IP (e.g., `http://192.168.1.100:8000`)
- `TZ` - Your timezone (e.g., `America/Chicago`)

### 3. Add Stack in Unraid

1. Go to **Docker** → **Compose** in Unraid web UI
2. Click **Add New Stack**
3. Set:
   - **Name:** `housarr`
   - **Compose File:** Browse to `/mnt/user/appdata/housarr/docker/unraid/docker-compose.unraid.yml`
4. Click **Save**

### 4. Start Housarr

1. Find **housarr** in the Compose stacks
2. Click **▶ Compose Up**
3. First build takes ~5 minutes (building PHP image + frontend)

### 5. Access

Open: **http://YOUR_UNRAID_IP:8000**

Create your account and start adding items!

---

## Data Storage

All data is stored in `/mnt/user/appdata/housarr/`:

| Folder | Contents |
|--------|----------|
| `database/` | SQLite database file |
| `storage/` | Uploaded files, manuals, images |
| `logs/` | Application logs |

**Back up the `database/` and `storage/` folders regularly!**

---

## Reverse Proxy (Optional)

### Nginx Proxy Manager

1. Add Proxy Host:
   - **Domain:** `housarr.yourdomain.com`
   - **Forward Hostname/IP:** Your Unraid IP
   - **Forward Port:** `8000`
   - **Websockets:** ON
   - **SSL:** Request certificate

2. Update `.env`:
   ```
   APP_URL=https://housarr.yourdomain.com
   ```

3. Restart: In Docker Compose Manager, click **🔄 Compose Restart**

---

## Updating

```bash
cd /mnt/user/appdata/housarr
git pull
```

Then in Unraid Docker Compose Manager:
1. Click **⬇ Compose Down**
2. Click **🔨 Compose Build** (rebuilds with updates)
3. Click **▶ Compose Up**

---

## Troubleshooting

### View Logs
```bash
cd /mnt/user/appdata/housarr/docker/unraid
docker compose -f docker-compose.unraid.yml logs -f
```

### Restart Container
In Docker Compose Manager, click **🔄 Compose Restart**

### Reset Database (⚠️ Deletes all data)
```bash
rm /mnt/user/appdata/housarr/database/database.sqlite
# Then restart the container - it will create a fresh database
```

### Permission Issues
```bash
docker exec housarr chown -R www-data:www-data /var/www/html/storage /var/www/html/database
```

---

## Configuration Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `APP_KEY` | Encryption key **(required)** | - |
| `APP_PORT` | Web UI port | `8000` |
| `APP_URL` | Full URL to Housarr | `http://localhost:8000` |
| `TZ` | Timezone | `America/New_York` |
| `APPDATA_PATH` | Data storage path | `/mnt/user/appdata/housarr` |
