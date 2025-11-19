from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session
from database import get_db, engine, Base
from models.item import ItemDB
from models.user import UserDB
import bcrypt
import uuid
from datetime import datetime

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

# Create tables
Base.metadata.create_all(bind=engine)

origins=[
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
        "created_date": item.created_date.isoformat() if item.created_date else datetime.now().isoformat()
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

def validate_bu_email(email: str) -> bool:
    """Validate that email ends with @bu.edu"""
    return email.lower().endswith("@bu.edu")

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
        created_date=datetime.now()
    )
    
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