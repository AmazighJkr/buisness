@echo off
cd /d "%~dp0..\backend"
if not exist ".env" (
  echo Copy .env.example to backend\.env and edit ALLOWED_HOSTS + SECRET_KEY first.
  pause
  exit /b 1
)
if not exist "..\frontend_dist\index.html" (
  echo Run deploy\build.bat first.
  pause
  exit /b 1
)
echo Starting on http://0.0.0.0:8000  (site + API + uploads on one port)
.venv\Scripts\gunicorn.exe config.wsgi:application --bind 0.0.0.0:8000 --workers 2 --timeout 120
