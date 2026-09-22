import uuid
import logging
from app.worker.tasks import process_search_job
from app.db.session import SessionLocal
from app.models.search_job import SearchJob, JobStatus
from app.config import settings
import json

logging.basicConfig(level=logging.INFO)

def queue_test_job():
    print(f"QDRANT_URL IS: {settings.QDRANT_URL}")
    db = SessionLocal()
    # Find any pending or completed job just to get a valid scene ID and re-run it
    job = db.query(SearchJob).first()
    if not job:
        print("No search job in DB.")
    job.status = JobStatus.PENDING
    db.commit()
    print(f"Found job {job.id}")
    
    print("Running process_search_job directly in this script...")
    try:
        process_search_job(str(job.id))
        print("Success.")
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    queue_test_job()
