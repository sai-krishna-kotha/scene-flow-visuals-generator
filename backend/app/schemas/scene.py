from pydantic import BaseModel, ConfigDict
import uuid
from datetime import datetime

class SceneBase(BaseModel):
    sentence_text: str
    order: int

class SceneCreate(SceneBase):
    pass

class SceneUpdate(BaseModel):
    sentence_text: str | None = None
    order: int | None = None

class SceneResponse(SceneBase):
    id: uuid.UUID
    script_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
