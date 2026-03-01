@echo off
REM 1. Set the working directory to the location of this batch file
cd /d "%~dp0"

echo [1/5] Starting backend database with Docker...
cd backend\database
docker compose --env-file ..\.env -f db-compose-dev.yml up -d

REM Check if Docker started successfully
if %ERRORLEVEL% neq 0 (
    echo.
    echo ERROR: Docker failed to start. Please ensure Docker Desktop is running.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/5] Docker started. Waiting 30s for Database to initialize...
timeout /t 30 /nobreak

echo.
echo [3/5] Installing backend dependencies...
cd ..
call npm install
if %ERRORLEVEL% neq 0 (
    echo.
    echo ERROR: Backend 'npm install' failed.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [4/5] Running database setup...
cd database
call node setup.js
if %ERRORLEVEL% neq 0 (
    echo.
    echo ERROR: Database setup.js failed. Check your script and .env variables.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [5/5] Installing frontend dependencies...
cd ..\..\frontend
call npm install
if %ERRORLEVEL% neq 0 (
    echo.
    echo ERROR: Frontend 'npm install' failed.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo =========================================
echo Environment setup successfully completed!
echo =========================================
pause