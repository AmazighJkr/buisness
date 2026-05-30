@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"

echo ============================================================
echo   Embedded IoT Portfolio - Dependency Installer
echo ============================================================
echo.

set "ERR=0"

REM --- Node.js on PATH (if CMD not restarted after Node install) ---
if exist "%ProgramFiles%\nodejs\npm.cmd" set "PATH=%ProgramFiles%\nodejs;%PATH%"

REM ===================== BACKEND (Python) =====================
echo [1/2] BACKEND - Python virtual environment and packages
echo ------------------------------------------------------------

where python >nul 2>&1
if errorlevel 1 (
  echo ERROR: Python not found. Install Python 3.10+ from https://www.python.org/
  echo        Check "Add python.exe to PATH" during setup.
  set "ERR=1"
  goto :frontend
)

cd /d "%~dp0backend"

if not exist ".venv\Scripts\python.exe" (
  echo Creating virtual environment...
  python -m venv .venv
  if errorlevel 1 (
    echo ERROR: Failed to create .venv
    set "ERR=1"
    goto :frontend
  )
)

echo Installing Python packages...
.venv\Scripts\python.exe -m pip install --upgrade pip -q
.venv\Scripts\python.exe -m pip install -r requirements.txt
if errorlevel 1 (
  echo ERROR: pip install failed
  set "ERR=1"
  goto :frontend
)

if not exist ".env" if exist ".env.example" (
  echo Creating .env from .env.example...
  copy /Y ".env.example" ".env" >nul
)

echo Running database migrations...
.venv\Scripts\python.exe manage.py migrate --noinput
if errorlevel 1 set "ERR=1"

echo Seeding demo projects ^(safe to re-run^)...
.venv\Scripts\python.exe manage.py seed_demo

echo Creating admin account...
.venv\Scripts\python.exe manage.py ensure_admin

echo Backend setup complete.
echo.

:frontend
cd /d "%~dp0"

REM ===================== FRONTEND (Node.js) =====================
echo [2/2] FRONTEND - npm packages
echo ------------------------------------------------------------

where npm >nul 2>&1
if errorlevel 1 (
  echo ERROR: npm not found.
  echo        Install Node.js LTS: https://nodejs.org/
  echo        Or run: winget install OpenJS.NodeJS.LTS
  echo        Then close CMD and run installer.bat again.
  set "ERR=1"
  goto :done
)

cd /d "%~dp0frontend"

echo Installing npm packages...
call npm install
if errorlevel 1 (
  echo ERROR: npm install failed
  set "ERR=1"
  goto :done
)

echo Frontend setup complete.
echo.

:done
cd /d "%~dp0"

echo ============================================================
if "%ERR%"=="0" (
  echo   SUCCESS - All dependencies installed.
  echo.
  echo   LOCAL DEV ^(every day, one terminal^):
  echo     run.bat
  echo     http://localhost:5173
  echo.
  echo   ONLINE ^(Render^): git push - see RENDER.md
  echo   LOCAL prod test: run.bat production
  echo   Admin: http://localhost:5173/admin-panel
  echo   Command: http://localhost:5173/command
) else (
  echo   FINISHED WITH ERRORS - Fix messages above and re-run.
)
echo ============================================================
echo.
pause
endlocal
exit /b %ERR%
