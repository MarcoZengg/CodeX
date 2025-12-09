from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Float, Index
from sqlalchemy.sql import func
from database import Base

class TransactionDB(Base):
    __tablename__ = "transactions"
    
    __table_args__ = (
        Index('idx_transaction_item_status', 'item_id', 'status'),  # Composite index for common query
        Index('idx_transaction_conversation_item_status', 'conversation_id', 'item_id', 'status'),  # For appointment creation check
    )
    
    id = Column(String, primary_key=True, index=True)
    item_id = Column(String, ForeignKey("items.id"), nullable=False, index=True)
    buyer_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    seller_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    conversation_id = Column(String, ForeignKey("conversations.id"), nullable=False, index=True)
    buy_request_id = Column(String, ForeignKey("buy_requests.id"), nullable=True, index=True)  # Link to buy request
    
    status = Column(String, default="in_progress", index=True)  # "in_progress", "completed", "cancelled" - ADDED INDEX
    buyer_confirmed = Column(Boolean, default=False)
    seller_confirmed = Column(Boolean, default=False)
    buyer_cancel_confirmed = Column(Boolean, default=False)  # For cancellation confirmation
    seller_cancel_confirmed = Column(Boolean, default=False)  # For cancellation confirmation
    
    meetup_time = Column(DateTime, nullable=True)
    meetup_place = Column(String, nullable=True)
    meetup_lat = Column(Float, nullable=True)
    meetup_lng = Column(Float, nullable=True)
    
    created_date = Column(DateTime, server_default=func.now())
    completed_date = Column(DateTime, nullable=True)
    
    def __repr__(self):
        return f"<Transaction(id={self.id}, item_id={self.item_id}, status={self.status})>"

