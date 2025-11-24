from sqlalchemy import Column, String, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class ConversationDB(Base):
    __tablename__ = "conversations"
    
    id = Column(String, primary_key=True, index=True)
    participant1_id = Column(String, nullable=False, index=True)  # User 1
    participant2_id = Column(String, nullable=False, index=True)  # User 2
    item_id = Column(String, nullable=True)  # Optional: link to item
    last_message_at = Column(DateTime, nullable=True)  # For sorting by recency
    created_date = Column(DateTime, server_default=func.now())
    updated_date = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationship: one conversation has many messages
    messages = relationship("MessageDB", back_populates="conversation", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Conversation(id={self.id}, p1={self.participant1_id}, p2={self.participant2_id})>"

