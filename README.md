# Embedded Systems & IoT Portfolio (Full Stack)

Cyber-industrial React frontend + Django REST API for an embedded engineering portfolio and client order platform.

## Stack

| Layer    | Tech |
|----------|------|
| Frontend | React 19, Vite, Tailwind CSS 4, Lucide React, React Router |
| Backend  | Django 5, DRF, SimpleJWT, django-cors-headers, SQLite (local) |

## Local setup

### Install everything (one command)

From the project root:

```cmd
installer.bat
```

Installs backend Python packages (venv), runs migrations, seeds demo data, and runs `npm install` for the frontend.

### 1. Backend (Terminal 1)

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
copy .env.example .env
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py seed_demo
.\.venv\Scripts\python.exe manage.py createsuperuser
.\.venv\Scripts\python.exe manage.py runserver
```

**Windows CMD shortcut:** from `backend`, run `run.bat` (always uses the venv Python).

> If you see `ModuleNotFoundError: No module named 'dotenv'`, your shell is using **global** Python instead of `.venv`. Use `.\.venv\Scripts\python.exe` (not plain `python`), or run `run.bat`.

API: http://127.0.0.1:8000/api/projects/  
Admin: http://127.0.0.1:8000/admin/

**Demo client:** `demo_client` / `demo_client_pass`

### 2. Frontend (Terminal 2)

Requires [Node.js](https://nodejs.org/) 18+ (includes `npm`). Install it, **restart CMD**, then:

**Windows CMD shortcut:**

```cmd
cd frontend
run.bat
```

**Or manually:**

```cmd
cd frontend
npm install
npm run dev
```

App: http://localhost:5173  
Command form (no login): http://localhost:5173/command  
Admin panel: http://localhost:5173/admin-panel  

Vite proxies `/api` and `/media` to Django — no `VITE_API_URL` needed locally. Keep **both** terminals open: `backend\run.bat` + `frontend\run.bat`.

### Admin — post projects

1. Default admin (created by `installer.bat` or run manually):
   ```cmd
   cd backend
   .\.venv\Scripts\python.exe manage.py ensure_admin
   ```
   **Username:** `admin`  
   **Password:** `admin_lab_2026`
2. Open http://localhost:5173/admin-panel and log in, **or** use Django admin at http://127.0.0.1:8000/admin/
3. Use **POST** tab to publish projects to the gallery; **COMMANDS** tab lists client requests.

## API endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/projects/` | Public | List projects |
| GET | `/api/projects/<uuid>/` | Public | Project detail |
| POST | `/api/commands/` | Public | Submit project command (no login) |
| POST/GET/PATCH/DELETE | `/api/admin/projects/` | Staff JWT | Manage projects |
| GET | `/api/admin/commands/` | Staff JWT | List client commands |
| POST | `/api/token/` | Public | Admin/staff JWT login |

## Project structure

```
buisness/
├── backend/
│   ├── config/          # Django settings & URLs
│   └── portfolio/       # models, serializers, views, urls
└── frontend/
    └── src/
        ├── api/         # API client
        ├── components/  # UI building blocks
        └── pages/       # Home, Project detail, Client portal, Contact
```

## Render deployment (later)

1. **Backend:** Web service, `gunicorn config.wsgi`, PostgreSQL add-on, set env vars from `.env.example`, `python manage.py migrate` in build.
2. **Frontend:** Static site or web service; set `VITE_API_URL` to your Django URL.
3. Update `CORS_ALLOWED_ORIGINS` and `ALLOWED_HOSTS` for production domains.

## Adding projects

Use Django admin or shell:

```python
from portfolio.models import Project
Project.objects.create(
    title="My Module",
    chip_model="MOD-ESP32-V2",
    description="...",
    hardware_specs={"tech_stack": ["ESP32"], "bom": [{"part": "ESP32", "qty": 1, "notes": ""}]},
    source_code="# firmware here",
    circuit_simulation_url="https://wokwi.com/...",
)
```
