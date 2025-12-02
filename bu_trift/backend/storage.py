"""
Cloudinary storage helper for image uploads.
Handles uploading images to Cloudinary and returning public URLs.
"""
import cloudinary
import cloudinary.uploader
import logging
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables from .env file
load_dotenv()

logger = logging.getLogger(__name__)

CLOUDINARY_CONFIGURED = False

# Local uploads base dir (matches StaticFiles mount in main.py)
UPLOADS_ROOT = Path(__file__).resolve().parent / "uploads"
UPLOADS_ROOT.mkdir(parents=True, exist_ok=True)


def configure_cloudinary():
    """Configure Cloudinary with credentials from environment variables."""
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
    api_key = os.getenv("CLOUDINARY_API_KEY")
    api_secret = os.getenv("CLOUDINARY_API_SECRET")
    
    # Validate that all required variables are set
    if not cloud_name or not api_key or not api_secret:
        missing = [
            name
            for name, value in [
                ("CLOUDINARY_CLOUD_NAME", cloud_name),
                ("CLOUDINARY_API_KEY", api_key),
                ("CLOUDINARY_API_SECRET", api_secret),
            ]
            if not value
        ]
        logger.warning(
            f"Cloudinary not configured; missing: {', '.join(missing)}. "
            "Falling back to local uploads directory."
        )
        return False
    
    cloudinary.config(
        cloud_name=cloud_name,
        api_key=api_key,
        api_secret=api_secret,
        secure=True  # Always use HTTPS
    )
    logger.info("Cloudinary configured successfully")
    return True


# Configure Cloudinary when module is imported
CLOUDINARY_CONFIGURED = configure_cloudinary()


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


def upload_file_locally(
    file_content: bytes,
    filename: str,
    folder: str = "butrift/uploads"
) -> str:
    """
    Save an image to the local uploads directory and return a URL.
    This is used as a fallback when Cloudinary is not configured.
    """
    safe_folder = folder.strip("/")
    target_dir = UPLOADS_ROOT / safe_folder
    target_dir.mkdir(parents=True, exist_ok=True)

    file_path = target_dir / filename
    with open(file_path, "wb") as f:
        f.write(file_content)

    # URL relative to StaticFiles mount at /uploads
    return f"/uploads/{safe_folder}/{filename}"


def upload_file(
    file_content: bytes,
    filename: str,
    folder: str = "butrift/uploads"
) -> str:
    """
    Upload an image, preferring Cloudinary when configured, otherwise falling back to local storage.
    """
    if CLOUDINARY_CONFIGURED:
        return upload_file_to_cloudinary(file_content, filename, folder)
    logger.info("Using local upload storage because Cloudinary is not configured.")
    return upload_file_locally(file_content, filename, folder)


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
