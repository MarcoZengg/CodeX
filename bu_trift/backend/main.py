from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session
from database import get_db, engine, Base
from models.item import ItemDB
from models.user import UserDB
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
