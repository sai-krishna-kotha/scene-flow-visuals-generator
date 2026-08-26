from pydantic import BaseModel, ConfigDict
import uuid
from datetime import datetime
from app.models.search_job import JobStatus
from typing import Optional

class SearchJobResponse(BaseModel):
    job_id: uuid.UUID
    scene_id: uuid.UUID
    status: JobStatus
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    error_message: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
