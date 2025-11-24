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
import bcrypt
import uuid
from datetime import datetime
import os

# Password hashing (simple - no JWT authentication for now)
# Using bcrypt directly instead of passlib for better compatibility

def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt"""
    # Convert password to bytes
    password_bytes = password.encode('utf-8')
    # Generate salt and hash password
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    # Return as string (decode from bytes)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    # Convert both to bytes
    password_bytes = plain_password.encode('utf-8')
    hashed_bytes = hashed_password.encode('utf-8')
    # Verify password
    return bcrypt.checkpw(password_bytes, hashed_bytes)

app = FastAPI()

# Create uploads directory if it doesn't exist
upload_dir = "uploads"
os.makedirs(upload_dir, exist_ok=True)

# Serve uploaded images from /uploads
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Create tables
Base.metadata.create_all(bind=engine)

origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    # ... etc
]

# Allow frontend to call backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # React app
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models (data validation)
class ItemCreate(BaseModel):
    title: str
    description: str
    price: float
    category: str
    condition: str
    seller_id: str
    location: Optional[str] = None
    is_negotiable: bool = False
    images: Optional[List[str]] = []   # NEW: list of image URLs


class ItemResponse(BaseModel):
    id: str
    title: str
    description: str
    price: float
    category: str
    condition: str
    seller_id: str
    status: str
    location: Optional[str] = None
    is_negotiable: bool
    created_date: str
    images: Optional[List[str]] = []   # NEW: include images in response


# User Pydantic models
class UserRegister(BaseModel):
    email: str
    password: str
    display_name: str
    bio: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    display_name: str
    is_verified: bool
    profile_image_url: Optional[str] = None
    bio: Optional[str] = None
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


# Helper function to convert ItemDB to response format
def item_to_response(item: ItemDB) -> dict:
    """Convert ItemDB database object to response dictionary"""
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
        "created_date": item.created_date.isoformat() if item.created_date else datetime.now().isoformat(),
        "images": item.images or [],   # NEW: images from DB
    }

# Helper function to convert UserDB to response format
def user_to_response(user: UserDB) -> dict:
    """Convert UserDB database object to response dictionary"""
    return {
        "id": user.id,
        "email": user.email,
        "display_name": user.display_name,
        "is_verified": user.is_verified,
        "profile_image_url": user.profile_image_url,
        "bio": user.bio,
        "rating": user.rating if user.rating else 0.0,
        "total_sales": user.total_sales if user.total_sales else 0,
        "created_date": user.created_date.isoformat() if user.created_date else datetime.now().isoformat()
    }

# Helper function to convert ConversationDB to response format
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

# Helper function to convert MessageDB to response format
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
    """Validate that email ends with @bu.edu"""
    return email.lower().endswith("@bu.edu")

# ==========================
# Image Upload Endpoint
# ==========================
@app.post("/api/upload-image")
async def upload_image(file: UploadFile = File(...)):
    """
    Upload a single image file and return its public URL.
    Files are stored in the local 'uploads' directory.
    """
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)

    # Use original filename (you could also randomize this)
    file_path = os.path.join(upload_dir, file.filename)

    # Save file to disk
    with open(file_path, "wb") as f:
        f.write(await file.read())

    # Serve via /uploads route
    url = f"http://localhost:8000/uploads/{file.filename}"

    return {"url": url}

# API Endpoints
@app.get("/")
def read_root():
    return {"message": "BUTrift API is running!"}

@app.get("/api/items", response_model=List[ItemResponse])
def get_items(
    seller_id: Optional[str] = None,
    category: Optional[str] = None,
    condition: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get items with optional filtering - from database"""
    query = db.query(ItemDB)
    
    # Apply filters if provided
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
    """Get item by ID - from database"""
    item = db.query(ItemDB).filter(ItemDB.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item_to_response(item)

@app.post("/api/items", response_model=ItemResponse)
def create_item(item: ItemCreate, db: Session = Depends(get_db)):
    """Create new item - save to database"""
    print(f"DEBUG: Received images: {item.images}")  # Debug log
    new_item = ItemDB(
        id=str(uuid.uuid4()),
        title=item.title,
        description=item.description,
        price=item.price,
        category=item.category,
        condition=item.condition,
        seller_id=item.seller_id,
        status="available",
        location=item.location,
        is_negotiable=item.is_negotiable,
        created_date=datetime.now(),
        images=item.images if item.images else [],   # NEW: save image URLs to DB
    )
    print(f"DEBUG: Saving to DB with images: {new_item.images}")  # Debug log
    
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    
    return item_to_response(new_item)

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "database": "connected"}

# User Endpoints (Simple registration - no authentication yet)
@app.post("/api/users/register", response_model=UserResponse)
def register_user(user_data: UserRegister, db: Session = Depends(get_db)):
    """Register a new user with BU email (no authentication required)"""
    # Validate BU email
    if not validate_bu_email(user_data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email must be a @bu.edu email address"
        )
    
    # Check if user already exists
    existing_user = db.query(UserDB).filter(UserDB.email == user_data.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Validate password length
    if len(user_data.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long"
        )
    
    # Create new user
    new_user = UserDB(
        id=str(uuid.uuid4()),
        email=user_data.email.lower(),
        display_name=user_data.display_name,
        password_hash=get_password_hash(user_data.password),  # Store hashed password for security
        is_verified=True,  # Auto-verify BU emails
        bio=user_data.bio,
        rating=0.0,
        total_sales=0,
        created_date=datetime.now()
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Return user data (no token - authentication to be added later)
    return user_to_response(new_user)

@app.post("/api/users/login", response_model=UserResponse)
def login_user(credentials: UserLogin, db: Session = Depends(get_db)):
    """Login user - verify email and password"""
    # Find user by email
    user = db.query(UserDB).filter(UserDB.email == credentials.email.lower()).first()
    
    # Check if user exists
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"  # Don't reveal if email exists
        )
    
    # Verify password using the verify_password helper function
    if not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Password is correct - return user data
    return user_to_response(user)

@app.get("/api/users/{user_id}", response_model=UserResponse)
def get_user_profile(user_id: str, db: Session = Depends(get_db)):
    """Get user profile by ID (public profile)"""
    user = db.query(UserDB).filter(UserDB.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
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
