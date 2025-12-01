"""
Cloudinary storage helper for image uploads.
Handles uploading images to Cloudinary and returning public URLs.
"""
import cloudinary
import cloudinary.uploader
import logging
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

logger = logging.getLogger(__name__)


def configure_cloudinary():
    """Configure Cloudinary with credentials from environment variables."""
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
    api_key = os.getenv("CLOUDINARY_API_KEY")
    api_secret = os.getenv("CLOUDINARY_API_SECRET")
    
    # Validate that all required variables are set
    if not cloud_name:
        logger.error("CLOUDINARY_CLOUD_NAME environment variable is not set")
        raise ValueError("CLOUDINARY_CLOUD_NAME environment variable is required")
    if not api_key:
        logger.error("CLOUDINARY_API_KEY environment variable is not set")
        raise ValueError("CLOUDINARY_API_KEY environment variable is required")
    if not api_secret:
        logger.error("CLOUDINARY_API_SECRET environment variable is not set")
        raise ValueError("CLOUDINARY_API_SECRET environment variable is required")
    
    cloudinary.config(
        cloud_name=cloud_name,
        api_key=api_key,
        api_secret=api_secret,
        secure=True  # Always use HTTPS
    )
    logger.info("Cloudinary configured successfully")


# Configure Cloudinary when module is imported
try:
    configure_cloudinary()
except ValueError as e:
    logger.warning(f"Cloudinary not configured: {e}. Image uploads will fail until configured.")


def upload_file_to_cloudinary(
    file_content: bytes,
    filename: str,
    folder: str = "butrift/uploads"
) -> str:
    """
    Upload an image file to Cloudinary and return the public URL.
    
    Args:
        file_content: The file content as bytes
        filename: The filename to use in storage
        folder: Folder path in Cloudinary (default: 'butrift/uploads')
    
    Returns:
        Public URL to access the file
    """
    try:
        # Upload to Cloudinary
        # resource_type='image' automatically detects image type
        result = cloudinary.uploader.upload(
            file_content,
            folder=folder,
            public_id=filename,
            resource_type='image',
            overwrite=False,  # Don't overwrite existing files
            invalidate=True  # Clear CDN cache
        )
        
        # Get the secure URL (HTTPS)
        public_url = result.get('secure_url') or result.get('url')
        
        logger.info(f"Successfully uploaded image to Cloudinary: {folder}/{filename}")
        logger.debug(f"Cloudinary response: {result.get('public_id')}")
        
        return public_url
        
    except Exception as e:
        logger.error(f"Failed to upload file to Cloudinary: {e}")
        raise Exception(f"Failed to upload image: {str(e)}")


def delete_file_from_cloudinary(public_id: str) -> bool:
    """
    Delete a file from Cloudinary.
    
    Args:
        public_id: The public_id of the file in Cloudinary
                  (e.g., 'butrift/uploads/123_filename.jpg')
    
    Returns:
        True if deleted, False otherwise
    """
    try:
        result = cloudinary.uploader.destroy(
            public_id,
            resource_type='image',
            invalidate=True  # Clear CDN cache
        )
        
        if result.get('result') == 'ok':
            logger.info(f"Successfully deleted file from Cloudinary: {public_id}")
            return True
        else:
            logger.warning(f"Failed to delete file from Cloudinary: {public_id}")
            return False
            
    except Exception as e:
        logger.error(f"Failed to delete file from Cloudinary: {e}")
        return False

