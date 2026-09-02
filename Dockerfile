FROM python:3.10-slim

WORKDIR /app

# Copy backend requirements and install
COPY backend/requirements.txt .
# Install CPU-only torch first to prevent massive CUDA binaries in production
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir -r requirements.txt
# Copy backend source code
COPY backend/ /app/

# Expose port (Railway provides PORT env var, defaults to 8000)
ENV PORT=8000
EXPOSE ${PORT}

# Run FastAPI by default using uvicorn (can be overridden for celery)
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
