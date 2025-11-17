# How to Connect Backend to Database - Complete Guide

## 🎯 Quick Answer

**API calls are NOT used to connect backend to database!**

- **API calls** = Frontend ↔ Backend communication
- **Database connection** = Backend ↔ Database (direct connection using a library)

## 📊 Architecture Overview

```
┌──────────────┐         API Calls         ┌──────────────┐
│   FRONTEND   │ ◄──────────────────────► │   BACKEND    │
│   (React)    │   HTTP Requests/Responses │  (FastAPI)   │
└──────────────┘                           └──────┬───────┘
                                                  │
                                                  │ Direct Connection
                                                  │ (NOT API calls!)
                                                  │ Uses database driver
                                                  ▼
                                          ┌──────────────┐
                                          │  DATABASE    │
                                          │              │
                                          │ - SQLite     │
                                          │ - PostgreSQL │
                                          │ - MySQL      │
                                          └──────────────┘
```

## 🔑 Key Concept: Two Different Connections

### 1. Frontend → Backend (API Calls)
- **What**: HTTP requests (GET, POST, PUT, DELETE)
- **How**: `fetch()` or `axios` in React
- **Purpose**: Send data from browser to server
- **Example**: `fetch('http://localhost:8000/api/items')`

### 2. Backend → Database (Direct Connection)
- **What**: Database queries (SQL)
- **How**: Database driver/library (SQLAlchemy, psycopg2, etc.)
- **Purpose**: Save/retrieve data from database
- **Example**: `db.execute("INSERT INTO items ...")`

**These are completely different!**

---

## 🗄️ Database Connection Methods

### Option 1: SQLite (Easiest - Recommended for Learning) ⭐

**Why SQLite?**
- ✅ No separate server needed
- ✅ Database is just a file
- ✅ Perfect for development
- ✅ Easy to set up
- ✅ Good for course projects

**How it works:**
```python
# Backend connects directly to SQLite file
import sqlite3

# Direct connection - no API calls!
conn = sqlite3.connect('butrift.db')
cursor = conn.cursor()
cursor.execute("INSERT INTO items ...")
conn.commit()
```

**Setup:**
```bash
# No installation needed! SQLite comes with Python
pip install sqlalchemy  # ORM (makes it easier)
```

---

### Option 2: PostgreSQL (Production-Ready)

**Why PostgreSQL?**
- ✅ Industry standard
- ✅ Handles multiple users well
- ✅ More features
- ✅ Better for production

**How it works:**
```python
# Backend connects directly to PostgreSQL server
import psycopg2

# Direct connection - no API calls!
conn = psycopg2.connect(
    host="localhost",
    database="butrift",
    user="postgres",
    password="password"
)
cursor = conn.cursor()
cursor.execute("INSERT INTO items ...")
conn.commit()
```

**Setup:**
```bash
# Install PostgreSQL server
# Then install Python driver
pip install psycopg2-binary
# OR use SQLAlchemy (recommended)
pip install sqlalchemy psycopg2-binary
```

---

### Option 3: MySQL

**Similar to PostgreSQL**, uses direct connection:
```python
import mysql.connector

# Direct connection - no API calls!
conn = mysql.connector.connect(
    host="localhost",
    database="butrift",
    user="root",
    password="password"
)
```

---

## 💻 Complete Example: FastAPI + SQLite

### Step 1: Install Dependencies

```bash
pip install fastapi uvicorn sqlalchemy
```

### Step 2: Create Database Connection (`backend/database.py`)

```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# SQLite database file (creates butrift.db in your project)
SQLALCHEMY_DATABASE_URL = "sqlite:///./butrift.db"

# Create engine - THIS IS THE DATABASE CONNECTION
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False}  # Needed for SQLite
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

# Function to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

**Key Point**: This is a **direct connection**, not an API call!

### Step 3: Create Database Model (`backend/models/item.py`)

```python
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime
from sqlalchemy.sql import func
from database import Base

class ItemDB(Base):  # OOP Class - meets course requirement!
    __tablename__ = "items"
    
    # OOP attributes
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
    
    # OOP methods
    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "price": self.price,
            # ... etc
        }
```

### Step 4: Create OOP Service Class (`backend/services/item_service.py`)

```python
from sqlalchemy.orm import Session
from models.item import ItemDB
import uuid
from datetime import datetime

class ItemService:  # OOP Class - meets course requirement!
    
    def __init__(self, db: Session):
        self.db = db  # Database session (direct connection!)
    
    def create(self, item_data: dict) -> ItemDB:
        """Create a new item - OOP method"""
        # Create new item instance
        new_item = ItemDB(
            id=str(uuid.uuid4()),  # Generate unique ID
            title=item_data["title"],
            description=item_data["description"],
            price=item_data["price"],
            category=item_data["category"],
            condition=item_data["condition"],
            seller_id=item_data["seller_id"],
            status="available",
            location=item_data.get("location"),
            is_negotiable=item_data.get("is_negotiable", False),
            created_date=datetime.now()
        )
        
        # Save to database - DIRECT CONNECTION, NOT API CALL!
        self.db.add(new_item)
        self.db.commit()
        self.db.refresh(new_item)
        
        return new_item
    
    def get_all(self) -> list[ItemDB]:
        """Get all items - OOP method"""
        # Query database - DIRECT CONNECTION!
        return self.db.query(ItemDB).all()
    
    def get_by_id(self, item_id: str) -> ItemDB:
        """Get item by ID - OOP method"""
        # Query database - DIRECT CONNECTION!
        return self.db.query(ItemDB).filter(ItemDB.id == item_id).first()
```

### Step 5: Create API Endpoint (`backend/routers/items.py`)

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from services.item_service import ItemService
from pydantic import BaseModel

router = APIRouter()

class ItemCreate(BaseModel):
    title: str
    description: str
    price: float
    category: str
    condition: str
    seller_id: str
    location: str = None
    is_negotiable: bool = False

@router.post("/api/items")
def create_item(
    item: ItemCreate,
    db: Session = Depends(get_db)  # Get database connection
):
    """API endpoint - receives request from frontend"""
    
    # Create service instance (OOP)
    item_service = ItemService(db)
    
    # Call OOP method - this connects to database directly!
    created_item = item_service.create(item.dict())
    
    return created_item.to_dict()
```

### Step 6: Initialize Database (`backend/main.py`)

```python
from fastapi import FastAPI
from database import engine, Base
from routers import items

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI()
app.include_router(items.router)

@app.get("/")
def read_root():
    return {"message": "BUTrift API"}
```

### Step 7: Run Your Backend

```bash
uvicorn main:app --reload
```

---

## 🔄 Complete Flow: Frontend → Backend → Database

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Frontend calls API (HTTP Request)                 │
│                                                              │
│  React:                                                     │
│  fetch('http://localhost:8000/api/items', {                │
│    method: 'POST',                                          │
│    body: JSON.stringify({ title: "MacBook", price: 1200 })   │
│  })                                                         │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼ HTTP Request
                        │
┌───────────────────────▼─────────────────────────────────────┐
│ STEP 2: Backend receives API call                          │
│                                                              │
│  FastAPI endpoint:                                          │
│  @router.post("/api/items")                                 │
│  def create_item(item: ItemCreate, db: Session):            │
│      item_service = ItemService(db)  # OOP instantiation     │
│      return item_service.create(item.dict())                 │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼ Direct Database Connection
                        │ (NOT an API call!)
                        │ Uses SQLAlchemy session
                        │
┌───────────────────────▼─────────────────────────────────────┐
│ STEP 3: OOP Service connects to database                   │
│                                                              │
│  ItemService.create():                                      │
│      new_item = ItemDB(...)  # OOP object                  │
│      db.add(new_item)        # Direct SQL operation         │
│      db.commit()             # Save to database            │
│                                                              │
│  This executes SQL:                                         │
│  INSERT INTO items (title, price, ...)                      │
│  VALUES ('MacBook', 1200, ...)                             │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼ SQL Query
                        │
┌───────────────────────▼─────────────────────────────────────┐
│ STEP 4: Database stores data                                │
│                                                              │
│  SQLite file: butrift.db                                     │
│  ┌─────────────────────────┐                               │
│  │ items table             │                               │
│  ├─────────────────────────┤                               │
│  │ id  │ title  │ price   │                               │
│  ├─────┼─────────┼─────────┤                               │
│  │ 123 │ MacBook │ 1200    │ ← New row inserted!           │
│  └─────────────────────────┘                               │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼ Response
                        │
┌───────────────────────▼─────────────────────────────────────┐
│ STEP 5: Backend returns response to frontend                │
│                                                              │
│  Returns JSON:                                              │
│  { id: "123", title: "MacBook", price: 1200, ... }         │
└─────────────────────────────────────────────────────────────┘
```

---

## 📚 Database Connection Libraries

### For Python/FastAPI:

1. **SQLAlchemy** (Recommended) ⭐
   - **What**: ORM (Object-Relational Mapping)
   - **Why**: Makes database operations easier, more Pythonic
   - **Docs**: https://docs.sqlalchemy.org/
   - **Install**: `pip install sqlalchemy`

2. **psycopg2** (PostgreSQL only)
   - **What**: Direct PostgreSQL driver
   - **Why**: Fast, direct connection
   - **Install**: `pip install psycopg2-binary`

3. **sqlite3** (SQLite only)
   - **What**: Built into Python
   - **Why**: No installation needed
   - **Docs**: https://docs.python.org/3/library/sqlite3.html

### For Java/Spring Boot:

1. **Spring Data JPA**
   - **What**: ORM for Java
   - **Docs**: https://spring.io/projects/spring-data-jpa

2. **JDBC**
   - **What**: Direct database connection
   - **Docs**: https://docs.oracle.com/javase/tutorial/jdbc/

---

## 🎯 Key Differences

| Aspect | Frontend → Backend | Backend → Database |
|--------|-------------------|-------------------|
| **Method** | API calls (HTTP) | Direct connection (SQL) |
| **Protocol** | HTTP/HTTPS | Database protocol (SQL) |
| **Library** | `fetch()` or `axios` | SQLAlchemy, psycopg2, etc. |
| **Format** | JSON | SQL queries |
| **Example** | `fetch('/api/items')` | `db.query(Item).all()` |

---

## 🚀 Quick Start Guide

### For SQLite (Easiest):

1. **Install dependencies:**
```bash
pip install fastapi uvicorn sqlalchemy
```

2. **Create `backend/database.py`** (see example above)

3. **Create `backend/models/item.py`** (see example above)

4. **Create `backend/services/item_service.py`** (see example above)

5. **Create `backend/routers/items.py`** (see example above)

6. **Create `backend/main.py`** (see example above)

7. **Run:**
```bash
cd backend
uvicorn main:app --reload
```

8. **Database file created automatically**: `butrift.db`

---

## ❓ Common Questions

### Q: Do I need API calls to connect to database?
**A: NO!** Backend connects directly using database drivers (SQLAlchemy, etc.)

### Q: Can frontend connect directly to database?
**A: NO!** Frontend can only connect to backend via API calls. Backend connects to database.

### Q: Why can't frontend connect directly?
**A: Security!** 
- Database credentials would be exposed
- No validation/authentication
- SQL injection risks
- Backend provides security layer

### Q: What's the difference between API and database connection?
**A:**
- **API**: Frontend ↔ Backend (HTTP, JSON)
- **Database**: Backend ↔ Database (SQL, direct connection)

---

## 🎓 For Your Course Project

**What you need:**

1. ✅ **Frontend (React)** - You have this
2. ⏳ **Backend (FastAPI)** - Need to build
3. ⏳ **Database (SQLite/PostgreSQL)** - Need to set up
4. ⏳ **Database Connection** - Use SQLAlchemy (direct connection)
5. ⏳ **API Endpoints** - Connect frontend to backend (API calls)

**Architecture:**
```
React → API Call → FastAPI → Direct DB Connection → SQLite/PostgreSQL
```

---

## 📖 Official Documentation

1. **SQLAlchemy Tutorial**
   - https://docs.sqlalchemy.org/en/20/tutorial/
   - Learn how to connect to databases

2. **FastAPI + SQLAlchemy**
   - https://fastapi.tiangolo.com/tutorial/sql-databases/
   - Complete example

3. **SQLite Python**
   - https://docs.python.org/3/library/sqlite3.html
   - Built-in database

4. **PostgreSQL Python**
   - https://www.postgresql.org/docs/
   - Production database

---

## 💡 Summary

- **API calls** = Frontend ↔ Backend (HTTP requests)
- **Database connection** = Backend ↔ Database (direct SQL connection)
- **Use SQLAlchemy** for Python database connections
- **SQLite** is easiest for learning/development
- **PostgreSQL** is better for production

**No API calls needed for database connection!** Backend connects directly using database libraries.

Need help setting up the database connection? Let me know!

