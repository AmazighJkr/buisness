# Embedded Systems & IoT Portfolio

React + Django portfolio with Django admin, project lab pages, and client command tracking.

Works in **two places** with the same codebase:

| | **Local (develop)** | **Render (online)** |
|---|---------------------|---------------------|
| **Start** | `run.bat` | Push to GitHub → auto deploy |
| **Website** | http://localhost:5173 | `https://your-app.onrender.com` |
| **API** | http://127.0.0.1:8000/api/ | same host `/api/` |
| **Database** | SQLite `backend/db.sqlite3` | PostgreSQL (Render) |
| **Uploads** | `backend/media/` | `backend/media/` (ephemeral on free tier) |
| **Hot reload** | Yes (Vite) | No — push to update |

---

## Local development

### First time

```cmd
installer.bat
```

### Every day — one terminal

```cmd
run.bat
```

- **Site:** http://localhost:5173  
- **Admin:** http://127.0.0.1:8000/admin/  
- **API:** http://127.0.0.1:8000/api/projects/  

Login: `admin` / `admin_lab_2026` (from `ensure_admin`)

`run.bat` runs migrations automatically, uses **SQLite** (`USE_SQLITE=true` in `backend/.env`), and does **not** use Render env vars.

### Test production mode locally (optional)

```cmd
run.bat production
```

→ http://localhost:8000 (built React + API, like Render)

---

## Render (live site)

1. Push code to GitHub (`git push`).
2. Render builds with `render-build.sh` and runs on PostgreSQL.
3. Open your service URL from the [Render dashboard](https://dashboard.render.com).

**Admin password:** Render → Web Service → **Environment** → `ADMIN_PASSWORD`

Details: [RENDER.md](./RENDER.md)

### Deploy updates

```cmd
git add .
git commit -m "Your changes"
git push
```

Render redeploys; local `run.bat` is unchanged.

---

## Important: keep local and Render separate

| Variable | Local `backend/.env` | Render dashboard |
|----------|----------------------|------------------|
| `USE_SQLITE` | `true` | *(do not set)* |
| `DATABASE_URL` | *(do not set)* | Set by Postgres |
| `DEBUG` | `true` | `false` |
| `SERVE_FRONTEND` | *(omit)* | `true` |

Never copy Render’s `DATABASE_URL` into local `.env` — you would point your PC at the cloud database.

---

## Data storage

| What | Local | Render |
|------|-------|--------|
| Projects, comments, commands, chat text | SQLite file | PostgreSQL |
| Images / attachments | `backend/media/` | `backend/media/` (back up for production) |

**Backup local:** copy `backend/db.sqlite3` + `backend/media/`

---

## Project structure

```
buisness/
├── run.bat              ← local dev (one terminal)
├── render-build.sh      ← Render build only
├── render.yaml          ← Render Blueprint
├── backend/             ← Django API
├── frontend/            ← React (Vite)
└── frontend_dist/       ← built site (Render / run.bat production)
```

---

## API (same paths everywhere)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/projects/` | List projects |
| GET | `/api/projects/<uuid>/` | Project detail |
| POST | `/api/commands/` | Submit command |
| POST | `/api/token/` | Admin JWT login |

More: [DEPLOY.md](./DEPLOY.md) · [RENDER.md](./RENDER.md)
