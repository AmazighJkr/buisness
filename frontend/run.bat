@echo off
cd /d "%~dp0"

REM Use Node from default install if CMD was not restarted after install
if exist "%ProgramFiles%\nodejs\npm.cmd" set "PATH=%ProgramFiles%\nodejs;%PATH%"

where npm >nul 2>&1
if errorlevel 1 (
  echo.
  echo ERROR: npm not found. Install Node.js LTS from https://nodejs.org/
  echo Then close and reopen CMD, and run this script again.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 exit /b 1
)

echo.
echo Frontend: http://localhost:5173
echo Backend must be running: backend\run.bat  ^(http://127.0.0.1:8000^)
echo.
call npm run dev
