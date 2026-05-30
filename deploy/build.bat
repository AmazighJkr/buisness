@echo off
setlocal
cd /d "%~dp0.."

echo === Building EmbeddedGrid for single-server deploy ===

if exist "%ProgramFiles%\nodejs\npm.cmd" set "PATH=%ProgramFiles%\nodejs;%PATH%"

echo [1/4] Frontend (npm run build)...
cd frontend
if not exist node_modules (
  call npm install
  if errorlevel 1 exit /b 1
)
call npm run build
if errorlevel 1 exit /b 1
cd ..

echo [2/4] Copy frontend to backend\frontend_dist...
if exist backend\frontend_dist rmdir /s /q backend\frontend_dist
xcopy /E /I /Y frontend\dist backend\frontend_dist >nul

echo [3/4] Python packages + migrate...
cd backend
if not exist .venv\Scripts\python.exe (
  python -m venv .venv
)
.venv\Scripts\python.exe -m pip install -r requirements.txt -q
.venv\Scripts\python.exe manage.py migrate --noinput
.venv\Scripts\python.exe manage.py collectstatic --noinput
.venv\Scripts\python.exe manage.py ensure_admin 2>nul
cd ..

echo [4/4] Done.
echo.
echo Start production server:
echo   deploy\run_production.bat
echo.
echo Open: http://YOUR_SERVER_IP:8000
exit /b 0
