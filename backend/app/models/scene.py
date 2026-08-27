from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import DateTime, ForeignKey, Text, Integer, String
from sqlalchemy.sql import func
import uuid
import datetime

from app.db.base import Base

class Scene(Base):
    __tablename__ = "scenes"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    script_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("scripts.id", ondelete="CASCADE"), index=True, nullable=False)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    sentence_text: Mapped[str] = mapped_column(Text, nullable=False)
    order: Mapped[int] = mapped_column(Integer, nullable=False)
    
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    script: Mapped["Script"] = relationship("Script", back_populates="scenes")
    search_jobs: Mapped[list["SearchJob"]] = relationship("SearchJob", back_populates="scene", cascade="all, delete-orphan")
