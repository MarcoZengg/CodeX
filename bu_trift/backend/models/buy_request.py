from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from database import Base

class BuyRequestDB(Base):
    __tablename__ = "buy_requests"
    
    id = Column(String, primary_key=True, index=True)
    item_id = Column(String, ForeignKey("items.id"), nullable=False, index=True)
    buyer_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    seller_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    conversation_id = Column(String, ForeignKey("conversations.id"), nullable=False, index=True)
    
    status = Column(String, default="pending")  # "pending", "accepted", "rejected", "cancelled"
    created_date = Column(DateTime, server_default=func.now())
    responded_date = Column(DateTime, nullable=True)
    
    def __repr__(self):
        return f"<BuyRequest(id={self.id}, item_id={self.item_id}, status={self.status})>"


