from sqlalchemy import Column, String, Float, Boolean, DateTime
from sqlalchemy.sql import func
import os

# Use appropriate JSON type based on database
# PostgreSQL uses JSONB, SQLite uses JSON
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./butrift.db")
if DATABASE_URL.startswith("postgresql://") or DATABASE_URL.startswith("postgres://"):
    from sqlalchemy.dialects.postgresql import JSON
else:
    from sqlalchemy.dialects.sqlite import JSON

from database import Base

from sqlalchemy import Index

class ItemDB(Base):
    __tablename__ = "items"
    
    __table_args__ = (
        Index('idx_item_seller_status', 'seller_id', 'status'),  # For filtering user's items by status
        Index('idx_item_status_created', 'status', 'created_date'),  # For homepage featured items
    )
    
    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String)
    price = Column(Float, nullable=False)
    category = Column(String, nullable=False)
    condition = Column(String, nullable=False)
    seller_id = Column(String, nullable=False, index=True)  # ADDED INDEX
    status = Column(String, default="available", index=True)  # ADDED INDEX
    location = Column(String)
    is_negotiable = Column(Boolean, default=False)
    created_date = Column(DateTime, server_default=func.now())

    # NEW FIELD — list of image URLs
    images = Column(JSON, nullable=True)
