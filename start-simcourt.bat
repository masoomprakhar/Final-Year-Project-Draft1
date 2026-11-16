@echo off
rem Installs dependencies on first run, then starts Simcourt on http://localhost:3100 and opens it.
cd /d "%~dp0"
if not exist node_modules (
  echo Installing dependencies, this takes a minute the first time...
  call npm install || exit /b 1
)
start "" http://localhost:3100
call npm run dev -- -p 3100
