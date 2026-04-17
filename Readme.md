# Semantic Visual Asset Generator

The Semantic Visual Asset Generator is an intelligent web application designed to transform text-based scripts into structured visual storyboards. Unlike traditional keyword-based search engines, this system utilizes Natural Language Processing (NLP) and Sentence-BERT (SBERT) to understand the contextual meaning of sentences and retrieve the most relevant visual assets from multiple professional APIs.


## Project Overview

The core challenge this project solves is the "semantic gap" in asset retrieval. By converting text into high-dimensional vector embeddings, the application can match a scene description like "a joyful celebration" with images tagged as "party" or "happy people," even if the exact keywords do not match.

## Key Features

* **Semantic Search Engine**: Uses the all-MiniLM-L6-v2 Sentence-Transformer model to rank image relevance.

* **Asynchronous Task Queue**: Implements Celery and Redis to handle heavy API fetching and AI scoring without blocking the user interface.

* **Multi-Source Integration**: Fetches high-quality assets from Pexels, Pixabay, and Openverse APIs simultaneously.

* **Responsive Storyboard UI**: A custom-built frontend with a 16:9 aspect ratio grid ensuring visual consistency across varying asset resolutions.

* **Client-Side Bundling**: Integrated JSZip for local asset packaging, allowing users to download selected images as a single ZIP file without additional server-side overhead.

* **Paginated History**: Efficient retrieval of past projects using Django REST Framework pagination to ensure scalability.

## Technical Architecture

The application is built using a decoupled architecture:

1. Frontend: Vanilla JavaScript, CSS3 (Grid/Flexbox), and HTML5. It communicates with the backend via a RESTful API.

1. Backend: Django (Python) handles the business logic, database management, and API orchestration.

1. AI Layer: Sentence-Transformers (SBERT) for generating 384-dimensional vector embeddings and calculating Cosine Similarity.

1. Worker Layer: Celery handles the extraction of keywords (via NLTK) and the concurrent fetching/scoring of images.

1. Infrastructure: Docker is used to containerize the Redis message broker, ensuring a consistent environment.

## Tech Stack

* Backend: Django, Django REST Framework

* Analysis: NLTK (Natural Language Toolkit), Sentence-Transformers (SBERT)

* Task Management: Celery, Redis

* Database: SQLite (Development) / PostgreSQL (Production ready)

* Containerization: Docker

* Frontend: JavaScript (ES6+), CSS Grid, JSZip

## Prerequisites

* Python 3.8+

* Docker (for Redis)

* Git

## Installation and Setup
1. Clone the Repository

```
git clone <your-repository-link>
cd semantic-visual-asset-generator
```
2. Set Up Virtual Environment
```
python -m venv venv
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate
```
3. Install Dependencies
```
pip install -r requirements.txt
```
4. Configure Environment Variables

Create a .env file in the root directory (or update settings.py) with the following:

* PEXELS_API_KEY=your_key

* PIXABAY_API_KEY=your_key

* OPENVERSE_CLIENT_ID=your_id

* OPENVERSE_CLIENT_SECRET=your_secret

5. Initialize Database and NLTK
```
python manage.py migrate
python manage.py shell
# Inside the shell
import nltk
nltk.download('punkt')
nltk.download('stopwords')
nltk.download('averaged_perceptron_tagger')
exit()
```
## Running the Application

To run the full system, you must have three processes running:

### Terminal 1: Message Broker (Redis)

Ensure Docker is running and start the Redis container:

```
docker run -d -p 6379:6379 redis
```
### Terminal 2: Celery Worker

The worker handles the AI scoring and API fetching:

```
celery -A ai_tools worker --loglevel=info --pool=solo
```
### Terminal 3: Django Development Server
```
python manage.py runserver
```
## API Documentation
### Get All Scripts (Paginated)

* Endpoint: /api/scripts/

* Method: GET

* Query Params: search (title), page

### Create New Script

* Endpoint: /api/scripts/

* Method: POST

* Payload: { "title": "...", "full_text": "...", "orientation_preference": "..." }

### Get Project Details
* Endpoint: /scripts/<id>/

* Method: GET

* Returns: Script details with nested scenes and AI-ranked image candidates.

### Engineering Decisions
* On-the-Fly Embeddings: To minimize database bloat, vector embeddings are calculated in RAM during the task execution. Only the final relevance scores are persisted.

* Client-Side ZIP: JSZip was chosen to handle asset bundling on the client side to reduce server egress costs and CPU usage.

* Deterministic Ordering: Querysets are explicitly ordered by -created_at to ensure stable pagination across the Dashboard and Detail views.

## License

This project was developed for technical evaluation and educational purposes.