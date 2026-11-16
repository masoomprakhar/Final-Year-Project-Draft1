@echo off
setlocal
cd /d "%~dp0"
title Simcourt launcher

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js is not installed or not on PATH.
  echo Install the LTS version from https://nodejs.org , close this window, and run this file again.
  echo.
  pause
  exit /b 1
)

if not exist node_modules\next (
  echo Installing dependencies. This takes a few minutes the first time...
  call npm install
  if errorlevel 1 (
    echo.
    echo npm install failed. Scroll up for the error, then try again.
    pause
    exit /b 1
  )
)

echo Starting Simcourt on http://localhost:3100 ...
rem The dev server runs in its own window so its log stays visible.
start "Simcourt dev server" cmd /k "npm run dev -- -p 3100"

rem Wait until the server answers before opening the browser.
set /a tries=0
:wait
set /a tries+=1
powershell -NoProfile -Command "try { (Invoke-WebRequest -UseBasicParsing -TimeoutSec 3 http://localhost:3100/map).StatusCode } catch { exit 1 }" >nul 2>nul
if not errorlevel 1 goto open
if %tries% GEQ 60 (
  echo The server did not come up. Check the "Simcourt dev server" window for errors.
  pause
  exit /b 1
)
timeout /t 3 /nobreak >nul
goto wait

:open
start "" http://localhost:3100
echo Opened http://localhost:3100  (close the "Simcourt dev server" window to stop it)
timeout /t 5 >nul
