from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, WebSocket, WebSocketDisconnect, Query

from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session
from database import get_db, engine, Base
from typing import Optional, List

from models.item import ItemDB
from models.user import UserDB
from models.conversation import ConversationDB
from models.message import MessageDB
from models.transaction import TransactionDB

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

class TransactionCreate(BaseModel):
    item_id: str
    conversation_id: str
    buyer_id: str
    seller_id: str
    meetup_time: Optional[str] = None  # ISO datetime string
    meetup_place: Optional[str] = None

class TransactionUpdate(BaseModel):
    status: Optional[str] = None
    buyer_confirmed: Optional[bool] = None
    seller_confirmed: Optional[bool] = None
    meetup_time: Optional[str] = None
    meetup_place: Optional[str] = None
    meetup_lat: Optional[float] = None
    meetup_lng: Optional[float] = None

class TransactionResponse(BaseModel):
    id: str
    item_id: str
    buyer_id: str
    seller_id: str
    conversation_id: str
    status: str
    buyer_confirmed: bool
    seller_confirmed: bool
    meetup_time: Optional[str]
    meetup_place: Optional[str]
    meetup_lat: Optional[float]
    meetup_lng: Optional[float]
    created_date: str
    completed_date: Optional[str]


class UserRegister(BaseModel):
    email: str
    display_name: str
    bio: Optional[str] = None


class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None
    profile_image_url: Optional[str] = None


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

class MessageUpdate(BaseModel):
    is_read: Optional[bool] = None


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

def transaction_to_response(transaction: TransactionDB) -> dict:
    """Convert TransactionDB to response dictionary"""
    return {
        "id": transaction.id,
        "item_id": transaction.item_id,
        "buyer_id": transaction.buyer_id,
        "seller_id": transaction.seller_id,
        "conversation_id": transaction.conversation_id,
        "status": transaction.status,
        "buyer_confirmed": transaction.buyer_confirmed,
        "seller_confirmed": transaction.seller_confirmed,
        "meetup_time": transaction.meetup_time.isoformat() if transaction.meetup_time else None,
        "meetup_place": transaction.meetup_place,
        "meetup_lat": transaction.meetup_lat,
        "meetup_lng": transaction.meetup_lng,
        "created_date": transaction.created_date.isoformat() if transaction.created_date else None,
        "completed_date": transaction.completed_date.isoformat() if transaction.completed_date else None,
    }


def message_to_response(message: MessageDB) -> dict:
    """Convert MessageDB to response dictionary"""
    return {
        "id": message.id,
        "conversation_id": message.conversation_id,
        "sender_id": message.sender_id,
        "content": message.content,
        "is_read": message.is_read,
        "created_date": message.created_date.isoformat() if message.created_date else datetime.now().isoformat(),
    }


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
    return {"message": "BUTrift API is running!"}


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


@app.post("/api/transactions", response_model=TransactionResponse)
def create_transaction(
    transaction_data: TransactionCreate,
    token_data: dict = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """
    Create a new transaction.
    Only the buyer or seller can create a transaction for their conversation.
    """
    firebase_uid = token_data["uid"]
    user = db.query(UserDB).filter(UserDB.firebase_uid == firebase_uid).first()
    if not user:
        raise HTTPException(404, "User not found")
    
    # Verify user is either buyer or seller
    if transaction_data.buyer_id != user.id and transaction_data.seller_id != user.id:
        raise HTTPException(status_code=403, detail="You can only create transactions for your own conversations")
    
    # Verify conversation exists and user is a participant
    conversation = db.query(ConversationDB).filter(ConversationDB.id == transaction_data.conversation_id).first()
    if not conversation:
        raise HTTPException(404, "Conversation not found")
    
    if conversation.participant1_id != user.id and conversation.participant2_id != user.id:
        raise HTTPException(status_code=403, detail="You can only create transactions for conversations you're part of")
    
    # Check if transaction already exists for this conversation
    existing = db.query(TransactionDB).filter(TransactionDB.conversation_id == transaction_data.conversation_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Transaction already exists for this conversation")
    
    # Parse meetup_time if provided
    meetup_time = None
    if transaction_data.meetup_time:
        try:
            meetup_time = datetime.fromisoformat(transaction_data.meetup_time.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid meetup_time format. Use ISO datetime format.")
    
    try:
        transaction = TransactionDB(
            id=str(uuid.uuid4()),
            item_id=transaction_data.item_id,
            buyer_id=transaction_data.buyer_id,
            seller_id=transaction_data.seller_id,
            conversation_id=transaction_data.conversation_id,
            status="in_progress",
            buyer_confirmed=False,
            seller_confirmed=False,
            meetup_time=meetup_time,
            meetup_place=transaction_data.meetup_place,
        )
        db.add(transaction)
        db.commit()
        db.refresh(transaction)
        return transaction_to_response(transaction)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create transaction: {str(e)}")


@app.get("/api/transactions/by_conversation/{conversation_id}", response_model=TransactionResponse)
def get_transaction_by_conversation(
    conversation_id: str,
    token_data: dict = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """
    Get transaction by conversation ID.
    Only participants of the conversation can access it.
    """
    firebase_uid = token_data["uid"]
    user = db.query(UserDB).filter(UserDB.firebase_uid == firebase_uid).first()
    if not user:
        raise HTTPException(404, "User not found")
    
    # Verify user is participant in conversation
    conversation = db.query(ConversationDB).filter(ConversationDB.id == conversation_id).first()
    if not conversation:
        raise HTTPException(404, "Conversation not found")
    
    if conversation.participant1_id != user.id and conversation.participant2_id != user.id:
        raise HTTPException(status_code=403, detail="You can only access transactions for your own conversations")
    
    transaction = db.query(TransactionDB).filter(TransactionDB.conversation_id == conversation_id).first()
    if not transaction:
        raise HTTPException(404, "Transaction not found")
    
    return transaction_to_response(transaction)


@app.patch("/api/transactions/{transaction_id}", response_model=TransactionResponse)
def update_transaction(
    transaction_id: str,
    update_data: TransactionUpdate,
    token_data: dict = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """
    Update a transaction.
    Only the buyer or seller can update their transaction.
    """
    firebase_uid = token_data["uid"]
    user = db.query(UserDB).filter(UserDB.firebase_uid == firebase_uid).first()
    if not user:
        raise HTTPException(404, "User not found")
    
    transaction = db.query(TransactionDB).filter(TransactionDB.id == transaction_id).first()
    if not transaction:
        raise HTTPException(404, "Transaction not found")
    
    # Verify user is buyer or seller
    if transaction.buyer_id != user.id and transaction.seller_id != user.id:
        raise HTTPException(status_code=403, detail="You can only update your own transactions")
    
    try:
        # Update fields if provided
        if update_data.status is not None:
            transaction.status = update_data.status
        
        if update_data.buyer_confirmed is not None:
            if transaction.buyer_id != user.id:
                raise HTTPException(status_code=403, detail="Only the buyer can set buyer_confirmed")
            transaction.buyer_confirmed = update_data.buyer_confirmed
        
        if update_data.seller_confirmed is not None:
            if transaction.seller_id != user.id:
                raise HTTPException(status_code=403, detail="Only the seller can set seller_confirmed")
            transaction.seller_confirmed = update_data.seller_confirmed
        
        if update_data.meetup_time is not None:
            if update_data.meetup_time:
                try:
                    transaction.meetup_time = datetime.fromisoformat(update_data.meetup_time.replace('Z', '+00:00'))
                except ValueError:
                    raise HTTPException(status_code=400, detail="Invalid meetup_time format")
            else:
                transaction.meetup_time = None
        
        if update_data.meetup_place is not None:
            transaction.meetup_place = update_data.meetup_place
        
        if update_data.meetup_lat is not None:
            transaction.meetup_lat = update_data.meetup_lat
        
        if update_data.meetup_lng is not None:
            transaction.meetup_lng = update_data.meetup_lng
        
        # Auto-complete transaction if both parties confirmed
        if transaction.buyer_confirmed and transaction.seller_confirmed:
            transaction.status = "completed"
            transaction.completed_date = datetime.now()
        
        db.commit()
        db.refresh(transaction)
        return transaction_to_response(transaction)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update transaction: {str(e)}")


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
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except:
                    pass  # Connection closed, skip it
    
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
