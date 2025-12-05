"""
FastAPI dependencies for common authentication and authorization patterns.

This module provides reusable dependencies that eliminate code duplication
across endpoints.
"""

from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from auth import verify_token
from models.user import UserDB

logger = None  # Will be imported if needed


def get_current_user(
    token_data: dict = Depends(verify_token),
    db: Session = Depends(get_db),
) -> UserDB:
    """
    Get the current authenticated user from the Firebase token.
    
    This dependency extracts the common pattern of:
    1. Getting firebase_uid from token
    2. Querying UserDB by firebase_uid
    3. Checking if user exists
    4. Returning UserDB instance
    
    Usage:
        @app.post("/api/items")
        def create_item(
            item: ItemCreate,
            user: UserDB = Depends(get_current_user),  # Reusable!
            db: Session = Depends(get_db),
        ):
            # user is already authenticated and validated
            ...
    
    Raises:
        HTTPException: 404 if user not found
    """
    firebase_uid = token_data["uid"]
    user = db.query(UserDB).filter(UserDB.firebase_uid == firebase_uid).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user

