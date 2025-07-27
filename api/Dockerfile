FROM python:3.11-slim

# set workdir
WORKDIR /app

# Install system dependencies (if any)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first for layer caching
COPY api/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
# Copy entire repo (includes api source and alembic files)
COPY . .

# Expose port
EXPOSE 8000

# Start server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"] 