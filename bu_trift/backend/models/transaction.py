from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Float
from sqlalchemy.sql import func
from database import Base

class TransactionDB(Base):
    __tablename__ = "transactions"
    
    id = Column(String, primary_key=True, index=True)
    item_id = Column(String, ForeignKey("items.id"), nullable=False, index=True)
    buyer_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    seller_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    conversation_id = Column(String, ForeignKey("conversations.id"), nullable=False, index=True)
    
    status = Column(String, default="in_progress")  # "in_progress" or "completed"
    buyer_confirmed = Column(Boolean, default=False)
    seller_confirmed = Column(Boolean, default=False)
    
    meetup_time = Column(DateTime, nullable=True)
    meetup_place = Column(String, nullable=True)  # Text description of meetup location
    meetup_lat = Column(Float, nullable=True)  # Latitude for location
    meetup_lng = Column(Float, nullable=True)  # Longitude for location
    
    created_date = Column(DateTime, server_default=func.now())
    completed_date = Column(DateTime, nullable=True)
    
    def __repr__(self):
        return f"<Transaction(id={self.id}, item_id={self.item_id}, buyer={self.buyer_id}, seller={self.seller_id})>"
