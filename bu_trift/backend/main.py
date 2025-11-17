from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session
from database import get_db, engine, Base
from models.item import ItemDB
import uuid
from datetime import datetime

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

# API Endpoints
@app.get("/")
def read_root():
    return {"message": "BUTrift API is running!"}

@app.get("/api/items", response_model=List[ItemResponse])
def get_items(db: Session = Depends(get_db)):
    """Get all items - from database"""
    items = db.query(ItemDB).all()
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