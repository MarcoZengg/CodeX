# API Fundamentals Explained - Beginner's Guide

## 🌐 What is an API?

**API** stands for **Application Programming Interface**.

Think of it like a **restaurant menu**:
- The **menu** (API) tells you what you can order
- You **order** (API call) what you want
- The **kitchen** (backend) prepares it
- The **waiter** (server) brings it back to you

In web development:
- **Frontend (React)** = You (the customer)
- **API** = The menu (list of available operations)
- **Backend (FastAPI)** = The kitchen (does the actual work)
- **Database** = The pantry (stores the data)

---

## 🏗️ What is a Backend?

**Backend** = The server-side part of your application that:
1. **Stores data** in a database
2. **Processes business logic** (OOP classes)
3. **Handles security** (authentication, validation)
4. **Serves data** to the frontend via API

**Your Project Structure:**
```
┌─────────────────────────────────────────┐
│         FRONTEND (React)                │
│  - What users see and interact with     │
│  - Runs in the browser                  │
│  - Located in: app/routes/, components/ │
└──────────────┬──────────────────────────┘
               │
               │ HTTP Requests (API Calls)
               │ "Hey backend, create this item!"
               │
┌──────────────▼──────────────────────────┐
│         BACKEND (FastAPI)               │
│  - Processes requests                   │
│  - Runs business logic (OOP classes)    │
│  - Saves to database                    │
│  - Returns responses                    │
│  - Located in: backend/ (to be created)  │
└──────────────┬──────────────────────────┘
               │
               │ SQL Queries
               │
┌──────────────▼──────────────────────────┐
│         DATABASE                         │
│  - Stores all items, users, messages    │
│  - PostgreSQL, MySQL, SQLite, etc.      │
└─────────────────────────────────────────┘
```

---

## 🤔 Why Do We Need API Calls?

### Problem Without API Calls (Current State)

**Right now, your app uses "mock data":**

```typescript
// In Item.ts - this is FAKE data, not real!
const mockItems: Item[] = [
  { id: "1", title: "Calculus Textbook", ... },
  { id: "2", title: "MacBook Air", ... },
];

static async get(id: string): Promise<Item> {
  const found = mockItems.find((item) => item.id === id);
  return found; // Returns fake data from memory
}
```

**Problems:**
1. ❌ Data disappears when you refresh the page
2. ❌ Data is only in your browser's memory
3. ❌ Other users can't see your items
4. ❌ No persistence - nothing is saved
5. ❌ Can't share data between devices

### Solution With API Calls

**With API calls, data is stored in a database:**

```typescript
// Frontend calls backend API
static async create(data: Partial<Item>): Promise<Item> {
  const response = await fetch('http://localhost:8000/api/items', {
    method: 'POST',
    body: JSON.stringify(data), // Send data to backend
  });
  return await response.json(); // Backend saves to database and returns it
}
```

**Benefits:**
1. ✅ Data persists in database
2. ✅ All users see the same data
3. ✅ Data survives page refreshes
4. ✅ Can access from any device
5. ✅ Secure - backend validates data

---

## 📞 What Does "Calling an API" Mean?

**"Calling an API"** = Sending a request from your frontend to your backend asking it to do something.

### Real-World Analogy

Imagine you're ordering food:

1. **You (Frontend)** say: "I want a pizza"
2. **You call the restaurant (API Call)**: Phone call to pizza place
3. **Restaurant (Backend)** receives your order
4. **Restaurant prepares pizza (Processes request)**
5. **Restaurant delivers pizza (Returns response)**
6. **You receive pizza (Frontend gets data)**

### In Code Terms

```typescript
// 1. Frontend wants to create an item
const newItem = {
  title: "MacBook Pro",
  price: 1200,
  category: "electronics"
};

// 2. Frontend "calls" the API (sends HTTP request)
const response = await fetch('http://localhost:8000/api/items', {
  method: 'POST',           // HTTP method (like "order pizza")
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(newItem)  // The data you're sending
});

// 3. Backend receives request, saves to database
// 4. Backend sends back the created item
const createdItem = await response.json();
// createdItem now has: { id: "123", title: "MacBook Pro", ... }
```

---

## 🐍 Is FastAPI the Backend?

**Yes! FastAPI IS a backend framework.**

### What is FastAPI?

**FastAPI** is a **Python web framework** for building APIs (backends).

Think of it like this:
- **Python** = The programming language
- **FastAPI** = The tool/framework that makes it easy to build APIs
- **Your code** = The actual backend logic (OOP classes)

### FastAPI vs Backend

**FastAPI = The framework/tool**
- Provides structure for your backend
- Handles HTTP requests/responses
- Makes it easy to create API endpoints

**Backend = The entire server-side application**
- FastAPI (the framework)
- Your OOP classes (business logic)
- Database connections
- All the code that runs on the server

### Example Structure

```
backend/                    ← This is your BACKEND
├── main.py                ← FastAPI app (the framework)
├── models/
│   └── item.py           ← Item class (OOP - meets course requirement!)
├── routers/
│   └── items.py          ← API endpoints (routes)
└── database.py           ← Database connection
```

**In `main.py`:**
```python
from fastapi import FastAPI

app = FastAPI()  # This creates your backend server

@app.post("/api/items")  # This is an API endpoint
def create_item(item: Item):
    # Your OOP class handles the logic
    item_service = ItemService()
    return item_service.create(item)  # OOP method call
```

**In `models/item.py`:**
```python
class Item:  # OOP Class - meets course requirement!
    def __init__(self, title, price):
        self.title = title
        self.price = price
    
    def create(self):
        # Business logic here
        # Save to database
        return self
```

---

## 🔄 Complete Flow: How API Calls Work

### Example: User Creates an Item

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: User fills out form in React (Frontend)              │
│                                                               │
│  User types:                                                 │
│  - Title: "MacBook Pro"                                      │
│  - Price: 1200                                               │
│  - Category: "electronics"                                   │
│                                                               │
│  User clicks "Publish Listing"                               │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: Frontend calls API (Item.create())                  │
│                                                               │
│  In sell.tsx:                                                │
│  await Item.create({                                         │
│    title: "MacBook Pro",                                     │
│    price: 1200,                                              │
│    category: "electronics"                                   │
│  })                                                          │
│                                                               │
│  This sends HTTP POST request to:                           │
│  http://localhost:8000/api/items                            │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼ HTTP Request
                        │ POST /api/items
                        │ Body: { title: "MacBook Pro", ... }
                        │
┌───────────────────────▼─────────────────────────────────────┐
│ STEP 3: Backend (FastAPI) receives request                 │
│                                                               │
│  In backend/routers/items.py:                               │
│  @app.post("/api/items")                                    │
│  def create_item(item: Item):                               │
│      # FastAPI automatically parses the JSON               │
│      # Now we have the item data                            │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: Backend uses OOP class (meets course requirement!) │
│                                                               │
│  In backend/models/item.py:                                 │
│  class ItemService:                                         │
│      def create(self, item_data):                           │
│          # Validate data                                    │
│          # Save to database                                 │
│          # Return created item                              │
│                                                               │
│  item_service = ItemService()  # OOP instantiation          │
│  created_item = item_service.create(item_data)              │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 5: Backend saves to database                          │
│                                                               │
│  Database.insert({                                          │
│    id: "item_123",                                          │
│    title: "MacBook Pro",                                    │
│    price: 1200,                                             │
│    created_date: "2025-01-15T10:30:00Z"                    │
│  })                                                         │
│                                                               │
│  Data is now permanently stored!                            │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 6: Backend sends response back to frontend            │
│                                                               │
│  Returns JSON:                                              │
│  {                                                          │
│    id: "item_123",                                          │
│    title: "MacBook Pro",                                    │
│    price: 1200,                                             │
│    status: "available",                                      │
│    created_date: "2025-01-15T10:30:00Z"                    │
│  }                                                          │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼ HTTP Response
                        │ Status: 201 Created
                        │ Body: { id: "item_123", ... }
                        │
┌───────────────────────▼─────────────────────────────────────┐
│ STEP 7: Frontend receives response                          │
│                                                               │
│  In Item.ts:                                                │
│  const createdItem = await response.json()                  │
│                                                               │
│  Frontend can now:                                          │
│  - Show success message                                     │
│  - Redirect to item details page                           │
│  - Update the UI                                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Concepts Summary

### 1. **API (Application Programming Interface)**
- The "menu" of available operations
- Defines what the backend can do
- Example: `/api/items` endpoint

### 2. **API Call**
- Sending a request from frontend to backend
- Like ordering from a restaurant menu
- Uses HTTP methods: GET, POST, PUT, DELETE

### 3. **Backend**
- The server-side application
- Handles business logic, database, security
- In your case: FastAPI + Python OOP classes

### 4. **FastAPI**
- A Python framework for building APIs
- Makes it easy to create backend endpoints
- Part of your backend, not the whole backend

### 5. **Why We Need It**
- **Without API**: Data only in browser memory (disappears)
- **With API**: Data in database (persists, shared, secure)

---

## 📚 Visual Summary

```
┌──────────────────────────────────────────────────────────────┐
│                    YOUR APPLICATION                           │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐         API Calls        ┌──────────────┐ │
│  │   FRONTEND   │ ◄──────────────────────► │   BACKEND    │ │
│  │   (React)    │   HTTP Requests/Responses │  (FastAPI)   │ │
│  │              │                           │              │ │
│  │ - UI/UX      │                           │ - OOP Classes│ │
│  │ - Components │                           │ - Business   │ │
│  │ - Routes     │                           │   Logic      │ │
│  │              │                           │ - Validation │ │
│  └──────────────┘                           └──────┬───────┘ │
│                                                   │          │
│                                                   │ SQL      │
│                                                   ▼          │
│                                            ┌──────────────┐ │
│                                            │  DATABASE    │ │
│                                            │              │ │
│                                            │ - Items      │ │
│                                            │ - Users      │ │
│                                            │ - Messages   │ │
│                                            └──────────────┘ │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎓 For Your Course Project

**What you need:**
1. ✅ **Frontend (React)** - You have this! ✅
2. ⏳ **Backend (FastAPI + Python OOP)** - Need to build this
3. ⏳ **Database** - Need to set this up
4. ⏳ **API Calls** - Need to implement `Item.create()`

**Why this matters:**
- Course requires: "Object-Oriented Classes in Python or Java"
- FastAPI backend = Python OOP classes ✅
- API calls = Connect frontend to backend ✅
- Database = Store data permanently ✅

---

## 💡 Quick Answer to Your Questions

**Q: Why do we need API calls?**
A: To save data permanently in a database and share it between users. Without API calls, data only exists in browser memory and disappears.

**Q: What does "calling an API" mean?**
A: Sending a request from your frontend (React) to your backend (FastAPI) asking it to do something (like save an item to the database).

**Q: Is FastAPI the backend?**
A: FastAPI is a **framework** for building backends. Your backend = FastAPI + your Python OOP classes + database.

**Q: What is the backend then?**
A: The entire server-side application that:
- Receives requests from frontend
- Processes them using OOP classes
- Saves data to database
- Returns responses to frontend

---

## 🚀 Next Steps

1. **Understand the flow**: Frontend → API Call → Backend → Database
2. **Set up FastAPI**: Create your backend server
3. **Create OOP classes**: Item, User, Message classes in Python
4. **Implement API endpoints**: `/api/items`, `/api/users`, etc.
5. **Connect frontend**: Update `Item.create()` to call your API

Need help implementing any of these steps? Let me know!

