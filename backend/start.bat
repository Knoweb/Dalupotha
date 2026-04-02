@echo off
echo ================================
echo  Dalupotha Backend - Starting...
echo ================================
cd /d "%~dp0"
docker compose up -d
echo.
echo Services starting...
echo   Eureka Dashboard : http://localhost:8761
echo   Auth Service     : http://localhost:8081
echo   API Gateway      : http://localhost:8080
echo   pgAdmin          : http://localhost:5050  (admin@dalupotha.lk / admin123)
echo.
echo Run "docker compose logs -f" to watch logs
pause
