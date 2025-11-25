# Multi-stage build for optimized production image
FROM python:3.11-slim as builder

# Set working directory
WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Final stage
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /root/.local /root/.local

# Copy application code
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Make sure scripts in .local are usable
ENV PATH=/root/.local/bin:$PATH

# Set default port (Zeabur will override this)
ENV PORT=8000

# Expose port (dynamic based on PORT env var)
EXPOSE ${PORT}

# Health check - uses PORT env var
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import os, urllib.request; urllib.request.urlopen(f'http://localhost:{os.getenv(\"PORT\", \"8000\")}/health')"

# Run the application - uses PORT env var
CMD uvicorn backend.main:socket_app --host 0.0.0.0 --port ${PORT}
