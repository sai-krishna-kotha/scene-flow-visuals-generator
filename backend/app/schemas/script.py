from pydantic import BaseModel, ConfigDict
import uuid
from datetime import datetime
from app.models.script import Orientation

class ScriptBase(BaseModel):
    title: str
    full_text: str
    orientation_preference: Orientation = Orientation.ALL

class ScriptCreate(ScriptBase):
    pass

class ScriptUpdate(BaseModel):
    title: str | None = None
    full_text: str | None = None
    orientation_preference: Orientation | None = None

class ScriptResponse(ScriptBase):
    id: uuid.UUID
    project_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
