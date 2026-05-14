@echo off
cd /d "c:\Users\USER\OneDrive - itum.mrt.ac.lk\Desktop\Dalupotha\backend"
echo Rebuilding notification-service...
docker-compose build --no-cache notification-service
echo Build complete. Restarting service...
docker-compose up -d notification-service
echo Service restarted.
docker-compose ps notification-service
echo Done.
pause
