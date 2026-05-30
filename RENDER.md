# Deploy on Render.com

One **Web Service** serves the React site, API, and uploads on a single URL like `https://embeddedgrid.onrender.com`.

---

## Quick deploy (Blueprint)

1. Push this project to **GitHub** (or GitLab).
2. Go to [render.com](https://render.com) → **Sign up** / log in.
3. **New** → **Blueprint** → connect your repo.
4. Render reads `render.yaml` and creates:
   - **PostgreSQL** database (persistent data)
   - **Web service** (Django + built React)
5. Click **Apply** and wait for the first deploy (~5–10 min).
6. Open your app URL from the dashboard.

### Admin login

After deploy, in the web service → **Environment**:

| Variable | Where to find it |
|----------|------------------|
| `ADMIN_USERNAME` | `admin` (default) |
| `ADMIN_PASSWORD` | Auto-generated — click **eye** icon to reveal |

Admin panel: `https://YOUR-APP.onrender.com/admin-panel`

Change `ADMIN_PASSWORD` in Environment and redeploy (or run **Shell** → `python manage.py changepassword admin`).

---

## Manual deploy (without Blueprint)

1. **New** → **PostgreSQL** (free) → note the **Internal Database URL**.
2. **New** → **Web Service** → connect repo.
3. Settings:

| Field | Value |
|-------|--------|
| **Root Directory** | *(leave empty — repo root)* |
| **Runtime** | Python |
| **Build Command** | `bash ./render-build.sh` |
| **Start Command** | `cd backend && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --timeout 120` |

4. **Environment variables**:

| Key | Value |
|-----|--------|
| `PYTHON_VERSION` | `3.12.7` |
| `NODE_VERSION` | `20.18.0` |
| `DEBUG` | `false` |
| `SERVE_FRONTEND` | `true` |
| `DJANGO_SECRET_KEY` | *(generate — long random string)* |
| `DATABASE_URL` | *(paste from PostgreSQL dashboard)* |
| `ADMIN_PASSWORD` | *(your secure password)* |
| `ADMIN_USERNAME` | `admin` |
| `SEED_DEMO` | `true` *(optional demo projects)* |

5. **Create Web Service** → wait for deploy.

---

## What Render stores

| Data | Storage |
|------|---------|
| Projects, comments, commands, messages (text/links) | **PostgreSQL** (via `DATABASE_URL`) |
| Uploaded images/files | **Disk on the web service** |

**Important — schematic images & uploads:**

| Symptom | Cause |
|---------|--------|
| **Failed to fetch** when posting | Server waking up, session expired, or image **over 5 MB** |
| **Uploaded but image missing** later | Render **free** disk is wiped on **redeploy/restart** (DB still has the path, file is gone) |

**Keep uploads permanently (recommended):**

1. Render → **embeddedgrid** → **Disk** (under MANAGE) → **Add disk**  
   - Mount path: `/var/data`  
   - Size: 1 GB (requires paid instance on some plans)  
2. **Environment** → add `MEDIA_ROOT` = `/var/data/media`  
3. **Save** and redeploy  

Until you add a disk, re-upload schematics after each deploy. Use images **under 5 MB** (PNG/JPG/WebP).

---

## Free tier notes

- Service **spins down** after ~15 min idle; first visit may take 30–60 s to wake up.
- Free PostgreSQL expires after **90 days** (renew or upgrade).
- Custom domain: Web Service → **Settings** → **Custom Domains**.

---

## Redeploy

Push to your connected branch → Render rebuilds automatically.

Or: Dashboard → your service → **Manual Deploy** → **Deploy latest commit**.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Build fails on `pipefail` / `invalid option` | Windows CRLF in `render-build.sh` — pull latest (includes `.gitattributes`) or build uses `sed` to strip `\r` |
| `tracking_code_*_like already exists` | Pull latest (fixes migration 0009 + repair command), redeploy |
| Build fails on `npm` | Ensure `NODE_VERSION=20.18.0` is set |
| 400 Bad Request / DisallowedHost | `RENDER_EXTERNAL_HOSTNAME` is set automatically; add custom domain to `ALLOWED_HOSTS` env |
| Admin login fails | Check `ADMIN_PASSWORD` in Environment; redeploy after changing it |
| Empty site | Set `SEED_DEMO=true` and redeploy, or add projects in admin panel |
| Build logs | Dashboard → **Logs** → **Build** / **Deploy** |
