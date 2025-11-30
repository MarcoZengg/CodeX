import firebase_admin
from firebase_admin import credentials, auth
import os
import logging

logger = logging.getLogger(__name__)

# Only initialize if not already initialized (handles hot reload)
if not firebase_admin._apps:
    cred_path = "firebase_service.json"
    
    # Check if service account file exists
    if not os.path.exists(cred_path):
        error_msg = (
            f"Firebase service account file not found: {cred_path}\n"
            "Please ensure firebase_service.json is in the backend directory.\n"
            "This file contains Firebase Admin SDK credentials and should be obtained from Firebase Console."
        )
        logger.error(error_msg)
        raise FileNotFoundError(error_msg)
    
    try:
        cred = credentials.Certificate(cred_path)
firebase_admin.initialize_app(cred)
        logger.info("Firebase Admin SDK initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Firebase Admin SDK: {e}")
        raise
else:
    logger.debug("Firebase Admin SDK already initialized, skipping re-initialization")
