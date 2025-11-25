#!/bin/sh
# Zeabur startup script to handle PORT environment variable

# Get port from environment or default to 8000
PORT=${PORT:-8000}

echo "Starting server on port $PORT"

# Start uvicorn with the configured port
exec uvicorn backend.main:socket_app --host 0.0.0.0 --port $PORT
