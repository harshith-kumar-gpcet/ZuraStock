# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8001

# Install system dependencies required for ML libraries and curl_cffi
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    g++ \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container
COPY backend/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire project into the container
COPY . .

# Expose the port the app runs on
EXPOSE $PORT

# Run the application using Gunicorn with Uvicorn workers
CMD gunicorn -k uvicorn.workers.UvicornWorker \
             --bind 0.0.0.0:$PORT \
             --workers 1 \
             --timeout 120 \
             backend.main:app
