from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Float
from sqlalchemy.sql import func
from database import Base

class ReviewDB(Base):
    __tablename__ = "reviews"
    
    id = Column(String, primary_key=True, index=True)
    transaction_id = Column(String, ForeignKey("transactions.id"), nullable=False, index=True)
    item_id = Column(String, ForeignKey("items.id"), nullable=False, index=True)
    reviewer_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)  # User giving the review
    reviewee_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)  # User being reviewed
    rating = Column(Integer, nullable=False)  # 1-5 stars
    comment = Column(String, nullable=True)  # Optional text review
    response = Column(String, nullable=True)  # Optional response from reviewee
    created_date = Column(DateTime, server_default=func.now())
    updated_date = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    def __repr__(self):
        return f"<Review(id={self.id}, reviewer={self.reviewer_id}, reviewee={self.reviewee_id}, rating={self.rating})>"

