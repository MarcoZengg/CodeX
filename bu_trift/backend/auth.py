from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth as firebase_auth
import logging

logger = logging.getLogger(__name__)
security = HTTPBearer()

async def verify_firebase_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Verify Firebase ID token and return decoded token data.
    This is the main authentication function.
    """
    try:
        id_token = credentials.credentials
        decoded = firebase_auth.verify_id_token(id_token)
        return decoded
    except ValueError as e:
        # Invalid token format
        logger.error(f"Invalid token format: {e}")
        raise HTTPException(status_code=401, detail="Invalid Firebase token format")
    except firebase_auth.ExpiredIdTokenError:
        logger.error("Firebase token expired")
        raise HTTPException(status_code=401, detail="Firebase token has expired")
    except firebase_auth.InvalidIdTokenError:
        logger.error("Invalid Firebase token")
        raise HTTPException(status_code=401, detail="Invalid Firebase token")
    except Exception as e:
        logger.error(f"Unexpected error verifying token: {e}")
        raise HTTPException(status_code=401, detail="Failed to verify Firebase token")

# Alias for compatibility with main.py imports
verify_token = verify_firebase_token
