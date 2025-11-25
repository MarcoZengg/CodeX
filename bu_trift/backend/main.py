from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, WebSocket, WebSocketDisconnect

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
import uuid
from datetime import datetime
import os

# NEW: import Firebase auth verification
from auth import verify_token

# Ensure firebase_admin initializes
import firebase_config  # noqa: F401

app = FastAPI()

# Create uploads directory
upload_dir = "uploads"
os.makedirs(upload_dir, exist_ok=True)

# Serve uploaded images
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Create tables
Base.metadata.create_all(bind=engine)

origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
]

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


class UserRegister(BaseModel):
    email: str
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


def conversation_to_response(conversation: ConversationDB) -> dict:
    """Convert ConversationDB to response dictionary"""
    return {
        "id": conversation.id,
        "participant1_id": conversation.participant1_id,
        "participant2_id": conversation.participant2_id,
        "item_id": conversation.item_id,
        "last_message_at": conversation.last_message_at.isoformat() if conversation.last_message_at else None,
        "created_date": conversation.created_date.isoformat() if conversation.created_date else datetime.now().isoformat(),
        "updated_date": conversation.updated_date.isoformat() if conversation.updated_date else datetime.now().isoformat(),
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
    file_path = os.path.join("uploads", file.filename)
    with open(file_path, "wb") as f:
        f.write(await file.read())

    url = f"http://localhost:8000/uploads/{file.filename}"
    return {"url": url}


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
    firebase_uid = token_data["uid"]

    user = db.query(UserDB).filter(UserDB.firebase_uid == firebase_uid).first()
    if not user:
        raise HTTPException(404, "User not found")

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

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    """WebSocket endpoint for real-time messaging"""
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

# ==========================
# Messaging Endpoints
# ==========================

# Conversations CRUD
@app.post("/api/conversations", response_model=ConversationResponse)
def create_conversation(conversation: ConversationCreate, db: Session = Depends(get_db)):
    """Create a new conversation between two users"""
    
    # Check if conversation already exists between these two users
    existing = db.query(ConversationDB).filter(
        ((ConversationDB.participant1_id == conversation.participant1_id) &
         (ConversationDB.participant2_id == conversation.participant2_id)) |
        ((ConversationDB.participant1_id == conversation.participant2_id) &
         (ConversationDB.participant2_id == conversation.participant1_id))
    ).first()
    
    if existing:
        # Return existing conversation instead of creating duplicate
        return conversation_to_response(existing)
    
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

@app.get("/api/conversations", response_model=List[ConversationResponse])
def get_conversations(user_id: str, db: Session = Depends(get_db)):
    """Get all conversations for a specific user"""
    conversations = db.query(ConversationDB).filter(
        (ConversationDB.participant1_id == user_id) |
        (ConversationDB.participant2_id == user_id)
    ).order_by(ConversationDB.last_message_at.desc().nullslast()).all()
    
    return [conversation_to_response(conv) for conv in conversations]

@app.get("/api/conversations/{conversation_id}", response_model=ConversationResponse)
def get_conversation(conversation_id: str, db: Session = Depends(get_db)):
    """Get a specific conversation by ID"""
    conversation = db.query(ConversationDB).filter(ConversationDB.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation_to_response(conversation)

@app.put("/api/conversations/{conversation_id}", response_model=ConversationResponse)
def update_conversation(
    conversation_id: str,
    item_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Update conversation (e.g., update item_id or last_message_at)"""
    conversation = db.query(ConversationDB).filter(ConversationDB.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    if item_id is not None:
        conversation.item_id = item_id
    
    db.commit()
    db.refresh(conversation)
    return conversation_to_response(conversation)

@app.delete("/api/conversations/{conversation_id}")
def delete_conversation(conversation_id: str, db: Session = Depends(get_db)):
    """Delete a conversation and all its messages"""
    conversation = db.query(ConversationDB).filter(ConversationDB.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    db.delete(conversation)
    db.commit()
    return {"message": "Conversation deleted successfully"}

# Messages CRUD
@app.post("/api/messages", response_model=MessageResponse)
async def create_message(message: MessageCreate, db: Session = Depends(get_db)):
    """Create a new message in a conversation and broadcast via WebSocket"""
    
    # Verify conversation exists
    conversation = db.query(ConversationDB).filter(ConversationDB.id == message.conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Verify sender is a participant
    if message.sender_id not in [conversation.participant1_id, conversation.participant2_id]:
        raise HTTPException(status_code=403, detail="Sender is not a participant in this conversation")
    
    # Create new message
    new_message = MessageDB(
        id=str(uuid.uuid4()),
        conversation_id=message.conversation_id,
        sender_id=message.sender_id,
        content=message.content,
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

@app.get("/api/messages", response_model=List[MessageResponse])
def get_messages(conversation_id: str, db: Session = Depends(get_db)):
    """Get all messages in a conversation"""
    messages = db.query(MessageDB).filter(
        MessageDB.conversation_id == conversation_id
    ).order_by(MessageDB.created_date.asc()).all()
    
    return [message_to_response(msg) for msg in messages]

@app.get("/api/messages/{message_id}", response_model=MessageResponse)
def get_message(message_id: str, db: Session = Depends(get_db)):
    """Get a specific message by ID"""
    message = db.query(MessageDB).filter(MessageDB.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    return message_to_response(message)

@app.put("/api/messages/{message_id}", response_model=MessageResponse)
def update_message(
    message_id: str,
    message_update: MessageUpdate,
    db: Session = Depends(get_db)
):
    """Update a message (e.g., mark as read)"""
    message = db.query(MessageDB).filter(MessageDB.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    if message_update.is_read is not None:
        message.is_read = message_update.is_read
    
    db.commit()
    db.refresh(message)
    return message_to_response(message)

@app.put("/api/conversations/{conversation_id}/mark-read")
def mark_conversation_read(conversation_id: str, user_id: str, db: Session = Depends(get_db)):
    """Mark all messages in a conversation as read for a specific user"""
    messages = db.query(MessageDB).filter(
        MessageDB.conversation_id == conversation_id,
        MessageDB.sender_id != user_id,  # Only mark messages NOT sent by this user
        MessageDB.is_read == False
    ).all()
    
    for message in messages:
        message.is_read = True
    
    db.commit()
    return {"message": f"Marked {len(messages)} messages as read"}

@app.delete("/api/messages/{message_id}")
def delete_message(message_id: str, db: Session = Depends(get_db)):
    """Delete a message"""
    message = db.query(MessageDB).filter(MessageDB.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    db.delete(message)
    db.commit()
    return {"message": "Message deleted successfully"}
