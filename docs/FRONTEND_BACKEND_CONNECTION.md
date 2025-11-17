# How to Call FastAPI from React - Complete Guide

## ✅ Implementation Complete!

I've updated your `Item.create()` method to call your FastAPI backend. Here's how it works:

## 🔄 How the Connection Works

```
React (Frontend)          FastAPI (Backend)
┌─────────────┐          ┌─────────────┐
│ Item.create()│─────────►│ /api/items  │
│             │   POST    │             │
│ fetch()     │──────────►│ POST handler│
│             │           │             │
│             │◄──────────│ JSON response│
│ returns Item│           │             │
└─────────────┘           └─────────────┘
```

## 📋 What the Code Does

### 1. Makes HTTP Request
```typescript
fetch('http://localhost:8000/api/items', {
  method: 'POST',  // HTTP method (create new item)
  headers: {
    'Content-Type': 'application/json',  // Tell backend we're sending JSON
  },
  body: JSON.stringify(data),  // Convert data to JSON string
})
```

### 2. Handles Response
```typescript
if (!response.ok) {
  // Handle errors (404, 500, etc.)
  throw new Error(...);
}

// Success! Parse JSON response
const createdItem = await response.json();
return createdItem as Item;
```

### 3. Error Handling
- Catches network errors
- Catches API errors (400, 500, etc.)
- Logs errors to console
- Re-throws errors so calling code can handle them

## 🔧 Backend Requirements

Your FastAPI backend needs to have this endpoint:

### Required: POST `/api/items` Endpoint

**`backend/main.py` should have:**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Union

app = FastAPI()

# IMPORTANT: Enable CORS so React can call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Your React app URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

@app.post("/api/items", response_model=ItemResponse)
def create_item(item: ItemCreate):
    """Create new item - receives data from React frontend"""
    import uuid
    from datetime import datetime
    
    new_item = {
        "id": str(uuid.uuid4()),
        **item.dict(),
        "status": "available",
        "created_date": datetime.now().isoformat()
    }
    
    # TODO: Save to database later
    # For now, return the created item
    
    return new_item
```

## ⚠️ Important: CORS Configuration

**CORS (Cross-Origin Resource Sharing)** is required!

Without CORS, your React app (running on `localhost:5173`) cannot call your FastAPI backend (running on `localhost:8000`) because they're on different "origins" (different ports).

**Make sure your backend has:**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Your React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## 🚀 Testing the Connection

### Step 1: Start FastAPI Backend

```bash
cd backend
uvicorn main:app --reload
```

**Should see:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### Step 2: Start React Frontend

```bash
npm run dev
```

**Should see:**
```
VITE v5.x.x ready in xxx ms
➜  Local:   http://localhost:5173/
```

### Step 3: Test the Connection

1. Go to `http://localhost:5173/sell`
2. Fill out the form
3. Click "Publish Listing"
4. **It should work!** The item will be created via the FastAPI backend

### Step 4: Verify in Backend

1. Open `http://localhost:8000/docs`
2. Test the POST endpoint manually
3. See the API documentation

## 🐛 Troubleshooting

### Error: "Failed to fetch"

**Problem:** Backend not running or wrong URL

**Solution:**
- Make sure FastAPI is running: `uvicorn main:app --reload`
- Check URL is correct: `http://localhost:8000/api/items`
- Check CORS is configured

### Error: "CORS policy" error

**Problem:** CORS not configured in backend

**Solution:**
- Add CORS middleware to `main.py`
- Make sure `allow_origins` includes your React URL

### Error: "404 Not Found"

**Problem:** Backend endpoint doesn't exist or wrong path

**Solution:**
- Check backend has `@app.post("/api/items")`
- Verify URL matches: `http://localhost:8000/api/items`

### Error: "422 Unprocessable Entity"

**Problem:** Data format doesn't match backend schema

**Solution:**
- Check frontend sends all required fields
- Verify field names match backend model
- Check data types match (string, number, etc.)

## 📊 Data Flow

### Frontend (React)
```typescript
// User fills form in sell.tsx
const formData = {
  title: "MacBook Pro",
  price: 1200,
  category: "electronics",
  // ... etc
};

// Calls Item.create()
await Item.create(formData);
```

### Backend (FastAPI)
```python
# Receives POST request at /api/items
# FastAPI automatically:
# 1. Parses JSON body
# 2. Validates against ItemCreate model
# 3. Calls create_item() function
# 4. Returns ItemResponse
```

### Response
```typescript
// Frontend receives:
{
  id: "uuid-here",
  title: "MacBook Pro",
  price: 1200,
  status: "available",
  created_date: "2025-01-15T10:00:00Z",
  // ... etc
}
```

## 💡 Pro Tips

### 1. Use Environment Variables

**Create `.env` file:**
```env
VITE_API_URL=http://localhost:8000
```

**Update `Item.ts`:**
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

static async create(data: Partial<Item>): Promise<Item> {
  const response = await fetch(`${API_URL}/api/items`, {
    // ...
  });
}
```

### 2. Create API Utility Function

**Create `app/utils/api.ts`:**
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `API Error: ${response.statusText}`);
  }

  return response.json();
}
```

**Use it in `Item.ts`:**
```typescript
import { apiRequest } from '@/utils/api';

static async create(data: Partial<Item>): Promise<Item> {
  return apiRequest('/api/items', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
```

### 3. Add Loading States

**In `sell.tsx`:**
```typescript
const [isSubmitting, setIsSubmitting] = useState(false);

const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  setIsSubmitting(true);
  
  try {
    await Item.create(formData);
    // Success!
  } catch (error) {
    // Handle error
  } finally {
    setIsSubmitting(false);
  }
};
```

## ✅ Summary

**What we did:**
1. ✅ Implemented `fetch()` call in `Item.create()`
2. ✅ Added error handling
3. ✅ Configured to call `http://localhost:8000/api/items`

**What you need:**
1. ✅ FastAPI backend running on port 8000
2. ✅ POST `/api/items` endpoint
3. ✅ CORS middleware configured
4. ✅ Matching data schema

**Test it:**
1. Start backend: `uvicorn main:app --reload`
2. Start frontend: `npm run dev`
3. Go to `/sell` page
4. Submit form
5. Should work! 🎉

---

Need help updating your backend to match? Let me know!

