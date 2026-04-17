# # Start from a minimal Python image
# FROM python:3.10-slim

# # Set the working directory
# WORKDIR /app

# # Copy the requirements file and install libraries
# COPY requirements.txt .
# RUN pip install -r requirements.txt

# # Copy your task file into the image
# COPY image_fetcher/tasks.py .

# # The command to start the Celery worker
# CMD ["celery", "-A", "celery_tasks", "worker", "--loglevel=info"]





FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy entire project (not just one file)
COPY . .

CMD ["celery", "-A", "ai_tools", "worker", "--loglevel=info"]

