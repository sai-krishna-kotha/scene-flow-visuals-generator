# Current Architecture

## What the System Does
The Semantic Visual Asset Generator is a web application that takes text-based scripts, breaks them into sentences (scenes), extracts keywords using NLTK, and then fetches relevant images from Pexels, Pixabay, and Openverse. It scores these images based on semantic similarity using a local `Sentence-Transformers` model (all-MiniLM-L6-v2) and resolution. It provides a user interface to view these storyboards and download selected images as a ZIP file.

## Current Components and Data Flow
- **Frontend**: Vanilla JavaScript, HTML5, CSS3. Handles user input, displays the storyboard grid, and bundles images locally via JSZip.
- **Backend**: Django & Django REST Framework. Serves templates and handles the API for creating scripts and fetching scenes. Uses SQLite for local database.
- **Task Queue**: Celery and Redis. Handles asynchronous fetching of images from external APIs and running the local ML model to score them, preventing UI blocking.
- **AI Layer**: `SentenceTransformer` loads locally in the Celery worker process to compute vector embeddings for scene text and image alt text on the fly.

**Data Flow**:
1. User submits a script via the web interface.
2. Django backend tokenizes the script into sentences and creates `Scene` records.
3. Django triggers a Celery task for each scene.
4. The Celery worker extracts keywords, searches external APIs, downloads metadata, and scores candidates.
5. Frontend polls or reloads to view the processed image candidates.

## Important Technical Debt
1. **Model Loading in Workers**: The ML model (`SentenceTransformer`) is instantiated inside the Celery worker which can consume excessive RAM and slow down initialization.
2. **On-the-fly Vectors**: Vectors are computed dynamically during the task and not stored in a vector database, meaning repeated queries re-run the ML inference instead of utilizing a cache.
3. **Vanilla JS Frontend**: The frontend is built with Vanilla JavaScript, which lacks a robust state management system and component architecture, making the UI harder to scale.
4. **Monolithic Structure**: The ML code, background tasks, and backend API are tightly coupled inside the Django project.
