from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.script import Script
from app.schemas.script import ScriptCreate, ScriptUpdate
import uuid

class ScriptRepository:
    def __init__(self, session: Session):
        self.session = session

    def create(self, script_in: ScriptCreate, project_id: uuid.UUID) -> Script:
        script = Script(
            project_id=project_id,
            title=script_in.title,
            full_text=script_in.full_text,
            orientation_preference=script_in.orientation_preference
        )
        self.session.add(script)
        self.session.commit()
        self.session.refresh(script)
        return script

    def get_by_id(self, script_id: uuid.UUID) -> Script | None:
        return self.session.get(Script, script_id)

    def list_by_project(self, project_id: uuid.UUID, skip: int = 0, limit: int = 100) -> list[Script]:
        stmt = select(Script).where(Script.project_id == project_id).offset(skip).limit(limit)
        return list(self.session.execute(stmt).scalars().all())

    def update(self, script: Script, script_in: ScriptUpdate) -> Script:
        update_data = script_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(script, field, value)
        self.session.add(script)
        self.session.commit()
        self.session.refresh(script)
        return script

    def delete(self, script: Script) -> None:
        self.session.delete(script)
        self.session.commit()
