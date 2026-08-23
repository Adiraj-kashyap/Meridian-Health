@echo off
setlocal enabledelayedexpansion
title Healthcare Appointment Manager - Setup and Launch
cd /d "%~dp0"

echo ================================================================
echo   Healthcare Appointment Manager - one-click setup and launch
echo ================================================================
echo.

REM ---------------------------------------------------------------
REM 1. Check Node.js
REM ---------------------------------------------------------------
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found on PATH.
  echo         Install it from https://nodejs.org ^(LTS^) and re-run this script.
  pause
  exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do echo Found Node.js %%v

REM ---------------------------------------------------------------
REM 2. Check / start Docker Desktop (for local Postgres)
REM ---------------------------------------------------------------
set DOCKER_OK=0
where docker >nul 2>nul
if errorlevel 1 (
  echo [WARN] Docker was not found on PATH - will skip local Postgres.
  echo        Point DATABASE_URL in backend\.env at your own Postgres instance instead.
  goto after_docker
)

docker info >nul 2>nul
if not errorlevel 1 (
  set DOCKER_OK=1
  goto after_docker
)

echo Docker is installed but not running - attempting to start Docker Desktop...
if exist "%ProgramFiles%\Docker\Docker\Docker Desktop.exe" (
  start "" "%ProgramFiles%\Docker\Docker\Docker Desktop.exe"
) else (
  echo [WARN] Could not find Docker Desktop.exe automatically - please start it manually.
)

echo Waiting up to 90 seconds for the Docker engine to come up...
set /a DOCKER_WAIT=0
:wait_docker_loop
timeout /t 3 >nul
docker info >nul 2>nul
if not errorlevel 1 (
  set DOCKER_OK=1
  goto after_docker
)
set /a DOCKER_WAIT+=1
if !DOCKER_WAIT! lss 30 goto wait_docker_loop
echo [WARN] Docker still isn't ready - continuing without local Postgres.
echo        Re-run this script once Docker Desktop has finished starting.

:after_docker

REM ---------------------------------------------------------------
REM 3. Backend .env
REM ---------------------------------------------------------------
if not exist backend\.env (
  copy backend\.env.example backend\.env >nul
  echo Created backend\.env from .env.example.
  echo   -^> Edit it later to add ANTHROPIC_API_KEY / SMTP / Google Calendar credentials.
)

REM ---------------------------------------------------------------
REM 4. Frontend .env
REM ---------------------------------------------------------------
if not exist frontend\.env (
  copy frontend\.env.example frontend\.env >nul
  echo Created frontend\.env from .env.example.
)

REM ---------------------------------------------------------------
REM 5. Start Postgres via docker compose
REM ---------------------------------------------------------------
if not "%DOCKER_OK%"=="1" goto skip_postgres

echo.
echo Starting Postgres ^(docker compose^)...
pushd backend
docker compose up -d
popd

echo Waiting for Postgres to accept connections...
set /a PG_WAIT=0
:wait_pg_loop
docker compose -f backend\docker-compose.yml exec -T postgres pg_isready -U postgres >nul 2>nul
if not errorlevel 1 goto pg_ready
set /a PG_WAIT+=1
if !PG_WAIT! geq 20 goto pg_wait_timeout
timeout /t 2 >nul
goto wait_pg_loop

:pg_wait_timeout
echo [WARN] Postgres did not report ready in time - continuing anyway.

:pg_ready
echo Postgres is up.
goto after_postgres

:skip_postgres
echo.
echo Skipping Postgres startup ^(Docker unavailable^). Make sure DATABASE_URL in
echo backend\.env points at a reachable Postgres instance before continuing.

:after_postgres

REM ---------------------------------------------------------------
REM 6. Install backend dependencies
REM ---------------------------------------------------------------
if not exist backend\node_modules (
  echo.
  echo Installing backend dependencies ^(this can take a minute^)...
  pushd backend
  call npm install
  if errorlevel 1 (
    echo [ERROR] backend npm install failed.
    popd
    pause
    exit /b 1
  )
  popd
) else (
  echo Backend dependencies already installed.
)

REM ---------------------------------------------------------------
REM 7. Database migrations + seed data (only if Postgres is reachable)
REM ---------------------------------------------------------------
if "%DOCKER_OK%"=="1" (
  pushd backend
  if not exist prisma\migrations (
    echo.
    echo Creating and applying the initial database migration...
    call npx prisma migrate dev --name init
  ) else (
    echo.
    echo Applying database migrations...
    call npx prisma migrate deploy
  )
  call npx prisma generate

  echo Seeding demo accounts ^(admin / 2 doctors / 1 patient^)...
  call npm run seed
  popd
) else (
  echo Skipping migrations/seed - no reachable database yet.
)

REM ---------------------------------------------------------------
REM 8. Install frontend dependencies
REM ---------------------------------------------------------------
if not exist frontend\node_modules (
  echo.
  echo Installing frontend dependencies ^(this can take a minute^)...
  pushd frontend
  call npm install
  if errorlevel 1 (
    echo [ERROR] frontend npm install failed.
    popd
    pause
    exit /b 1
  )
  popd
) else (
  echo Frontend dependencies already installed.
)

REM ---------------------------------------------------------------
REM 9. Launch backend + frontend dev servers in their own windows
REM ---------------------------------------------------------------
echo.
echo Launching backend  ^(http://localhost:4000^) ...
start "Healthcare Manager - Backend"  cmd /k "cd /d %~dp0backend && npm run dev"

echo Launching frontend ^(http://localhost:5173^) ...
start "Healthcare Manager - Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

REM ---------------------------------------------------------------
REM 10. Wait for the frontend to answer, then open the browser
REM ---------------------------------------------------------------
echo.
echo Waiting for the frontend to come online...
set /a FE_WAIT=0
:wait_fe_loop
curl -sf -o nul http://localhost:5173 >nul 2>nul
if not errorlevel 1 goto fe_ready
set /a FE_WAIT+=1
if !FE_WAIT! geq 30 goto fe_ready
timeout /t 1 >nul
goto wait_fe_loop
:fe_ready

start "" "http://localhost:5173"

echo.
echo ================================================================
echo   Up and running.
echo     Frontend:  http://localhost:5173
echo     Backend:   http://localhost:4000/health
echo.
echo   Demo logins ^(password: Password123!^):
echo     admin@clinic.local
echo     dr.rao@clinic.local     ^(General Medicine^)
echo     dr.iyer@clinic.local    ^(Cardiology^)
echo     patient@example.com
echo.
echo   Backend and frontend are running in their own windows -
echo   close those windows (or Ctrl+C in them) to stop the servers.
echo ================================================================
echo.
pause
