@echo off
setlocal
cd /d "%~dp0"

if /I "%~1"=="production" goto :production
if /I "%~1"=="prod" goto :production

REM ========== DEV: one terminal, one script (API + Vite) ==========
if exist "%ProgramFiles%\nodejs\npm.cmd" set "PATH=%ProgramFiles%\nodejs;%PATH%"

echo ============================================================
echo   EmbeddedGrid - starting (one terminal)
echo   Site:  http://localhost:5173
echo   API:   http://127.0.0.1:8000
echo   Press Ctrl+C to stop both.
echo ============================================================
echo.

cd backend
if not exist ".venv\Scripts\python.exe" (
  echo Creating Python venv...
  python -m venv .venv
  .venv\Scripts\python.exe -m pip install -r requirements.txt -q
)
if not exist ".env" if exist ".env.example" copy /Y ".env.example" ".env" >nul
.venv\Scripts\python.exe manage.py migrate --noinput
start /B "" .venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
cd ..\frontend

where npm >nul 2>&1
if errorlevel 1 (
  echo ERROR: npm not found. Run installer.bat first.
  call :stop_backend
  pause
  exit /b 1
)
if not exist "node_modules\" (
  echo Installing frontend packages...
  call npm install
)
timeout /t 2 /nobreak >nul
call npm run dev
call :stop_backend
goto :eof

:production
REM ========== PRODUCTION: one process, one port ==========
if not exist "frontend_dist\index.html" (
  echo Building for production...
  call "%~dp0deploy\build.bat"
  if errorlevel 1 exit /b 1
)
if not exist "backend\.env" (
  if exist "backend\.env.example" copy /Y "backend\.env.example" "backend\.env" >nul
  if exist ".env.example" copy /Y ".env.example" "backend\.env" >nul
  echo Created backend\.env — set ALLOWED_HOSTS and SECRET_KEY for a real server.
)
echo.
echo   Production: http://localhost:8000  (site + API + uploads)
echo   Press Ctrl+C to stop.
echo.
cd backend
if not exist ".venv\Scripts\gunicorn.exe" (
  .venv\Scripts\python.exe -m pip install -r requirements.txt -q
)
set DEBUG=false
set SERVE_FRONTEND=true
.venv\Scripts\python.exe manage.py migrate --noinput
.venv\Scripts\gunicorn.exe config.wsgi:application --bind 0.0.0.0:8000 --workers 2 --timeout 120
goto :eof

:stop_backend
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*manage.py runserver*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>&1
exit /b 0
