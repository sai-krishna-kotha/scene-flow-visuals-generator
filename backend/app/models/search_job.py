import enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import DateTime, ForeignKey, Enum
from sqlalchemy.sql import func
import uuid
import datetime

from app.db.base import Base

class JobStatus(str, enum.Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class SearchJob(Base):
    __tablename__ = "search_jobs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    scene_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("scenes.id", ondelete="CASCADE"), index=True, nullable=False)
    
    status: Mapped[JobStatus] = mapped_column(
        Enum(JobStatus, name="jobstatus_enum", create_type=True), 
        default=JobStatus.PENDING, 
        nullable=False,
        index=True
    )
    
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    scene: Mapped["Scene"] = relationship("Scene", back_populates="search_jobs")
    assets: Mapped[list["Asset"]] = relationship("Asset", back_populates="search_job", cascade="all, delete-orphan")
