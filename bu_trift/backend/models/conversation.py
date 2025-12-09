from sqlalchemy import Column, String, DateTime, UniqueConstraint, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class ConversationDB(Base):
    __tablename__ = "conversations"
    
    __table_args__ = (
        UniqueConstraint(
            'participant1_id', 
            'participant2_id', 
            'item_id',
            name='unique_conversation_per_item'
        ),
        Index('idx_conversation_last_message', 'last_message_at'),  # For sorting conversations by recency
        Index('idx_conversation_item_participants', 'item_id', 'participant1_id', 'participant2_id'),  # For finding conversations by item
    )
    
    id = Column(String, primary_key=True, index=True)
    participant1_id = Column(String, nullable=False, index=True)  # User 1
    participant2_id = Column(String, nullable=False, index=True)  # User 2
    item_id = Column(String, nullable=False, index=True)  # Required: link to item (one conversation per item)
    last_message_at = Column(DateTime, nullable=True, index=True)  # For sorting by recency - ADDED INDEX
    created_date = Column(DateTime, server_default=func.now())
    updated_date = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationship: one conversation has many messages
    messages = relationship("MessageDB", back_populates="conversation", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Conversation(id={self.id}, p1={self.participant1_id}, p2={self.participant2_id}, item={self.item_id})>"

