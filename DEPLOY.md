# Deploy on one server (one IP address)

**Render.com (recommended cloud):** see [RENDER.md](./RENDER.md) and `render.yaml`.

---

Locally you run **two** processes (Vite `:5173` + Django `:8000`). On the server everything runs as **one** app on **one port** (e.g. `http://YOUR_IP:8000`).

| URL on server | What it is |
|---------------|------------|
| `/` | React website (home, projects, command, track) |
| `/api/...` | Django API (same as local) |
| `/media/...` | Uploaded images/files |
| `/admin/` | Staff admin UI (Django admin) |

The frontend uses **relative** API URLs (`/api/...`), so no second IP or `VITE_API_URL` is needed in production.

---

## Where data is saved (you DO have a database)

Nothing is stored “only in the browser”. Everything persistent lives on the **server disk**:

### 1. SQLite database — `backend/db.sqlite3`

This is a real database file. Django creates and updates it automatically.

| Stored here | Examples |
|-------------|----------|
| Projects | title, description, materials, wiring, code files JSON |
| Categories | names, tree |
| **Comments** (public on projects) | author name, text, time |
| **Commands** | client email, idea, status, tracking code |
| **Command messages** (private chat) | text, link URL, who sent it |
| Users | admin accounts, permissions |

### 2. Media folder — `backend/media/`

Binary uploads (not inside the SQL file):

| Path | Content |
|------|---------|
| `media/projects/schematics/` | Project schematic images |
| `media/commands/` | Command form attachments |
| `media/commands/messages/` | Images posted in command chat |

### Backup (important)

Copy these to backup the whole site:

```
backend/db.sqlite3
backend/media/     (entire folder)
```

---

## Quick deploy (Windows server)

1. Install **Python 3.10+** and **Node.js** on the server.
2. Copy the whole project folder to the server.
3. Copy `.env.example` → `backend/.env` and set:
   - `DEBUG=False`
   - `DJANGO_SECRET_KEY=` (long random string)
   - `ALLOWED_HOSTS=` your server IP and/or domain
4. Run:
   ```bat
   deploy\build.bat
   deploy\run_production.bat
   ```
5. Open `http://SERVER_IP:8000` in a browser.
6. Admin panel: `http://SERVER_IP:8000/admin/`  
   Default admin (if seeded): `admin` / `admin_lab_2026` — change after login.

### Linux server

```bash
chmod +x deploy/build.sh deploy/run_production.sh
./deploy/build.sh
./deploy/run_production.sh
```

---

## Production tips

- **Port 80/443**: Put **nginx** in front and proxy to `127.0.0.1:8000`, or run gunicorn on 80 (needs admin rights).
- **HTTPS**: Use Let’s Encrypt (certbot) with nginx.
- **PostgreSQL**: For heavy traffic, set `DB_*` in `.env` (see `.env.example`) instead of SQLite.
- **Firewall**: Open only 80/443 (or 8000 if you skip nginx).

---

## Local dev

```bat
run.bat
```

One terminal — starts API and Vite together. Open http://localhost:5173

Or `installer.bat` once, then `run.bat`.
