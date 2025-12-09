from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class MessageDB(Base):
    __tablename__ = "messages"
    
    __table_args__ = (
        Index('idx_message_conversation_created', 'conversation_id', 'created_date'),  # For last message queries
        Index('idx_message_conversation_sender_read', 'conversation_id', 'sender_id', 'is_read'),  # For unread count queries
    )
    
    id = Column(String, primary_key=True, index=True)
    conversation_id = Column(String, ForeignKey("conversations.id"), nullable=False, index=True)
    sender_id = Column(String, nullable=False, index=True)  # User who sent the message
    content = Column(String, nullable=False)  # Message text
    is_read = Column(Boolean, default=False, index=True)  # Read status - ADDED INDEX
    
    # NEW: Support for buy request messages
    message_type = Column(String, default="text")  # "text" or "buy_request"
    buy_request_id = Column(String, ForeignKey("buy_requests.id"), nullable=True, index=True)
    
    created_date = Column(DateTime, server_default=func.now())
    
    # Relationship: message belongs to one conversation
    conversation = relationship("ConversationDB", back_populates="messages")
    
    def __repr__(self):
        return f"<Message(id={self.id}, conversation_id={self.conversation_id}, sender={self.sender_id})>"

