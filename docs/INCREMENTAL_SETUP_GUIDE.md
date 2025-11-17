# Incremental Setup Guide: FastAPI First, Database Later

## ✅ YES! You Can (And Should) Do It Incrementally!

**Recommended Approach:**
1. ✅ Set up FastAPI backend first
2. ✅ Create API endpoints with mock data
3. ✅ Connect frontend to backend
4. ✅ Test everything works
5. ✅ Add database later

**Why this is better:**
- 🎯 Learn one thing at a time
- 🐛 Easier to debug (isolate problems)
- ✅ Test each step before moving on
- 🚀 See progress faster
- 📚 Less overwhelming

---

## 🎯 Development Strategy: Incremental Approach

### Phase 1: FastAPI Setup (No Database) ⭐ START HERE

**Goal:** Get FastAPI running with mock data

**What you'll have:**
- ✅ FastAPI server running
- ✅ API endpoints working
- ✅ Mock data (like your current frontend)
- ✅ Frontend can call backend
- ✅ Everything works end-to-end

**Time:** 1-2 hours

### Phase 2: Add Database (Later)

**Goal:** Replace mock data with real database

**What you'll do:**
- ✅ Install SQLAlchemy
- ✅ Create database models
- ✅ Connect to SQLite
- ✅ Replace mock functions with database queries

**Time:** 2-3 hours

---

## 📋 Phase 1: FastAPI Setup (No Database)

### Step 1: Install FastAPI

```bash
# Create backend directory
mkdir backend
cd backend

# Install FastAPI (Official Recommended Way)
pip install "fastapi[standard]"
```

**Why `fastapi[standard]` instead of `fastapi uvicorn`?**

The official `fastapi[standard]` includes:
- ✅ `fastapi` - The framework itself
- ✅ `uvicorn[standard]` - Server with performance optimizations
- ✅ `email-validator` - Email validation
- ✅ `httpx` - For testing (TestClient)
- ✅ `jinja2` - Template support
- ✅ `python-multipart` - Form parsing
- ✅ `fastapi-cli` - Command-line tools

**Alternative (minimal):**
```bash
pip install fastapi uvicorn  # Works, but missing optional features
```

**Use the official way** - it includes everything you'll need!

### Step 2: Create Basic FastAPI App

**Note on Type Hints:** For Python < 3.10, use `Union[SomeType, None]` instead of `Optional[SomeType]` for clarity. `Union[str, None]` is more explicit and less misleading than `Optional[str]`. For Python 3.10+, you can use `str | None` which is even cleaner.

**`backend/main.py`**
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Union

app = FastAPI()

# Allow frontend to call backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Your React app
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
    location: Union[str, None] = None
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
    location: Union[str, None] = None
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
```

### Step 3: Run FastAPI Server

```bash
cd backend
uvicorn main:app --reload
```

**Server runs at:** `http://localhost:8000`

**Test it:**
- Open browser: `http://localhost:8000`
- API docs: `http://localhost:8000/docs` (automatic Swagger UI!)

### Step 4: Update Frontend to Call Backend

**`app/entities/Item.ts`**
```typescript
static async create(data: Partial<Item>): Promise<Item> {
  try {
    const response = await fetch('http://localhost:8000/api/items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to create item: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating item:', error);
    throw error;
  }
}

static async filter(
  filters: Partial<Item>,
  sortBy?: string,
  limit?: number
): Promise<Item[]> {
  try {
    // Build query string
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.category) params.append('category', filters.category);
    
    const response = await fetch(`http://localhost:8000/api/items?${params}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch items: ${response.statusText}`);
    }
    
    let items = await response.json();
    
    // Apply client-side filtering/sorting (or move to backend later)
    if (filters.condition) {
      items = items.filter(item => item.condition === filters.condition);
    }
    
    if (sortBy === "-created_date") {
      items.sort((a, b) => 
        new Date(b.created_date).getTime() - new Date(a.created_date).getTime()
      );
    }
    
    if (limit) {
      items = items.slice(0, limit);
    }
    
    return items;
  } catch (error) {
    console.error('Error fetching items:', error);
    throw error;
  }
}

static async get(id: string): Promise<Item> {
  try {
    const response = await fetch(`http://localhost:8000/api/items/${id}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch item: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching item:', error);
    throw error;
  }
}
```

### Step 5: Test Everything Works

1. **Start FastAPI:**
   ```bash
   cd backend
   uvicorn main:app --reload
   ```

2. **Start React app:**
   ```bash
   npm run dev
   ```

3. **Test:**
   - Go to `http://localhost:5173/sell`
   - Fill out form
   - Submit
   - Should work! (data saved in memory)

**✅ You now have:**
- FastAPI backend running
- Frontend connected to backend
- API calls working
- Everything functional (with mock data)

---

## 📋 Phase 2: Add Database (Later)

Once Phase 1 works, add database:

### Step 1: Install SQLAlchemy

```bash
pip install sqlalchemy
```

### Step 2: Create Database Connection

**`backend/database.py`** (new file)
```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

SQLALCHEMY_DATABASE_URL = "sqlite:///./butrift.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### Step 3: Create Database Model

**`backend/models/item.py`** (new file)
```python
from sqlalchemy import Column, String, Float, Boolean, DateTime
from sqlalchemy.sql import func
from database import Base

class ItemDB(Base):
    __tablename__ = "items"
    
    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String)
    price = Column(Float, nullable=False)
    category = Column(String, nullable=False)
    condition = Column(String, nullable=False)
    seller_id = Column(String, nullable=False)
    status = Column(String, default="available")
    location = Column(String)
    is_negotiable = Column(Boolean, default=False)
    created_date = Column(DateTime, server_default=func.now())
```

### Step 4: Update main.py to Use Database

**Replace mock data with database:**

```python
from fastapi import Depends
from sqlalchemy.orm import Session
from database import get_db, engine, Base
from models.item import ItemDB

# Create tables
Base.metadata.create_all(bind=engine)

# Remove mock_items list

@app.get("/api/items", response_model=List[ItemResponse])
def get_items(db: Session = Depends(get_db)):
    """Get all items - from database"""
    items = db.query(ItemDB).all()
    return items

@app.post("/api/items", response_model=ItemResponse)
def create_item(item: ItemCreate, db: Session = Depends(get_db)):
    """Create new item - save to database"""
    import uuid
    from datetime import datetime
    
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
    
    return new_item
```

**That's it!** Your API now uses a real database.

---

## 🎯 Why Incremental Approach is Better

### ✅ Advantages

1. **Learn Step by Step**
   - Understand FastAPI first
   - Then learn database
   - Less overwhelming

2. **Easier Debugging**
   - If something breaks, you know where
   - FastAPI issue? Check FastAPI code
   - Database issue? Check database code

3. **Faster Progress**
   - See results quickly
   - Working API in 1-2 hours
   - Motivation boost!

4. **Test Each Layer**
   - Test API endpoints first
   - Then test database separately
   - Isolate problems

5. **Flexibility**
   - Can change database later
   - Can test different databases
   - Not locked in

### ❌ All-at-Once Problems

1. **Too Much at Once**
   - FastAPI + Database + Models + Queries
   - Overwhelming
   - Hard to debug

2. **Harder to Debug**
   - Is it FastAPI? Database? Connection?
   - Don't know where problem is

3. **Slower Progress**
   - Takes longer to see results
   - More frustrating

---

## 📅 Recommended Timeline

### Week 1: FastAPI Setup
- ✅ Day 1-2: Set up FastAPI
- ✅ Day 3-4: Create API endpoints with mock data
- ✅ Day 5: Connect frontend to backend
- ✅ Day 6-7: Test and fix issues

### Week 2: Add Database
- ✅ Day 1-2: Learn SQLAlchemy basics
- ✅ Day 3-4: Create database models
- ✅ Day 5: Replace mock data with database
- ✅ Day 6-7: Test and optimize

---

## 🚀 Quick Start: FastAPI First

### 1. Create Backend Directory

```bash
cd /Users/rsc_/Documents/BU/Fall_2025/CS-411/Project/CodeX/bu_trift
mkdir backend
cd backend
```

### 2. Install FastAPI

```bash
# Official recommended way (includes all standard dependencies)
pip install "fastapi[standard]"
```

**Note:** The quotes are important! They tell pip to install the "standard" extra dependencies.

### 3. Create `main.py` (use code from Step 2 above)

### 4. Run Server

```bash
uvicorn main:app --reload
```

### 5. Test

- Open: `http://localhost:8000/docs`
- See automatic API documentation!
- Test endpoints right there

### 6. Update Frontend

- Update `Item.ts` to call `http://localhost:8000/api/items`

**Done!** You have a working backend (with mock data).

---

## 💡 Pro Tips

1. **Use Mock Data First**
   - Get everything working
   - Then swap to database
   - Much easier!

2. **Test API Separately**
   - Use `/docs` endpoint
   - Test all endpoints
   - Make sure they work

3. **Version Control**
   - Commit after Phase 1 works
   - Then add database
   - Can rollback if needed

4. **Documentation**
   - FastAPI auto-generates docs
   - Use `/docs` endpoint
   - Shows all endpoints

---

## 🎓 Summary

**YES - Set up FastAPI first, database later!**

**Recommended Path:**
1. ✅ FastAPI + Mock Data (1-2 hours)
2. ✅ Connect Frontend (30 minutes)
3. ✅ Test Everything (1 hour)
4. ✅ Add Database Later (2-3 hours)

**Benefits:**
- Learn incrementally
- Easier debugging
- Faster progress
- Less overwhelming

**Start with FastAPI now, add database when you're ready!**

---

Need help setting up FastAPI first? I can create the initial backend structure for you!

