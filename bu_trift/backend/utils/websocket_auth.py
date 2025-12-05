"""
WebSocket authentication utilities.

Since WebSocket endpoints can't use FastAPI dependencies directly,
this module provides helper functions for WebSocket authentication.
"""

from sqlalchemy.orm import Session
from models.user import UserDB
from typing import Optional, Tuple
from firebase_admin import auth as firebase_auth
import logging

logger = logging.getLogger(__name__)


async def verify_websocket_token(token: str) -> Optional[dict]:
    """
    Verify Firebase token from WebSocket connection.
    
    Returns:
        Decoded token data if valid, None otherwise
    """
    try:
        decoded = firebase_auth.verify_id_token(token)
        return decoded
    except Exception as e:
        logger.error(f"WebSocket token verification failed: {e}")
        return None


def get_user_from_firebase_uid(
    firebase_uid: str,
    db: Session
) -> Optional[UserDB]:
    """
    Get user from database by Firebase UID.
    
    Helper function to reduce duplication in WebSocket authentication.
    
    Args:
        firebase_uid: Firebase user ID
        db: Database session
    
    Returns:
        UserDB instance if found, None otherwise
    """
    return db.query(UserDB).filter(UserDB.firebase_uid == firebase_uid).first()

