#!/bin/bash
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/backend"
echo "Building notification-service..."
docker-compose build --no-cache notification-service
echo "Starting notification-service..."
docker-compose up -d notification-service
echo "Waiting for service to start..."
sleep 10
echo "Checking endpoint..."
curl -s http://localhost:8085/actuator/health
echo ""
echo "Testing TRI Circulars endpoint..."
curl -s http://localhost:8085/api/notifications/tri-circulars || echo "Endpoint not ready yet"
