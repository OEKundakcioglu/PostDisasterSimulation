#!/bin/sh

set -e

# Default port if not set
PORT=${PORT:-8080}

echo "Starting Post Disaster Simulation services..."

# Generate nginx config with correct port
echo "Configuring nginx on port $PORT..."
envsubst '$PORT' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

# Start Spring Boot backend
echo "Starting Spring Boot backend on port 8083..."
java -jar app.jar --server.port=8083 &
BACKEND_PID=$!

# Wait for backend to be ready
echo "Waiting for backend to start..."
sleep 5

# Start Next.js frontend
echo "Starting Next.js frontend on port 3000..."
cd frontend
HOSTNAME=0.0.0.0 PORT=3000 node server.js &
FRONTEND_PID=$!
cd ..

# Wait for frontend to be ready
sleep 3

# Start nginx
echo "Starting nginx reverse proxy on port $PORT..."
nginx -g 'daemon off;' &
NGINX_PID=$!

echo "All services started successfully!"
echo "  - Backend:  http://localhost:8083"
echo "  - Frontend: http://localhost:3000"
echo "  - Nginx:    http://localhost:$PORT"

# Handle shutdown
shutdown() {
    echo "Shutting down..."
    kill $NGINX_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    kill $BACKEND_PID 2>/dev/null || true
    exit 0
}

trap shutdown SIGTERM SIGINT

# Wait for any process to exit
wait -n

# If one process exits, shut down all
shutdown
