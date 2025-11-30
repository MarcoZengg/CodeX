import firebase_admin
from firebase_admin import credentials, auth
import os
import json
import logging

logger = logging.getLogger(__name__)

# Only initialize if not already initialized (handles hot reload)
if not firebase_admin._apps:
    # Check for Firebase service account in environment variable (Render/production)
    firebase_service_account_json = os.getenv("FIREBASE_SERVICE_ACCOUNT")
    
    if firebase_service_account_json:
        # Parse JSON string from environment variable (Render deployment)
        try:
            cred_dict = json.loads(firebase_service_account_json)
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred)
            logger.info("Firebase Admin SDK initialized from environment variable")
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse FIREBASE_SERVICE_ACCOUNT JSON: {e}")
            raise
        except Exception as e:
            logger.error(f"Failed to initialize Firebase from env var: {e}")
            raise
    else:
        # Fallback to file (local development)
        cred_path = "firebase_service.json"
        if not os.path.exists(cred_path):
            error_msg = (
                f"Firebase service account not found. "
                "Either set FIREBASE_SERVICE_ACCOUNT environment variable "
                f"or place firebase_service.json in {cred_path}"
            )
            logger.error(error_msg)
            raise FileNotFoundError(error_msg)
        
        try:
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            logger.info("Firebase Admin SDK initialized from file")
        except Exception as e:
            logger.error(f"Failed to initialize Firebase Admin SDK: {e}")
            raise
else:
    logger.debug("Firebase Admin SDK already initialized, skipping re-initialization")
