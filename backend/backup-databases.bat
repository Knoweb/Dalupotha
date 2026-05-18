@echo off
setlocal enabledelayedexpansion

echo ======================================================================
echo   Dalupotha SaaS Database Backup Utility
echo ======================================================================
echo.

:: Define backup directory
set BACKUP_DIR=.\backups
if not exist "%BACKUP_DIR%" (
    mkdir "%BACKUP_DIR%"
)

:: Get current timestamp for unique filename
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c-%%a-%%b)
for /f "tokens=1-2 delims=: " %%a in ('time /t') do (set mytime=%%a%%b)
set TIMESTAMP=%mydate%_%mytime%
set BACKUP_FILE=%BACKUP_DIR%\dalupotha_all_db_%TIMESTAMP%.sql

echo [1/3] Verifying PostgreSQL container status...
docker ps --filter "name=dalupotha-postgres" --format "{{.Status}}" | findstr "Up" >nul
if errorlevel 1 (
    echo [ERROR] PostgreSQL container 'dalupotha-postgres' is not running!
    echo Please make sure docker compose is active.
    exit /b 1
)

echo [2/3] Exporting all databases (auth_db, collection_db, dalupotha) from PostgreSQL...
docker exec -t dalupotha-postgres pg_dumpall -U dalupotha_user > "%BACKUP_FILE%"

if errorlevel 1 (
    echo [ERROR] Backup failed during pg_dumpall export!
    exit /b 1
)

echo [3/3] Compressing backup file...
:: Check if PowerShell is available to zip, otherwise leave raw SQL
powershell -Command "Compress-Archive -Path '%BACKUP_FILE%' -DestinationPath '%BACKUP_FILE%.zip' -Force" >nul 2>&1
if exist "%BACKUP_FILE%.zip" (
    del "%BACKUP_FILE%"
    echo [SUCCESS] Backup completed successfully!
    echo Saved to: %BACKUP_FILE%.zip
) else (
    echo [SUCCESS] Backup completed successfully! (PowerShell compress skipped)
    echo Saved to: %BACKUP_FILE%
)

echo.
echo ======================================================================
endlocal
