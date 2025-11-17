from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI()

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

# Mock data (like your current Item.ts)
mock_items = [
    {
        "id": "1",
        "title": "Calculus Textbook - Stewart 8th Edition",
        "description": "Great condition, only used for one semester.",
        "price": 45,
        "category": "textbooks",
        "condition": "like_new",
        "seller_id": "student1",
        "status": "available",
        "location": "Warren Towers",
        "is_negotiable": True,
        "created_date": "2025-01-15T10:00:00Z"
    },
    {
        "id": "2",
        "title": "MacBook Air 13\" M1",
        "description": "Lightly used MacBook Air, works perfectly.",
        "price": 750,
        "category": "electronics",
        "condition": "good",
        "seller_id": "student2",
        "status": "available",
        "location": "West Campus",
        "is_negotiable": False,
        "created_date": "2025-01-14T10:00:00Z"
    }
]

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

# API Endpoints
@app.get("/")
def read_root():
    return {"message": "BUTrift API is running!"}

@app.get("/api/items", response_model=List[ItemResponse])
def get_items():
    """Get all items - using mock data"""
    return mock_items

@app.get("/api/items/{item_id}", response_model=ItemResponse)
def get_item(item_id: str):
    """Get item by ID - using mock data"""
    item = next((item for item in mock_items if item["id"] == item_id), None)
    if not item:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@app.post("/api/items", response_model=ItemResponse)
def create_item(item: ItemCreate):
    """Create new item - using mock data"""
    import uuid
    from datetime import datetime
    
    # Create new item (still mock, but simulates database)
    new_item = {
        "id": str(uuid.uuid4()),
        **item.dict(),
        "status": "available",
        "created_date": datetime.now().isoformat()
    }
    
    # Add to mock list (in real app, this would save to database)
    mock_items.append(new_item)
    
    return new_item

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "database": "not connected"}