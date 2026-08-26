import enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, DateTime, ForeignKey, Text, Enum
from sqlalchemy.sql import func
import uuid
import datetime

from app.db.base import Base

class Orientation(str, enum.Enum):
    ALL = "all"
    LANDSCAPE = "landscape"
    PORTRAIT = "portrait"
    SQUARE = "square"

class Script(Base):
    __tablename__ = "scripts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    full_text: Mapped[str] = mapped_column(Text, nullable=False)
    
    orientation_preference: Mapped[Orientation] = mapped_column(
        Enum(Orientation, name="orientation_enum", create_type=True), 
        default=Orientation.ALL, 
        nullable=False
    )
    
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    project: Mapped["Project"] = relationship("Project", back_populates="scripts")
    scenes: Mapped[list["Scene"]] = relationship("Scene", back_populates="script", cascade="all, delete-orphan")
