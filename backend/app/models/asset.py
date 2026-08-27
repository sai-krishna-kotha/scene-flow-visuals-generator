from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, DateTime, ForeignKey, Text, Float, Integer, Boolean
from sqlalchemy.sql import func
import uuid
import datetime

from app.db.base import Base

class Asset(Base):
    __tablename__ = "assets"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    search_job_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("search_jobs.id", ondelete="CASCADE"), index=True, nullable=False)
    
    provider_name: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    provider_asset_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True, default="")
    asset_url: Mapped[str] = mapped_column(String(1024), nullable=False)
    thumbnail_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    source_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    alt_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    license_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    
    width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    height: Mapped[int | None] = mapped_column(Integer, nullable=True)
    
    relevance_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    
    # Persisted ranking breakdown for deterministic historical results
    semantic_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    resolution_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    orientation_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    final_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    
    is_selected: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    # Assets might not be updated much after creation, but standard to include
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    search_job: Mapped["SearchJob"] = relationship("SearchJob", back_populates="assets")
