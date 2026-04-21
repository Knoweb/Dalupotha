@echo off
echo ==============================================
echo  Dalupotha Backend - Docker Auto Restart Mode
echo ==============================================
cd /d "%~dp0"

echo Starting containers...
docker compose up -d
if errorlevel 1 goto :error

echo.
echo Watching backend source changes...
echo - Java/pom.xml/Dockerfile changes will auto rebuild and restart affected service.
echo - Keep this window open while developing backend.
echo.
docker compose watch
if errorlevel 1 goto :error

goto :eof

:error
echo.
echo Failed to start Docker watch mode.
echo Ensure Docker Desktop is running and supports "docker compose watch".
pause
