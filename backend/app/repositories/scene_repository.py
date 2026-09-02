from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.scene import Scene
from app.schemas.scene import SceneCreate, SceneUpdate
import uuid

class SceneRepository:
    def __init__(self, session: Session):
        self.session = session

    def create(self, scene_in: SceneCreate, script_id: uuid.UUID) -> Scene:
        scene = Scene(
            script_id=script_id,
            sentence_text=scene_in.sentence_text,
            order=scene_in.order,
            title=scene_in.title
        )
        self.session.add(scene)
        self.session.commit()
        self.session.refresh(scene)
        return scene

    def bulk_create_from_segments(self, script_id: uuid.UUID, segments: list) -> list[Scene]:
        scenes = []
        for segment in segments:
            scene = Scene(
                script_id=script_id,
                sentence_text=segment.scene_text,
                order=segment.order,
                title=segment.title
            )
            scenes.append(scene)
        
        self.session.add_all(scenes)
        self.session.commit()
        for scene in scenes:
            self.session.refresh(scene)
        return scenes

    def get_by_id(self, scene_id: uuid.UUID) -> Scene | None:
        return self.session.get(Scene, scene_id)

    def list_by_script(self, script_id: uuid.UUID, page: int = 1, page_size: int = 20) -> tuple[list[Scene], int]:
        from sqlalchemy import func
        offset = (page - 1) * page_size
        stmt = select(Scene).where(Scene.script_id == script_id)
        total = self.session.execute(select(func.count()).select_from(stmt.subquery())).scalar() or 0
        items_stmt = stmt.order_by(Scene.order.asc(), Scene.id.asc()).offset(offset).limit(page_size)
        items = list(self.session.execute(items_stmt).scalars().all())
        return items, total

    def update(self, scene: Scene, scene_in: SceneUpdate) -> Scene:
        update_data = scene_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(scene, field, value)
        self.session.add(scene)
        self.session.commit()
        self.session.refresh(scene)
        return scene

    def delete(self, scene: Scene) -> None:
        self.session.delete(scene)
        self.session.commit()
