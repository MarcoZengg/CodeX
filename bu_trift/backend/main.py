from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, WebSocket, WebSocketDisconnect, Query

from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session
from database import get_db, engine, Base
from models.item import ItemDB
from models.user import UserDB
from models.conversation import ConversationDB
from models.message import MessageDB
from models.buy_request import BuyRequestDB
from models.transaction import TransactionDB
from models.review import ReviewDB
import uuid
from datetime import datetime
import os
import logging
from sqlalchemy.exc import SQLAlchemyError

# NEW: import Firebase auth verification
from auth import verify_token

# Ensure firebase_admin initializes
import firebase_config  # noqa: F401

# Import Cloudinary storage helper
from storage import upload_file_to_cloudinary

logger = logging.getLogger(__name__)

app = FastAPI()

# Create uploads directory
upload_dir = "uploads"
os.makedirs(upload_dir, exist_ok=True)

# Serve uploaded images
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Create tables
Base.metadata.create_all(bind=engine)

# CORS configuration - support both local and production
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    frontend_url,  # Production frontend URL from environment variable
    # Common Render frontend URLs (will be overridden by FRONTEND_URL if set)
    "https://butrift-frontend.onrender.com",
]
# Remove duplicates while preserving order
origins = list(dict.fromkeys(origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================
# Pydantic Models
# ============================

class ItemCreate(BaseModel):
    title: str
    description: str
    price: float
    category: str
    condition: str
    location: Optional[str] = None
    is_negotiable: bool = False
    images: Optional[List[str]] = []


class ItemResponse(BaseModel):
    id: str
    title: str
    description: str
    price: float
    category: str
    condition: str
    seller_id: str
    status: str
    location: Optional[str]
    is_negotiable: bool
    created_date: str
    images: Optional[List[str]]


class ItemStatusUpdate(BaseModel):
    status: str


class ItemUpdate(BaseModel):
    """Partial update payload for item listings."""
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    condition: Optional[str] = None
    location: Optional[str] = None
    is_negotiable: Optional[bool] = None
    images: Optional[List[str]] = None


class UserRegister(BaseModel):
    email: str
    display_name: str
    bio: Optional[str] = None


class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None
    profile_image_url: Optional[str] = None

class CompleteProfileRequest(BaseModel):
    password: str
    display_name: str
    bio: Optional[str] = None


class UserResponse(BaseModel):
    id: str
    email: str
    display_name: str
    is_verified: bool
    profile_image_url: Optional[str]
    bio: Optional[str]
    rating: float
    total_sales: int
    created_date: str


# Conversation Pydantic models
class ConversationCreate(BaseModel):
    participant1_id: str  # Current user
    participant2_id: str  # Other user
    item_id: Optional[str] = None  # Optional: item being discussed

class ConversationResponse(BaseModel):
    id: str
    participant1_id: str
    participant2_id: str
    item_id: Optional[str]
    last_message_at: Optional[str]
    created_date: str
    updated_date: str
    last_message_snippet: Optional[str] = None
    unread_count: int = 0

# Message Pydantic models
class MessageCreate(BaseModel):
    conversation_id: str
    sender_id: str
    content: str

class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    sender_id: str
    content: str
    is_read: bool
    created_date: str
    message_type: Optional[str] = "text"
    buy_request_id: Optional[str] = None

class MessageUpdate(BaseModel):
    is_read: Optional[bool] = None


# BuyRequest Pydantic models
class BuyRequestCreate(BaseModel):
    item_id: str
    conversation_id: Optional[str] = None  # Will create if not provided

class BuyRequestResponse(BaseModel):
    id: str
    item_id: str
    buyer_id: str
    seller_id: str
    conversation_id: str
    status: str
    created_date: str
    responded_date: Optional[str] = None

class BuyRequestUpdate(BaseModel):
    status: str  # "accepted", "rejected", "cancelled"

# Transaction Pydantic models
class TransactionCreate(BaseModel):
    item_id: str
    conversation_id: str
    buyer_id: str
    seller_id: str
    buy_request_id: Optional[str] = None

class TransactionResponse(BaseModel):
    id: str
    item_id: str
    buyer_id: str
    seller_id: str
    conversation_id: str
    buy_request_id: Optional[str]
    status: str
    buyer_confirmed: bool
    seller_confirmed: bool
    buyer_cancel_confirmed: bool
    seller_cancel_confirmed: bool
    meetup_time: Optional[str] = None
    meetup_place: Optional[str] = None
    meetup_lat: Optional[float] = None
    meetup_lng: Optional[float] = None
    created_date: str
    completed_date: Optional[str] = None

class TransactionUpdate(BaseModel):
    buyer_confirmed: Optional[bool] = None
    seller_confirmed: Optional[bool] = None
    buyer_cancel_confirmed: Optional[bool] = None
    seller_cancel_confirmed: Optional[bool] = None
    meetup_time: Optional[str] = None
    meetup_place: Optional[str] = None
    meetup_lat: Optional[float] = None
    meetup_lng: Optional[float] = None
    status: Optional[str] = None

# Review Pydantic models
class ReviewCreate(BaseModel):
    transaction_id: str
    rating: int  # 1-5
    comment: Optional[str] = None

class ReviewResponse(BaseModel):
    id: str
    transaction_id: str
    item_id: str
    reviewer_id: str
    reviewee_id: str
    rating: int
    comment: Optional[str] = None
    response: Optional[str] = None
    created_date: str
    updated_date: str

class ReviewUpdate(BaseModel):
    comment: Optional[str] = None
    response: Optional[str] = None  # Only reviewee can add response


# ============================
# Helper Functions
# ============================

def item_to_response(item: ItemDB) -> dict:
    return {
        "id": item.id,
        "title": item.title,
        "description": item.description,
        "price": item.price,
        "category": item.category,
        "condition": item.condition,
        "seller_id": item.seller_id,
        "status": item.status,
        "location": item.location,
        "is_negotiable": item.is_negotiable,
        "created_date": item.created_date.isoformat(),
        "images": item.images or [],
    }


def user_to_response(user: UserDB) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "display_name": user.display_name,
        "is_verified": user.is_verified,
        "profile_image_url": user.profile_image_url,
        "bio": user.bio,
        "rating": user.rating,
        "total_sales": user.total_sales,
        "created_date": user.created_date.isoformat(),
    }


def conversation_to_response(
    conversation: ConversationDB,
    current_user_id: str | None = None,
    db: Session | None = None,
) -> dict:
    """Convert ConversationDB to response dictionary with optional unread and last message snippet."""
    last_message_snippet = None
    unread_count = 0

    if db and current_user_id:
        last_message = (
            db.query(MessageDB)
            .filter(MessageDB.conversation_id == conversation.id)
            .order_by(MessageDB.created_date.desc())
            .first()
        )
        if last_message:
            last_message_snippet = (last_message.content or "")[:120]

        unread_count = (
            db.query(MessageDB)
            .filter(
                MessageDB.conversation_id == conversation.id,
                MessageDB.sender_id != current_user_id,
                MessageDB.is_read == False,  # noqa: E712
            )
            .count()
        )

    return {
        "id": conversation.id,
        "participant1_id": conversation.participant1_id,
        "participant2_id": conversation.participant2_id,
        "item_id": conversation.item_id,
        "last_message_at": conversation.last_message_at.isoformat() if conversation.last_message_at else None,
        "created_date": conversation.created_date.isoformat() if conversation.created_date else datetime.now().isoformat(),
        "updated_date": conversation.updated_date.isoformat() if conversation.updated_date else datetime.now().isoformat(),
        "last_message_snippet": last_message_snippet,
        "unread_count": unread_count,
    }


def pydantic_to_dict(model) -> dict:
    """Convert Pydantic model to dictionary (supports both v1 and v2)"""
    if hasattr(model, 'dict'):
        return model.dict()
    elif hasattr(model, 'model_dump'):
        return model.model_dump()
    else:
        return dict(model)

def message_to_response(message: MessageDB) -> dict:
    """Convert MessageDB to response dictionary"""
    result = {
        "id": message.id,
        "conversation_id": message.conversation_id,
        "sender_id": message.sender_id,
        "content": message.content,
        "is_read": message.is_read,
        "created_date": message.created_date.isoformat() if message.created_date else datetime.now().isoformat(),
    }
    # Add optional fields if they exist
    if hasattr(message, "message_type"):
        result["message_type"] = message.message_type or "text"
    if hasattr(message, "buy_request_id"):
        result["buy_request_id"] = message.buy_request_id
    return result

def buy_request_to_response(buy_request: BuyRequestDB) -> BuyRequestResponse:
    return BuyRequestResponse(
        id=buy_request.id,
        item_id=buy_request.item_id,
        buyer_id=buy_request.buyer_id,
        seller_id=buy_request.seller_id,
        conversation_id=buy_request.conversation_id,
        status=buy_request.status,
        created_date=buy_request.created_date.isoformat() if buy_request.created_date else datetime.now().isoformat(),
        responded_date=buy_request.responded_date.isoformat() if buy_request.responded_date else None,
    )

def transaction_to_response(transaction: TransactionDB) -> TransactionResponse:
    return TransactionResponse(
        id=transaction.id,
        item_id=transaction.item_id,
        buyer_id=transaction.buyer_id,
        seller_id=transaction.seller_id,
        conversation_id=transaction.conversation_id,
        buy_request_id=transaction.buy_request_id,
        status=transaction.status,
        buyer_confirmed=transaction.buyer_confirmed,
        seller_confirmed=transaction.seller_confirmed,
        buyer_cancel_confirmed=transaction.buyer_cancel_confirmed if hasattr(transaction, 'buyer_cancel_confirmed') else False,
        seller_cancel_confirmed=transaction.seller_cancel_confirmed if hasattr(transaction, 'seller_cancel_confirmed') else False,
        meetup_time=transaction.meetup_time.isoformat() if transaction.meetup_time else None,
        meetup_place=transaction.meetup_place,
        meetup_lat=transaction.meetup_lat,
        meetup_lng=transaction.meetup_lng,
        created_date=transaction.created_date.isoformat() if transaction.created_date else datetime.now().isoformat(),
        completed_date=transaction.completed_date.isoformat() if transaction.completed_date else None,
    )


def review_to_response(review: ReviewDB) -> ReviewResponse:
    return ReviewResponse(
        id=review.id,
        transaction_id=review.transaction_id,
        item_id=review.item_id,
        reviewer_id=review.reviewer_id,
        reviewee_id=review.reviewee_id,
        rating=review.rating,
        comment=review.comment,
        response=review.response,
        created_date=review.created_date.isoformat() if review.created_date else datetime.now().isoformat(),
        updated_date=review.updated_date.isoformat() if review.updated_date else datetime.now().isoformat(),
    )

def calculate_user_rating(user_id: str, db: Session) -> float:
    """Calculate average rating for a user based on all their reviews."""
    reviews = db.query(ReviewDB).filter(ReviewDB.reviewee_id == user_id).all()
    if not reviews:
        return 0.0
    total_rating = sum(review.rating for review in reviews)
    return round(total_rating / len(reviews), 2)

def validate_bu_email(email: str) -> bool:
    return email.lower().endswith("@bu.edu")


# ============================
# Image Upload (Authenticated)
# ============================

@app.post("/api/upload-image")
async def upload_image(
    file: UploadFile = File(...),
    token_data: dict = Depends(verify_token),
):
    """
    Upload an image file to Cloudinary.
    Returns the public URL of the uploaded file.
    """
    # Validate file type
    allowed_extensions = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(allowed_extensions)}"
        )
    
    # Validate file size (5MB limit)
    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB in bytes
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File size exceeds maximum allowed size of 5MB"
        )
    
    # Sanitize filename to prevent path traversal
    import re
    safe_filename = re.sub(r'[^a-zA-Z0-9._-]', '_', file.filename)
    # Add timestamp to ensure uniqueness
    import time
    safe_filename = f"{int(time.time())}_{safe_filename}"
    
    # Ensure filename doesn't exceed reasonable length
    # Cloudinary allows up to 255 characters for public_id
    if len(safe_filename) > 255:
        name, ext = os.path.splitext(safe_filename)
        safe_filename = name[:250] + ext
    
    try:
        # Upload to Cloudinary (synchronous function, no await needed)
        public_url = upload_file_to_cloudinary(
            file_content=content,
            filename=safe_filename,
            folder="butrift/uploads"
        )
        
        logger.info(f"Image uploaded successfully to Cloudinary: {safe_filename}")
        return {"url": public_url}
        
    except Exception as e:
        logger.error(f"Failed to upload image to Cloudinary: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload image: {str(e)}"
        )


# ============================
# Items
# ============================

@app.get("/")
def root():
    return {"message": "BUThrift API is running!"}


@app.get("/api/items", response_model=List[ItemResponse])
def get_items(
    seller_id: Optional[str] = None,
    category: Optional[str] = None,
    condition: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(ItemDB)

    if seller_id:
        query = query.filter(ItemDB.seller_id == seller_id)
    if category:
        query = query.filter(ItemDB.category == category)
    if condition:
        query = query.filter(ItemDB.condition == condition)
    if status:
        query = query.filter(ItemDB.status == status)

    items = query.all()
    return [item_to_response(item) for item in items]


@app.get("/api/items/{item_id}", response_model=ItemResponse)
def get_item(item_id: str, db: Session = Depends(get_db)):
    item = db.query(ItemDB).filter(ItemDB.id == item_id).first()
    if not item:
        raise HTTPException(404, "Item not found")
    return item_to_response(item)


@app.post("/api/items", response_model=ItemResponse)
def create_item(
    item: ItemCreate,
    token_data: dict = Depends(verify_token),
    db: Session = Depends(get_db),
):
    # Validate price
    if item.price <= 0:
        raise HTTPException(status_code=400, detail="Price must be greater than 0")
    
    firebase_uid = token_data["uid"]

    user = db.query(UserDB).filter(UserDB.firebase_uid == firebase_uid).first()
    if not user:
        raise HTTPException(404, "User not found")

    try:
        new_item = ItemDB(
            id=str(uuid.uuid4()),
            title=item.title,
            description=item.description,
            price=item.price,
            category=item.category,
            condition=item.condition,
            seller_id=user.id,  # Seller is authenticated user
            status="available",
            location=item.location,
            is_negotiable=item.is_negotiable,
            created_date=datetime.now(),
            images=item.images or [],
        )

        db.add(new_item)
        db.commit()
        db.refresh(new_item)
        return item_to_response(new_item)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create item: {str(e)}")


@app.put("/api/items/{item_id}", response_model=ItemResponse)
def update_item(
    item_id: str,
    updates: ItemUpdate,
    token_data: dict = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """
    Update an existing item listing. Only the seller can update their own listing.
    """
    firebase_uid = token_data["uid"]
    user = db.query(UserDB).filter(UserDB.firebase_uid == firebase_uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    item = db.query(ItemDB).filter(ItemDB.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    if item.seller_id != user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own listings")

    if updates.price is not None and updates.price <= 0:
        raise HTTPException(status_code=400, detail="Price must be greater than 0")

    try:
        if updates.title is not None:
            item.title = updates.title
        if updates.description is not None:
            item.description = updates.description
        if updates.price is not None:
            item.price = updates.price
        if updates.category is not None:
            item.category = updates.category
        if updates.condition is not None:
            item.condition = updates.condition
        if updates.location is not None:
            item.location = updates.location
        if updates.is_negotiable is not None:
            item.is_negotiable = updates.is_negotiable
        if updates.images is not None:
            item.images = updates.images

        db.commit()
        db.refresh(item)
        return item_to_response(item)
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update item: {str(e)}")


@app.put("/api/items/{item_id}/status", response_model=ItemResponse)
def update_item_status(
    item_id: str,
    status_update: ItemStatusUpdate,
    token_data: dict = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """Update item status (available/sold/reserved). Only the seller can update."""
    allowed_statuses = {"available", "sold", "reserved"}
    if status_update.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Allowed: {', '.join(sorted(allowed_statuses))}"
        )

    firebase_uid = token_data["uid"]
    user = db.query(UserDB).filter(UserDB.firebase_uid == firebase_uid).first()
    if not user:
        raise HTTPException(404, "User not found")

    item = db.query(ItemDB).filter(ItemDB.id == item_id).first()
    if not item:
        raise HTTPException(404, "Item not found")

    if item.seller_id != user.id:
        raise HTTPException(status_code=403, detail="You can only update your own listings")

    try:
        item.status = status_update.status
        db.commit()
        db.refresh(item)
        return item_to_response(item)
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update item: {str(e)}")


@app.delete("/api/items/{item_id}")
def delete_item(
    item_id: str,
    token_data: dict = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """
    Delete an item listing. Only the seller who created the item can delete it.
    """
    firebase_uid = token_data["uid"]
    user = db.query(UserDB).filter(UserDB.firebase_uid == firebase_uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    item = db.query(ItemDB).filter(ItemDB.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    if item.seller_id != user.id:
        raise HTTPException(status_code=403, detail="You can only remove your own listings")

    try:
        db.delete(item)
        db.commit()
        return {"message": "Item deleted successfully"}
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete item: {str(e)}")


# ============================
# User Endpoints (Firebase)
# ============================

@app.post("/api/users/create-profile", response_model=UserResponse)
def create_profile(
    user_data: UserRegister,
    token_data: dict = Depends(verify_token),
    db: Session = Depends(get_db),
):
    if not validate_bu_email(user_data.email):
        raise HTTPException(400, "Email must be @bu.edu")

    firebase_uid = token_data["uid"]

    existing = db.query(UserDB).filter(
        (UserDB.email == user_data.email.lower()) |
        (UserDB.firebase_uid == firebase_uid)
    ).first()

    if existing:
        raise HTTPException(400, "User already exists")

    try:
        new_user = UserDB(
            id=str(uuid.uuid4()),
            firebase_uid=firebase_uid,
            email=user_data.email.lower(),
            display_name=user_data.display_name,
            is_verified=True,
            bio=user_data.bio,
            rating=0.0,
            total_sales=0,
            created_date=datetime.now(),
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        return user_to_response(new_user)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create profile: {str(e)}")


@app.get("/api/users/me", response_model=UserResponse)
def get_current_user(
    token_data: dict = Depends(verify_token),
    db: Session = Depends(get_db),
):
    firebase_uid = token_data["uid"]
    user = db.query(UserDB).filter(UserDB.firebase_uid == firebase_uid).first()

    if not user:
        raise HTTPException(404, "User not found")

    return user_to_response(user)


@app.put("/api/users/me", response_model=UserResponse)
def update_current_user(
    user_update: UserUpdate,
    token_data: dict = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """Update current authenticated user's profile"""
    firebase_uid = token_data["uid"]
    user = db.query(UserDB).filter(UserDB.firebase_uid == firebase_uid).first()

    if not user:
        raise HTTPException(404, "User not found")

    try:
        if user_update.display_name is not None:
            user.display_name = user_update.display_name
        if user_update.bio is not None:
            user.bio = user_update.bio
        if user_update.profile_image_url is not None:
            user.profile_image_url = user_update.profile_image_url

        db.commit()
        db.refresh(user)

        return user_to_response(user)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update profile: {str(e)}")


@app.post("/api/users/complete-profile")
def complete_profile(
    profile_data: CompleteProfileRequest,
    token_data: dict = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """
    Complete user profile after Google sign-up.
    Sets password in Firebase and updates display_name/bio in database.
    """
    firebase_uid = token_data["uid"]
    
    # Validate password
    if len(profile_data.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")
    
    # Get user from database
    user = db.query(UserDB).filter(UserDB.firebase_uid == firebase_uid).first()
    if not user:
        raise HTTPException(404, "User not found")
    
    try:
        # Set password in Firebase using Admin SDK
        from firebase_admin import auth as firebase_auth
        
        firebase_auth.update_user(
            firebase_uid,
            password=profile_data.password
        )
        
        logger.info(f"Password set for Firebase user {firebase_uid}")
        
        # Update display_name and bio in database
        user.display_name = profile_data.display_name.strip()
        if profile_data.bio:
            user.bio = profile_data.bio.strip()
        
        db.commit()
        db.refresh(user)
        
        logger.info(f"Profile completed for user {user.id} ({user.email})")
        
        return user_to_response(user)
    except Exception as e:
        db.rollback()
        logger.error(f"Error completing profile: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to complete profile: {str(e)}")


@app.delete("/api/users/me")
def delete_current_user(
    token_data: dict = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """
    Delete current user's account.
    Deletes from both Firebase and backend database (including all related data).
    """
    firebase_uid = token_data["uid"]
    user = db.query(UserDB).filter(UserDB.firebase_uid == firebase_uid).first()
    
    if not user:
        raise HTTPException(404, "User not found")
    
    user_id = user.id
    
    try:
        # Delete all related data first
        # 1. Delete all items by this user
        items = db.query(ItemDB).filter(ItemDB.seller_id == user_id).all()
        for item in items:
            db.delete(item)
        
        # 2. Delete all conversations where user is a participant
        conversations = db.query(ConversationDB).filter(
            (ConversationDB.participant1_id == user_id) |
            (ConversationDB.participant2_id == user_id)
        ).all()
        
        # Delete all messages in these conversations
        for conversation in conversations:
            messages = db.query(MessageDB).filter(MessageDB.conversation_id == conversation.id).all()
            for message in messages:
                db.delete(message)
            db.delete(conversation)
        
        # 3. Delete all messages sent by this user (in case any remain)
        remaining_messages = db.query(MessageDB).filter(MessageDB.sender_id == user_id).all()
        for message in remaining_messages:
            db.delete(message)
        
        # 4. Delete user from database
        db.delete(user)
        db.commit()
        
        logger.info(f"User {user_id} ({user.email}) and all related data deleted from database")
        
        # 5. Delete user from Firebase
        try:
            from firebase_admin import auth as firebase_auth
            firebase_auth.delete_user(firebase_uid)
            logger.info(f"Firebase user {firebase_uid} deleted")
        except Exception as firebase_error:
            logger.error(f"Failed to delete Firebase user {firebase_uid}: {firebase_error}")
            # Note: Database deletion already succeeded, so we continue
        
        return {"message": "Account deleted successfully"}
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting user account: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete account: {str(e)}")


@app.get("/api/users/{user_id}", response_model=UserResponse)
def get_user_profile(user_id: str, db: Session = Depends(get_db)):
    user = db.query(UserDB).filter(UserDB.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    return user_to_response(user)

# ==========================
# WebSocket Connection Manager
# ==========================

# Store active WebSocket connections
class ConnectionManager:
    def __init__(self):
        # Dictionary: user_id -> list of WebSocket connections
        self.active_connections: dict[str, list[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, user_id: str):
        """Accept WebSocket connection and store it"""
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
    
    def disconnect(self, websocket: WebSocket, user_id: str):
        """Remove WebSocket connection when client disconnects"""
        if user_id in self.active_connections:
            self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
    
    async def send_personal_message(self, message: dict, user_id: str):
        """Send message to a specific user's WebSocket connections"""
        if user_id in self.active_connections:
            logger.info(f"Sending message type '{message.get('type', 'unknown')}' to user {user_id}, {len(self.active_connections[user_id])} connection(s)")
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                    logger.info(f"Successfully sent message to user {user_id}")
                except Exception as e:
                    logger.error(f"Failed to send message to user {user_id}: {e}")
        else:
            logger.warning(f"User {user_id} has no active WebSocket connections - message type: {message.get('type', 'unknown')}")
    
    async def broadcast_to_conversation(self, message: dict, conversation_id: str, sender_id: str, db: Session):
        """Send message to all participants in a conversation (except sender)"""
        # Get conversation participants
        conversation = db.query(ConversationDB).filter(ConversationDB.id == conversation_id).first()
        if not conversation:
            return
        
        participants = [conversation.participant1_id, conversation.participant2_id]
        
        # Send to all participants except sender
        for participant_id in participants:
            if participant_id != sender_id:
                await self.send_personal_message(message, participant_id)
    
    async def broadcast_to_transaction(self, message: dict, transaction_id: str, sender_id: str, db: Session):
        """Send message to both buyer and seller of a transaction (except sender)"""
        from models.transaction import TransactionDB
        transaction = db.query(TransactionDB).filter(TransactionDB.id == transaction_id).first()
        if not transaction:
            logger.warning(f"Transaction {transaction_id} not found for broadcast")
            return
        
        participants = [transaction.buyer_id, transaction.seller_id]
        
        logger.info(f"Broadcasting transaction update to participants: {participants}, sender: {sender_id}")
        
        # Send to both participants except sender
        for participant_id in participants:
            if participant_id != sender_id:
                logger.info(f"Sending transaction update to user {participant_id}")
                await self.send_personal_message(message, participant_id)
            else:
                logger.info(f"Skipping sender {sender_id}")

# Create global connection manager instance
manager = ConnectionManager()

# ==========================
# WebSocket Endpoint
# ==========================

async def verify_websocket_token(token: str) -> Optional[dict]:
    """Verify Firebase token from WebSocket connection"""
    try:
        from firebase_admin import auth as firebase_auth
        decoded = firebase_auth.verify_id_token(token)
        return decoded
    except Exception as e:
        logger.error(f"WebSocket token verification failed: {e}")
        return None

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: str,
    token: str = Query(..., description="Firebase authentication token")
):
    """WebSocket endpoint for real-time messaging with authentication"""
    # Verify token from query parameter
    token_data = await verify_websocket_token(token)
    if not token_data:
        await websocket.close(code=1008, reason="Invalid authentication token")
        return
    
    # Verify user_id matches token
    from database import SessionLocal
    db = SessionLocal()
    try:
        user = db.query(UserDB).filter(UserDB.firebase_uid == token_data["uid"]).first()
        if not user:
            await websocket.close(code=1008, reason="User not found")
            return
        
        if user.id != user_id:
            await websocket.close(code=1008, reason="User ID mismatch")
            return
        
        await manager.connect(websocket, user_id)
        try:
            while True:
                # Keep connection alive and listen for messages
                # You can handle incoming WebSocket messages here if needed
                data = await websocket.receive_text()
                # Optional: Process incoming messages from client
                # For now, we just keep the connection alive
        except WebSocketDisconnect:
            manager.disconnect(websocket, user_id)
    finally:
        db.close()

# ==========================
# Messaging Endpoints
# ==========================

# Conversations CRUD
@app.post("/api/conversations", response_model=ConversationResponse)
def create_conversation(
    conversation: ConversationCreate,
    token_data: dict = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """Create a new conversation between two users"""
    
    firebase_uid = token_data["uid"]
    current_user = db.query(UserDB).filter(UserDB.firebase_uid == firebase_uid).first()
    if not current_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify that current user is participant1_id
    if conversation.participant1_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only create conversations as yourself")
    
    # Verify that participant2 exists
    participant2 = db.query(UserDB).filter(UserDB.id == conversation.participant2_id).first()
    if not participant2:
        raise HTTPException(status_code=404, detail="Other participant not found")
    
    # Prevent self-conversations
    if conversation.participant1_id == conversation.participant2_id:
        raise HTTPException(status_code=400, detail="Cannot create conversation with yourself")
    
    # Check if conversation already exists between these two users
    existing = db.query(ConversationDB).filter(
        ((ConversationDB.participant1_id == conversation.participant1_id) &
         (ConversationDB.participant2_id == conversation.participant2_id)) |
        ((ConversationDB.participant1_id == conversation.participant2_id) &
         (ConversationDB.participant2_id == conversation.participant1_id))
    ).first()
    
    if existing:
        # Return existing conversation instead of creating duplicate
        return conversation_to_response(existing, current_user_id=current_user.id, db=db)
    
    try:
        # Create new conversation
        new_conversation = ConversationDB(
            id=str(uuid.uuid4()),
            participant1_id=conversation.participant1_id,
            participant2_id=conversation.participant2_id,
            item_id=conversation.item_id,
        )
        
        db.add(new_conversation)
        db.commit()
        db.refresh(new_conversation)
        
        return conversation_to_response(new_conversation)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create conversation: {str(e)}")

@app.get("/api/conversations", response_model=List[ConversationResponse])
def get_conversations(
    user_id: str,
    token_data: dict = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """Get all conversations for a specific user"""
    firebase_uid = token_data["uid"]
    current_user = db.query(UserDB).filter(UserDB.firebase_uid == firebase_uid).first()
    if not current_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify that user can only access their own conversations
    if user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only access your own conversations")
    
    conversations = db.query(ConversationDB).filter(
        (ConversationDB.participant1_id == user_id) |
        (ConversationDB.participant2_id == user_id)
    ).order_by(ConversationDB.last_message_at.desc().nullslast()).all()
    
    return [conversation_to_response(conv, current_user_id=user_id, db=db) for conv in conversations]

@app.get("/api/conversations/{conversation_id}", response_model=ConversationResponse)
def get_conversation(
    conversation_id: str,
    token_data: dict = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """Get a specific conversation by ID"""
    firebase_uid = token_data["uid"]
    current_user = db.query(UserDB).filter(UserDB.firebase_uid == firebase_uid).first()
    if not current_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    conversation = db.query(ConversationDB).filter(ConversationDB.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Verify user is a participant
    if current_user.id not in [conversation.participant1_id, conversation.participant2_id]:
        raise HTTPException(status_code=403, detail="You are not a participant in this conversation")
    
    return conversation_to_response(conversation, current_user_id=current_user.id, db=db)

@app.put("/api/conversations/{conversation_id}", response_model=ConversationResponse)
def update_conversation(
    conversation_id: str,
    item_id: Optional[str] = None,
    token_data: dict = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """Update conversation (e.g., update item_id or last_message_at)"""
    firebase_uid = token_data["uid"]
    current_user = db.query(UserDB).filter(UserDB.firebase_uid == firebase_uid).first()
    if not current_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    conversation = db.query(ConversationDB).filter(ConversationDB.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Verify user is a participant
    if current_user.id not in [conversation.participant1_id, conversation.participant2_id]:
        raise HTTPException(status_code=403, detail="You are not a participant in this conversation")
    
    try:
        if item_id is not None:
            conversation.item_id = item_id
        
        db.commit()
        db.refresh(conversation)
        return conversation_to_response(conversation, current_user_id=current_user.id, db=db)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update conversation: {str(e)}")

@app.delete("/api/conversations/{conversation_id}")
def delete_conversation(
    conversation_id: str,
    token_data: dict = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """Delete a conversation and all its messages"""
    firebase_uid = token_data["uid"]
    current_user = db.query(UserDB).filter(UserDB.firebase_uid == firebase_uid).first()
    if not current_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    conversation = db.query(ConversationDB).filter(ConversationDB.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Verify user is a participant
    if current_user.id not in [conversation.participant1_id, conversation.participant2_id]:
        raise HTTPException(status_code=403, detail="You are not a participant in this conversation")
    
    try:
        db.delete(conversation)
        db.commit()
        return {"message": "Conversation deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete conversation: {str(e)}")

# Messages CRUD
@app.post("/api/messages", response_model=MessageResponse)
async def create_message(
    message: MessageCreate,
    token_data: dict = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """Create a new message in a conversation and broadcast via WebSocket"""
    
    # Validate message content
    content = message.content.strip()
    if not content or len(content) == 0:
        raise HTTPException(status_code=400, detail="Message content cannot be empty")
    if len(content) > 5000:
        raise HTTPException(status_code=400, detail="Message content cannot exceed 5000 characters")
    
    firebase_uid = token_data["uid"]
    current_user = db.query(UserDB).filter(UserDB.firebase_uid == firebase_uid).first()
    if not current_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify sender is authenticated user
    if message.sender_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only send messages as yourself")
    
    # Verify conversation exists
    conversation = db.query(ConversationDB).filter(ConversationDB.id == message.conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Verify sender is a participant
    if message.sender_id not in [conversation.participant1_id, conversation.participant2_id]:
        raise HTTPException(status_code=403, detail="You are not a participant in this conversation")
    
    try:
        # Create new message
        new_message = MessageDB(
            id=str(uuid.uuid4()),
            conversation_id=message.conversation_id,
            sender_id=message.sender_id,
            content=content,  # Use validated content
            is_read=False,
        )
        
        db.add(new_message)
        
        # Update conversation's last_message_at
        conversation.last_message_at = datetime.now()
        
        db.commit()
        db.refresh(new_message)
        
        # Convert to response format
        message_response = message_to_response(new_message)
        
        # Broadcast new message via WebSocket to conversation participants
        await manager.broadcast_to_conversation(
            {
                "type": "new_message",
                "data": message_response
            },
            message.conversation_id,
            message.sender_id,
            db
        )
        
        return message_response
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create message: {str(e)}")

@app.get("/api/messages", response_model=List[MessageResponse])
def get_messages(
    conversation_id: str,
    token_data: dict = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """Get all messages in a conversation"""
    firebase_uid = token_data["uid"]
    current_user = db.query(UserDB).filter(UserDB.firebase_uid == firebase_uid).first()
    if not current_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify conversation exists
    conversation = db.query(ConversationDB).filter(ConversationDB.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Verify user is a participant
    if current_user.id not in [conversation.participant1_id, conversation.participant2_id]:
        raise HTTPException(status_code=403, detail="You are not a participant in this conversation")
    
    messages = db.query(MessageDB).filter(
        MessageDB.conversation_id == conversation_id
    ).order_by(MessageDB.created_date.asc()).all()
    
    return [message_to_response(msg) for msg in messages]

@app.get("/api/messages/{message_id}", response_model=MessageResponse)
def get_message(
    message_id: str,
    token_data: dict = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """Get a specific message by ID"""
    firebase_uid = token_data["uid"]
    current_user = db.query(UserDB).filter(UserDB.firebase_uid == firebase_uid).first()
    if not current_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    message = db.query(MessageDB).filter(MessageDB.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Verify user is a participant in the conversation
    conversation = db.query(ConversationDB).filter(ConversationDB.id == message.conversation_id).first()
    if conversation and current_user.id not in [conversation.participant1_id, conversation.participant2_id]:
        raise HTTPException(status_code=403, detail="You are not a participant in this conversation")
    
    return message_to_response(message)

@app.put("/api/messages/{message_id}", response_model=MessageResponse)
def update_message(
    message_id: str,
    message_update: MessageUpdate,
    token_data: dict = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """Update a message (e.g., mark as read)"""
    firebase_uid = token_data["uid"]
    current_user = db.query(UserDB).filter(UserDB.firebase_uid == firebase_uid).first()
    if not current_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    message = db.query(MessageDB).filter(MessageDB.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Verify user is a participant in the conversation
    conversation = db.query(ConversationDB).filter(ConversationDB.id == message.conversation_id).first()
    if conversation and current_user.id not in [conversation.participant1_id, conversation.participant2_id]:
        raise HTTPException(status_code=403, detail="You are not a participant in this conversation")
    
    try:
        if message_update.is_read is not None:
            message.is_read = message_update.is_read
        
        db.commit()
        db.refresh(message)
        return message_to_response(message)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update message: {str(e)}")

@app.put("/api/conversations/{conversation_id}/mark-read")
def mark_conversation_read(
    conversation_id: str,
    user_id: str,
    token_data: dict = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """Mark all messages in a conversation as read for a specific user"""
    firebase_uid = token_data["uid"]
    current_user = db.query(UserDB).filter(UserDB.firebase_uid == firebase_uid).first()
    if not current_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify user_id matches authenticated user
    if user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only mark your own messages as read")
    
    # Verify conversation exists and user is a participant
    conversation = db.query(ConversationDB).filter(ConversationDB.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    if current_user.id not in [conversation.participant1_id, conversation.participant2_id]:
        raise HTTPException(status_code=403, detail="You are not a participant in this conversation")
    
    try:
        messages = db.query(MessageDB).filter(
            MessageDB.conversation_id == conversation_id,
            MessageDB.sender_id != user_id,  # Only mark messages NOT sent by this user
            MessageDB.is_read == False
        ).all()
        
        for message in messages:
            message.is_read = True
        
        db.commit()
        return {"message": f"Marked {len(messages)} messages as read"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to mark messages as read: {str(e)}")

@app.delete("/api/messages/{message_id}")
def delete_message(
    message_id: str,
    token_data: dict = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """Delete a message"""
    firebase_uid = token_data["uid"]
    current_user = db.query(UserDB).filter(UserDB.firebase_uid == firebase_uid).first()
    if not current_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    message = db.query(MessageDB).filter(MessageDB.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Only allow sender to delete their own messages
    if message.sender_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own messages")
    
    try:
        db.delete(message)
        db.commit()
        return {"message": "Message deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete message: {str(e)}")

# ============================
# BuyRequest Endpoints
# ============================

@app.post("/api/buy-requests", response_model=BuyRequestResponse)
async def create_buy_request(
    request_data: BuyRequestCreate,
    token_data: dict = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """Create a buy request for an item. Creates conversation if it doesn't exist."""
    firebase_uid = token_data["uid"]
    user = db.query(UserDB).filter(UserDB.firebase_uid == firebase_uid).first()
    if not user:
        raise HTTPException(404, "User not found")
    
    item = db.query(ItemDB).filter(ItemDB.id == request_data.item_id).first()
    if not item:
        raise HTTPException(404, "Item not found")
    
    if item.seller_id == user.id:
        raise HTTPException(status_code=400, detail="You cannot request to buy your own item")
    
    if item.status != "available":
        raise HTTPException(status_code=400, detail=f"Item is {item.status} and cannot be requested")
    
    existing = db.query(BuyRequestDB).filter(
        BuyRequestDB.item_id == request_data.item_id,
        BuyRequestDB.buyer_id == user.id,
        BuyRequestDB.status.in_(["pending", "accepted"])
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="You already have a pending or accepted request for this item")
    
    try:
        conversation_id = request_data.conversation_id
        if not conversation_id:
            existing_conv = db.query(ConversationDB).filter(
                ((ConversationDB.participant1_id == user.id) & (ConversationDB.participant2_id == item.seller_id)) |
                ((ConversationDB.participant1_id == item.seller_id) & (ConversationDB.participant2_id == user.id))
            ).first()
            
            if existing_conv:
                conversation_id = existing_conv.id
            else:
                new_conv = ConversationDB(
                    id=str(uuid.uuid4()),
                    participant1_id=user.id,
                    participant2_id=item.seller_id,
                    item_id=item.id,
                )
                db.add(new_conv)
                db.flush()
                conversation_id = new_conv.id
        
        buy_request = BuyRequestDB(
            id=str(uuid.uuid4()),
            item_id=item.id,
            buyer_id=user.id,
            seller_id=item.seller_id,
            conversation_id=conversation_id,
            status="pending"
        )
        db.add(buy_request)
        db.flush()
        
        buy_request_message = MessageDB(
            id=str(uuid.uuid4()),
            conversation_id=conversation_id,
            sender_id=user.id,
            content=f"Buy request for: {item.title}",
            message_type="buy_request",
            buy_request_id=buy_request.id,
            is_read=False
        )
        db.add(buy_request_message)
        
        conversation = db.query(ConversationDB).filter(ConversationDB.id == conversation_id).first()
        if conversation:
            conversation.last_message_at = datetime.now()
        
        db.commit()
        db.refresh(buy_request)
        db.refresh(buy_request_message)
        
        # Broadcast buy request update and new message via WebSocket
        buy_request_response = buy_request_to_response(buy_request)
        message_response = message_to_response(buy_request_message)
        
        # Broadcast buy request update to conversation participants
        await manager.broadcast_to_conversation(
            {
                "type": "buy_request_update",
                "data": pydantic_to_dict(buy_request_response)
            },
            conversation_id,
            user.id,
            db
        )
        
        # Broadcast new message to conversation participants
        await manager.broadcast_to_conversation(
            {
                "type": "new_message",
                "data": message_response
            },
            conversation_id,
            user.id,
            db
        )
        
        return buy_request_response
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating buy request: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create buy request: {str(e)}")

@app.patch("/api/buy-requests/{request_id}/accept")
async def accept_buy_request(
    request_id: str,
    token_data: dict = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """Accept a buy request and automatically create a transaction."""
    firebase_uid = token_data["uid"]
    user = db.query(UserDB).filter(UserDB.firebase_uid == firebase_uid).first()
    if not user:
        raise HTTPException(404, "User not found")
    
    buy_request = db.query(BuyRequestDB).filter(BuyRequestDB.id == request_id).first()
    if not buy_request:
        raise HTTPException(404, "Buy request not found")
    
    if buy_request.seller_id != user.id:
        raise HTTPException(status_code=403, detail="Only the seller can accept buy requests")
    
    if buy_request.status != "pending":
        raise HTTPException(status_code=400, detail=f"Buy request is already {buy_request.status}")
    
    item = db.query(ItemDB).filter(ItemDB.id == buy_request.item_id).first()
    if not item:
        raise HTTPException(404, "Item not found")
    
    if item.status != "available":
        raise HTTPException(status_code=400, detail=f"Item is {item.status} and cannot be purchased")
    
    existing_transaction = db.query(TransactionDB).filter(
        TransactionDB.item_id == buy_request.item_id,
        TransactionDB.status == "in_progress"
    ).first()
    
    if existing_transaction:
        raise HTTPException(status_code=400, detail="Item already has an in-progress transaction")
    
    try:
        buy_request.status = "accepted"
        buy_request.responded_date = datetime.now()
        
        other_requests = db.query(BuyRequestDB).filter(
            BuyRequestDB.item_id == buy_request.item_id,
            BuyRequestDB.status == "pending",
            BuyRequestDB.id != buy_request.id
        ).all()
        
        for req in other_requests:
            req.status = "rejected"
            req.responded_date = datetime.now()
        
        transaction = TransactionDB(
            id=str(uuid.uuid4()),
            item_id=buy_request.item_id,
            buyer_id=buy_request.buyer_id,
            seller_id=buy_request.seller_id,
            conversation_id=buy_request.conversation_id,
            buy_request_id=buy_request.id,
            status="in_progress",
            buyer_confirmed=False,
            seller_confirmed=False,
        )
        db.add(transaction)
        item.status = "reserved"
        
        acceptance_message = MessageDB(
            id=str(uuid.uuid4()),
            conversation_id=buy_request.conversation_id,
            sender_id=user.id,
            content="Buy request accepted! Transaction started.",
            message_type="text",
            is_read=False
        )
        db.add(acceptance_message)
        
        conversation = db.query(ConversationDB).filter(ConversationDB.id == buy_request.conversation_id).first()
        if conversation:
            conversation.last_message_at = datetime.now()
        
        db.commit()
        db.refresh(buy_request)
        db.refresh(transaction)
        
        # Broadcast buy request update and new transaction via WebSocket
        buy_request_response = buy_request_to_response(buy_request)
        transaction_response = transaction_to_response(transaction)
        
        # Broadcast to conversation participants (buy request update)
        await manager.broadcast_to_conversation(
            {
                "type": "buy_request_update",
                "data": pydantic_to_dict(buy_request_response)
            },
            buy_request.conversation_id,
            user.id,
            db
        )
        
        # Broadcast to transaction participants (new transaction created)
        await manager.broadcast_to_transaction(
            {
                "type": "transaction_created",
                "data": pydantic_to_dict(transaction_response)
            },
            transaction.id,
            user.id,
            db
        )
        
        return {
            "buy_request": buy_request_response,
            "transaction": transaction_response
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Error accepting buy request: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to accept buy request: {str(e)}")

@app.patch("/api/buy-requests/{request_id}/reject", response_model=BuyRequestResponse)
async def reject_buy_request(
    request_id: str,
    token_data: dict = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """Reject a buy request."""
    firebase_uid = token_data["uid"]
    user = db.query(UserDB).filter(UserDB.firebase_uid == firebase_uid).first()
    if not user:
        raise HTTPException(404, "User not found")
    
    buy_request = db.query(BuyRequestDB).filter(BuyRequestDB.id == request_id).first()
    if not buy_request:
        raise HTTPException(404, "Buy request not found")
    
    if buy_request.seller_id != user.id:
        raise HTTPException(status_code=403, detail="Only the seller can reject buy requests")
    
    if buy_request.status != "pending":
        raise HTTPException(status_code=400, detail=f"Buy request is already {buy_request.status}")
    
    try:
        buy_request.status = "rejected"
        buy_request.responded_date = datetime.now()
        
        rejection_message = MessageDB(
            id=str(uuid.uuid4()),
            conversation_id=buy_request.conversation_id,
            sender_id=user.id,
            content="Buy request declined.",
            message_type="text",
            is_read=False
        )
        db.add(rejection_message)
        
        conversation = db.query(ConversationDB).filter(ConversationDB.id == buy_request.conversation_id).first()
        if conversation:
            conversation.last_message_at = datetime.now()
        
        db.commit()
        db.refresh(buy_request)
        
        # Broadcast buy request update via WebSocket
        buy_request_response = buy_request_to_response(buy_request)
        await manager.broadcast_to_conversation(
            {
                "type": "buy_request_update",
                "data": pydantic_to_dict(buy_request_response)
            },
            buy_request.conversation_id,
            user.id,
            db
        )
        
        return buy_request_response
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to reject buy request: {str(e)}")

@app.patch("/api/buy-requests/{request_id}/cancel", response_model=BuyRequestResponse)
async def cancel_buy_request(
    request_id: str,
    token_data: dict = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """Cancel a buy request (buyer only)."""
    firebase_uid = token_data["uid"]
    user = db.query(UserDB).filter(UserDB.firebase_uid == firebase_uid).first()
    if not user:
        raise HTTPException(404, "User not found")
    
    buy_request = db.query(BuyRequestDB).filter(BuyRequestDB.id == request_id).first()
    if not buy_request:
        raise HTTPException(404, "Buy request not found")
    
    if buy_request.buyer_id != user.id:
        raise HTTPException(status_code=403, detail="Only the buyer can cancel buy requests")
    
    if buy_request.status != "pending":
        raise HTTPException(status_code=400, detail=f"Cannot cancel a {buy_request.status} request")
    
    try:
        buy_request.status = "cancelled"
        buy_request.responded_date = datetime.now()
        db.commit()
        db.refresh(buy_request)
        
        # Broadcast buy request update via WebSocket
        buy_request_response = buy_request_to_response(buy_request)
        await manager.broadcast_to_conversation(
            {
                "type": "buy_request_update",
                "data": pydantic_to_dict(buy_request_response)
            },
            buy_request.conversation_id,
            user.id,
            db
        )
        
        return buy_request_response
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to cancel buy request: {str(e)}")

@app.get("/api/buy-requests/by-conversation/{conversation_id}", response_model=List[BuyRequestResponse])
def get_buy_requests_by_conversation(
    conversation_id: str,
    token_data: dict = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """Get all buy requests for a conversation."""
    firebase_uid = token_data["uid"]
    user = db.query(UserDB).filter(UserDB.firebase_uid == firebase_uid).first()
    if not user:
        raise HTTPException(404, "User not found")
    
    conversation = db.query(ConversationDB).filter(ConversationDB.id == conversation_id).first()
    if not conversation:
        raise HTTPException(404, "Conversation not found")
    
    if user.id not in [conversation.participant1_id, conversation.participant2_id]:
        raise HTTPException(status_code=403, detail="You can only view buy requests for your own conversations")
    
    requests = db.query(BuyRequestDB).filter(
        BuyRequestDB.conversation_id == conversation_id
    ).order_by(BuyRequestDB.created_date.desc()).all()
    
    return [buy_request_to_response(req) for req in requests]

@app.get("/api/buy-requests/{request_id}", response_model=BuyRequestResponse)
def get_buy_request(
    request_id: str,
    token_data: dict = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """Get a specific buy request."""
    firebase_uid = token_data["uid"]
    user = db.query(UserDB).filter(UserDB.firebase_uid == firebase_uid).first()
    if not user:
        raise HTTPException(404, "User not found")
    
    buy_request = db.query(BuyRequestDB).filter(BuyRequestDB.id == request_id).first()
    if not buy_request:
        raise HTTPException(404, "Buy request not found")
    
    if user.id not in [buy_request.buyer_id, buy_request.seller_id]:
        raise HTTPException(status_code=403, detail="You can only view your own buy requests")
    
    return buy_request_to_response(buy_request)

# ============================
# Transaction Endpoints
# ============================

@app.get("/api/transactions/{transaction_id}", response_model=TransactionResponse)
def get_transaction(
    transaction_id: str,
    token_data: dict = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """Get a specific transaction."""
    firebase_uid = token_data["uid"]
    user = db.query(UserDB).filter(UserDB.firebase_uid == firebase_uid).first()
    if not user:
        raise HTTPException(404, "User not found")
    
    transaction = db.query(TransactionDB).filter(TransactionDB.id == transaction_id).first()
    if not transaction:
        raise HTTPException(404, "Transaction not found")
    
    if user.id not in [transaction.buyer_id, transaction.seller_id]:
        raise HTTPException(status_code=403, detail="You can only view your own transactions")
    
    return transaction_to_response(transaction)

@app.get("/api/transactions/by-conversation/{conversation_id}/all", response_model=List[TransactionResponse])
def get_all_transactions_by_conversation(
    conversation_id: str,
    token_data: dict = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """Get all transactions for a conversation."""
    firebase_uid = token_data["uid"]
    user = db.query(UserDB).filter(UserDB.firebase_uid == firebase_uid).first()
    if not user:
        raise HTTPException(404, "User not found")
    
    conversation = db.query(ConversationDB).filter(ConversationDB.id == conversation_id).first()
    if not conversation:
        raise HTTPException(404, "Conversation not found")
    
    if user.id not in [conversation.participant1_id, conversation.participant2_id]:
        raise HTTPException(status_code=403, detail="You can only view transactions for your own conversations")
    
    transactions = db.query(TransactionDB).filter(
        TransactionDB.conversation_id == conversation_id
    ).order_by(TransactionDB.created_date.desc()).all()
    
    return [transaction_to_response(t) for t in transactions]

@app.patch("/api/transactions/{transaction_id}", response_model=TransactionResponse)
async def update_transaction(
    transaction_id: str,
    update_data: TransactionUpdate,
    token_data: dict = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """Update a transaction (confirmations, meetup details)."""
    firebase_uid = token_data["uid"]
    user = db.query(UserDB).filter(UserDB.firebase_uid == firebase_uid).first()
    if not user:
        raise HTTPException(404, "User not found")
    
    transaction = db.query(TransactionDB).filter(TransactionDB.id == transaction_id).first()
    if not transaction:
        raise HTTPException(404, "Transaction not found")
    
    if user.id not in [transaction.buyer_id, transaction.seller_id]:
        raise HTTPException(status_code=403, detail="You can only update your own transactions")
    
    if transaction.status in ["completed", "cancelled"]:
        raise HTTPException(status_code=400, detail=f"Cannot modify a {transaction.status} transaction")
    
    try:
        if update_data.buyer_confirmed is not None:
            if transaction.buyer_id != user.id:
                raise HTTPException(status_code=403, detail="Only the buyer can set buyer_confirmed")
            transaction.buyer_confirmed = update_data.buyer_confirmed
        
        if update_data.seller_confirmed is not None:
            if transaction.seller_id != user.id:
                raise HTTPException(status_code=403, detail="Only the seller can set seller_confirmed")
            transaction.seller_confirmed = update_data.seller_confirmed
        
        if update_data.buyer_cancel_confirmed is not None:
            if transaction.buyer_id != user.id:
                raise HTTPException(status_code=403, detail="Only the buyer can set buyer_cancel_confirmed")
            transaction.buyer_cancel_confirmed = update_data.buyer_cancel_confirmed
        
        if update_data.seller_cancel_confirmed is not None:
            if transaction.seller_id != user.id:
                raise HTTPException(status_code=403, detail="Only the seller can set seller_cancel_confirmed")
            transaction.seller_cancel_confirmed = update_data.seller_cancel_confirmed
        
        if update_data.meetup_time is not None:
            if update_data.meetup_time:
                transaction.meetup_time = datetime.fromisoformat(update_data.meetup_time.replace('Z', '+00:00'))
            else:
                transaction.meetup_time = None
        
        if update_data.meetup_place is not None:
            transaction.meetup_place = update_data.meetup_place
        
        if update_data.meetup_lat is not None:
            transaction.meetup_lat = update_data.meetup_lat
        
        if update_data.meetup_lng is not None:
            transaction.meetup_lng = update_data.meetup_lng
        
        # Check if both parties confirmed completion
        if transaction.buyer_confirmed and transaction.seller_confirmed and transaction.status == "in_progress":
            transaction.status = "completed"
            transaction.completed_date = datetime.now()
            
            item = db.query(ItemDB).filter(ItemDB.id == transaction.item_id).first()
            if item:
                item.status = "sold"
            
            seller = db.query(UserDB).filter(UserDB.id == transaction.seller_id).first()
            if seller:
                seller.total_sales += 1
        
        # Check if both parties confirmed cancellation
        if transaction.buyer_cancel_confirmed and transaction.seller_cancel_confirmed and transaction.status == "in_progress":
            transaction.status = "cancelled"
            transaction.completed_date = datetime.now()
            
            item = db.query(ItemDB).filter(ItemDB.id == transaction.item_id).first()
            if item and item.status == "reserved":
                item.status = "available"
            
            # Also cancel the associated buy request(s) so buyer can request again
            # First, try to cancel the buy request linked to this transaction
            if transaction.buy_request_id:
                buy_request = db.query(BuyRequestDB).filter(BuyRequestDB.id == transaction.buy_request_id).first()
                if buy_request and buy_request.status == "accepted":
                    buy_request.status = "cancelled"
                    buy_request.responded_date = datetime.now()
            
            # Also cancel any other accepted buy requests for this item and buyer (safety check)
            accepted_requests = db.query(BuyRequestDB).filter(
                BuyRequestDB.item_id == transaction.item_id,
                BuyRequestDB.buyer_id == transaction.buyer_id,
                BuyRequestDB.status == "accepted"
            ).all()
            for req in accepted_requests:
                if req.id != transaction.buy_request_id:  # Don't double-update the one above
                    req.status = "cancelled"
                    req.responded_date = datetime.now()
        
        db.commit()
        db.refresh(transaction)
        
        # Broadcast transaction update via WebSocket to both buyer and seller
        transaction_response = transaction_to_response(transaction)
        await manager.broadcast_to_transaction(
            {
                "type": "transaction_update",
                "data": pydantic_to_dict(transaction_response)
            },
            transaction_id,
            user.id,
            db
        )
        
        return transaction_response
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating transaction: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update transaction: {str(e)}")

@app.patch("/api/transactions/{transaction_id}/cancel", response_model=TransactionResponse)
async def cancel_transaction(
    transaction_id: str,
    token_data: dict = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """Cancel a transaction."""
    firebase_uid = token_data["uid"]
    user = db.query(UserDB).filter(UserDB.firebase_uid == firebase_uid).first()
    if not user:
        raise HTTPException(404, "User not found")
    
    transaction = db.query(TransactionDB).filter(TransactionDB.id == transaction_id).first()
    if not transaction:
        raise HTTPException(404, "Transaction not found")
    
    if user.id not in [transaction.buyer_id, transaction.seller_id]:
        raise HTTPException(status_code=403, detail="You can only cancel your own transactions")
    
    if transaction.status == "completed":
        raise HTTPException(status_code=400, detail="Cannot cancel a completed transaction")
    
    try:
        transaction.status = "cancelled"
        transaction.completed_date = datetime.now()
        
        item = db.query(ItemDB).filter(ItemDB.id == transaction.item_id).first()
        if item and item.status == "reserved":
            item.status = "available"
        
        # Also cancel the associated buy request(s) so buyer can request again
        # First, try to cancel the buy request linked to this transaction
        if transaction.buy_request_id:
            buy_request = db.query(BuyRequestDB).filter(BuyRequestDB.id == transaction.buy_request_id).first()
            if buy_request and buy_request.status == "accepted":
                buy_request.status = "cancelled"
                buy_request.responded_date = datetime.now()
        
        # Also cancel any other accepted buy requests for this item and buyer (safety check)
        accepted_requests = db.query(BuyRequestDB).filter(
            BuyRequestDB.item_id == transaction.item_id,
            BuyRequestDB.buyer_id == transaction.buyer_id,
            BuyRequestDB.status == "accepted"
        ).all()
        for req in accepted_requests:
            if req.id != transaction.buy_request_id:  # Don't double-update the one above
                req.status = "cancelled"
                req.responded_date = datetime.now()
        
        db.commit()
        db.refresh(transaction)
        
        # Broadcast transaction update via WebSocket
        transaction_response = transaction_to_response(transaction)
        await manager.broadcast_to_transaction(
            {
                "type": "transaction_update",
                "data": pydantic_to_dict(transaction_response)
            },
            transaction_id,
            user.id,
            db
        )
        
        return transaction_response
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to cancel transaction: {str(e)}")


# ============================
# Review Endpoints
# ============================

@app.post("/api/reviews", response_model=ReviewResponse)
def create_review(
    review_data: ReviewCreate,
    token_data: dict = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """Create a review for a completed transaction. Buyer reviews seller, seller reviews buyer."""
    firebase_uid = token_data["uid"]
    user = db.query(UserDB).filter(UserDB.firebase_uid == firebase_uid).first()
    if not user:
        raise HTTPException(404, "User not found")
    
    # Verify transaction exists and is completed
    transaction = db.query(TransactionDB).filter(TransactionDB.id == review_data.transaction_id).first()
    if not transaction:
        raise HTTPException(404, "Transaction not found")
    
    if transaction.status != "completed":
        raise HTTPException(status_code=400, detail="Can only review completed transactions")
    
    # Determine reviewer and reviewee
    # If current user is buyer, they review seller (and vice versa)
    if user.id == transaction.buyer_id:
        reviewer_id = transaction.buyer_id
        reviewee_id = transaction.seller_id
    elif user.id == transaction.seller_id:
        reviewer_id = transaction.seller_id
        reviewee_id = transaction.buyer_id
    else:
        raise HTTPException(status_code=403, detail="You can only review transactions you participated in")
    
    # Validate rating
    if review_data.rating < 1 or review_data.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    
    # Check if user already reviewed this transaction
    existing_review = db.query(ReviewDB).filter(
        ReviewDB.transaction_id == review_data.transaction_id,
        ReviewDB.reviewer_id == reviewer_id
    ).first()
    
    if existing_review:
        raise HTTPException(status_code=400, detail="You have already reviewed this transaction")
    
    try:
        new_review = ReviewDB(
            id=str(uuid.uuid4()),
            transaction_id=review_data.transaction_id,
            item_id=transaction.item_id,
            reviewer_id=reviewer_id,
            reviewee_id=reviewee_id,
            rating=review_data.rating,
            comment=review_data.comment,
            created_date=datetime.now(),
            updated_date=datetime.now(),
        )
        
        db.add(new_review)
        db.commit()
        db.refresh(new_review)
        
        # Recalculate and update reviewee's rating
        new_rating = calculate_user_rating(reviewee_id, db)
        reviewee = db.query(UserDB).filter(UserDB.id == reviewee_id).first()
        if reviewee:
            reviewee.rating = new_rating
            db.commit()
        
        return review_to_response(new_review)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create review: {str(e)}")


@app.get("/api/reviews", response_model=List[ReviewResponse])
def get_reviews(
    user_id: Optional[str] = Query(None, description="Get reviews for a specific user"),
    transaction_id: Optional[str] = Query(None, description="Get reviews for a specific transaction"),
    item_id: Optional[str] = Query(None, description="Get reviews for a specific item"),
    db: Session = Depends(get_db),
):
    """Get reviews. Can filter by user_id, transaction_id, or item_id."""
    query = db.query(ReviewDB)
    
    if user_id:
        # Get all reviews for a user (as reviewee)
        query = query.filter(ReviewDB.reviewee_id == user_id)
    elif transaction_id:
        query = query.filter(ReviewDB.transaction_id == transaction_id)
    elif item_id:
        query = query.filter(ReviewDB.item_id == item_id)
    else:
        # If no filter, return empty (or could return error)
        return []
    
    reviews = query.order_by(ReviewDB.created_date.desc()).all()
    return [review_to_response(review) for review in reviews]


@app.get("/api/reviews/{review_id}", response_model=ReviewResponse)
def get_review(review_id: str, db: Session = Depends(get_db)):
    """Get a specific review by ID."""
    review = db.query(ReviewDB).filter(ReviewDB.id == review_id).first()
    if not review:
        raise HTTPException(404, "Review not found")
    return review_to_response(review)


@app.put("/api/reviews/{review_id}/response", response_model=ReviewResponse)
def add_review_response(
    review_id: str,
    response_data: ReviewUpdate,
    token_data: dict = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """Add a response to a review. Only the reviewee can add a response."""
    firebase_uid = token_data["uid"]
    user = db.query(UserDB).filter(UserDB.firebase_uid == firebase_uid).first()
    if not user:
        raise HTTPException(404, "User not found")
    
    review = db.query(ReviewDB).filter(ReviewDB.id == review_id).first()
    if not review:
        raise HTTPException(404, "Review not found")
    
    # Only the reviewee can add a response
    if review.reviewee_id != user.id:
        raise HTTPException(status_code=403, detail="Only the reviewed user can add a response")
    
    if not response_data.response:
        raise HTTPException(status_code=400, detail="Response text is required")
    
    try:
        review.response = response_data.response
        review.updated_date = datetime.now()
        db.commit()
        db.refresh(review)
        return review_to_response(review)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to add response: {str(e)}")


@app.delete("/api/reviews/{review_id}")
def delete_review(
    review_id: str,
    token_data: dict = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """Delete a review. Only the reviewer can delete their own review."""
    firebase_uid = token_data["uid"]
    user = db.query(UserDB).filter(UserDB.firebase_uid == firebase_uid).first()
    if not user:
        raise HTTPException(404, "User not found")
    
    review = db.query(ReviewDB).filter(ReviewDB.id == review_id).first()
    if not review:
        raise HTTPException(404, "Review not found")
    
    # Only the reviewer can delete their review
    if review.reviewer_id != user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own reviews")
    
    try:
        reviewee_id = review.reviewee_id  # Save before deletion
        db.delete(review)
        db.commit()
        
        # Recalculate and update reviewee's rating after deletion
        new_rating = calculate_user_rating(reviewee_id, db)
        reviewee = db.query(UserDB).filter(UserDB.id == reviewee_id).first()
        if reviewee:
            reviewee.rating = new_rating
            db.commit()
        
        return {"message": "Review deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete review: {str(e)}")
