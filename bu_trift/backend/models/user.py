from sqlalchemy import Column, String, Float, Boolean, DateTime, Integer
from sqlalchemy.sql import func
from database import Base

class UserDB(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    display_name = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)  # Hashed password, never store plain text
    is_verified = Column(Boolean, default=False)
    profile_image_url = Column(String)
    bio = Column(String)
    rating = Column(Float, default=0.0)
    total_sales = Column(Integer, default=0)
    created_date = Column(DateTime, server_default=func.now())
    updated_date = Column(DateTime, server_default=func.now(), onupdate=func.now())

