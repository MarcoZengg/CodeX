# WebSocket Database Session Management Explained

## 🔄 What Changed and Why

### **The Change**

**BEFORE (Incorrect - Using `get_db()`):**
```python
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str, ...):
    db = next(get_db())  # ❌ WRONG APPROACH
    try:
        # ... use db ...
    finally:
        db.close()
```

**AFTER (Correct - Using `SessionLocal()` directly):**
```python
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str, ...):
    from database import SessionLocal
    db = SessionLocal()  # ✅ CORRECT APPROACH
    try:
        # ... use db ...
    finally:
        db.close()
```

---

## 🧠 Understanding `get_db()` - How It Works

### **What is `get_db()`?**

`get_db()` is a **generator function** designed for FastAPI's dependency injection system:

```python
# backend/database.py
def get_db():
    db = SessionLocal()  # Create a new database session
    try:
        yield db  # ⚠️ This is the key - it's a GENERATOR
    finally:
        db.close()  # Always close when done
```

### **How FastAPI Uses `get_db()`**

When you use `Depends(get_db)` in a regular HTTP endpoint:

```python
@app.get("/api/items")
def get_items(db: Session = Depends(get_db)):  # ✅ FastAPI manages this
    items = db.query(ItemDB).all()
    return items
    # FastAPI automatically calls db.close() when function returns
```

**What FastAPI does behind the scenes:**
1. FastAPI calls `get_db()` → returns a generator
2. FastAPI calls `next(get_db())` → gets the database session
3. Your endpoint function runs with `db` available
4. **When your function returns**, FastAPI automatically:
   - Catches any exceptions
   - Calls `db.close()` in the `finally` block
   - Handles cleanup properly

---

## ❌ Why `get_db()` Doesn't Work for WebSocket

### **Problem 1: Different Lifecycle**

**HTTP Endpoint Lifecycle:**
```
Request arrives
  → FastAPI calls get_db() generator
  → Your function runs (quickly - usually < 1 second)
  → Function returns
  → FastAPI automatically closes db session ✅
```

**WebSocket Endpoint Lifecycle:**
```
Connection opens
  → Your function starts
  → Function runs CONTINUOUSLY (could be hours!)
  → while True: loop keeps connection alive
  → Function only returns when connection closes
  → db session stays open the ENTIRE time ❌
```

### **Problem 2: Generator Behavior**

```python
# This is what get_db() actually does:
def get_db():
    db = SessionLocal()
    try:
        yield db  # ← Generator yields the session
    finally:
        db.close()  # ← Only called when generator completes

# When you do this:
db = next(get_db())
# You get the session, but the finally block won't run
# until the generator completes (which it never does)
```

**The Issue:**
- `next(get_db())` gives you the database session
- But the `finally: db.close()` won't execute until the generator is exhausted
- In a WebSocket, your function runs indefinitely
- The generator never completes, so `db.close()` never gets called automatically

### **Problem 3: FastAPI Dependency Injection**

```python
# FastAPI's Depends() system doesn't work the same way for WebSocket
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: str,
    db: Session = Depends(get_db)  # ❌ Doesn't work properly!
):
    # FastAPI doesn't automatically manage WebSocket dependencies
    # The session might not be closed correctly
```

**Why it doesn't work:**
- `Depends()` is designed for request/response lifecycle
- WebSocket connections are long-lived
- FastAPI doesn't automatically clean up WebSocket dependencies the same way

---

## 💧 What Are Connection Leaks?

### **Definition**

A **connection leak** occurs when database connections are opened but never properly closed. These connections remain open indefinitely, consuming resources and eventually exhausting the database connection pool.

### **Real-World Analogy**

Think of database connections like **library books**:

**Without Leaks (Good):**
```
1. You borrow a book (open connection)
2. You read it (use connection)
3. You return it (close connection)
4. Book is available for others ✅
```

**With Leaks (Bad):**
```
1. You borrow a book (open connection)
2. You read it (use connection)
3. You forget to return it (never close connection)
4. Book stays in your possession forever ❌
5. Eventually, library runs out of books (connection pool exhausted)
6. No one else can borrow books (server crashes)
```

---

## 🔍 Connection Leak Example

### **The Problematic Code**

```python
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str, ...):
    db = next(get_db())  # ❌ Connection opened
    
    await manager.connect(websocket, user_id)
    
    try:
        while True:  # ⚠️ This runs FOREVER (connection stays open)
            data = await websocket.receive_text()
            # Use db here...
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
    
    # ❌ Problem: If exception occurs, db.close() might not be called
    # ❌ Problem: Even if it does, the finally block from get_db() won't run
    db.close()  # This might not execute if exception occurs earlier
```

### **What Happens Over Time**

```
Time 0:00 - User A connects
  → Connection #1 opened
  → WebSocket stays open
  → Connection #1 never closed ❌

Time 0:05 - User B connects
  → Connection #2 opened
  → WebSocket stays open
  → Connection #2 never closed ❌

Time 0:10 - User C connects
  → Connection #3 opened
  → ...

... After 100 users ...

Time 5:00 - Database connection pool exhausted!
  → No more connections available
  → Server crashes
  → New users cannot connect ❌
```

### **Database Connection Pool**

Most databases have a **maximum number of concurrent connections**:

```python
# Typical database connection pool settings
MAX_CONNECTIONS = 20  # SQLite default
MAX_CONNECTIONS = 100  # PostgreSQL typical

# With connection leaks:
Active WebSocket connections: 150
Active DB connections: 150 (leaked)
Available connections: 0 ❌
Result: Server crashes
```

---

## ✅ The Correct Solution

### **Direct Session Creation**

```python
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: str,
    token: str = Query(...)
):
    # Verify token first (no DB needed yet)
    token_data = await verify_websocket_token(token)
    if not token_data:
        await websocket.close(code=1008, reason="Invalid token")
        return
    
    # ✅ Create session directly - you control the lifecycle
    from database import SessionLocal
    db = SessionLocal()
    
    try:
        # Use database for user verification
        user = db.query(UserDB).filter(
            UserDB.firebase_uid == token_data["uid"]
        ).first()
        
        if not user or user.id != user_id:
            await websocket.close(code=1008, reason="Unauthorized")
            return
        
        # Connect WebSocket
        await manager.connect(websocket, user_id)
        
        # ✅ Close database session BEFORE long-running loop
        db.close()  # We're done with DB queries for now
        db = None   # Clear reference
        
        # Long-running WebSocket connection (no DB needed)
        try:
            while True:
                data = await websocket.receive_text()
                # Handle messages - if we need DB, create a NEW session
        except WebSocketDisconnect:
            manager.disconnect(websocket, user_id)
            
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await websocket.close(code=1011, reason="Internal error")
    finally:
        # ✅ Always close database session
        if db:
            db.close()
```

### **Why This Works**

1. ✅ **Explicit Control**: You create the session when you need it
2. ✅ **Explicit Cleanup**: You close it in `finally` block (always executes)
3. ✅ **Short-Lived Sessions**: Session only open for quick DB queries
4. ✅ **No Leaks**: Session is always closed, even if errors occur

---

## 📊 Better Pattern: Separate DB Usage from WebSocket Loop

### **Optimal Implementation**

```python
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: str,
    token: str = Query(...)
):
    """WebSocket endpoint with proper session management"""
    
    # Step 1: Verify token (no DB needed)
    token_data = await verify_websocket_token(token)
    if not token_data:
        await websocket.close(code=1008, reason="Invalid token")
        return
    
    # Step 2: Verify user with SHORT-LIVED session
    from database import SessionLocal
    db = SessionLocal()
    try:
        user = db.query(UserDB).filter(
            UserDB.firebase_uid == token_data["uid"]
        ).first()
        
        if not user:
            await websocket.close(code=1008, reason="User not found")
            return
        
        if user.id != user_id:
            await websocket.close(code=1008, reason="User ID mismatch")
            return
    finally:
        # ✅ Close session immediately after verification
        db.close()
    
    # Step 3: WebSocket connection (no DB session open)
    await manager.connect(websocket, user_id)
    
    try:
        # Long-running loop - no DB session needed
        while True:
            data = await websocket.receive_text()
            # If you need DB operations here, create a NEW session:
            #   temp_db = SessionLocal()
            #   try:
            #       ... do DB work ...
            #   finally:
            #       temp_db.close()
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
```

**Benefits:**
- ✅ Database session only open during verification (milliseconds)
- ✅ No session open during long-running WebSocket loop
- ✅ If you need DB later, create a new short-lived session
- ✅ Zero connection leaks

---

## 🔬 Technical Deep Dive

### **How Generators Work**

```python
def get_db():
    print("1. Creating session")
    db = SessionLocal()
    try:
        print("2. Yielding session")
        yield db  # ← Execution pauses here
        print("4. Generator resuming")  # ← This won't run until generator completes
    finally:
        print("3. Closing session")  # ← This only runs when generator completes
        db.close()

# Usage:
gen = get_db()
print("Getting session...")
db = next(gen)  # Prints: 1, 2, pauses
# Now db is available
# But print("3. Closing session") won't happen until generator completes

# In WebSocket:
while True:  # Runs forever
    # Generator never completes!
    # finally block never executes!
```

### **Why `finally` Doesn't Execute**

```python
# What you might think happens:
db = next(get_db())
try:
    while True:
        # ...
finally:
    db.close()  # ✅ This works, but...

# The problem: get_db()'s finally block never runs!
# The generator is still "open" and waiting
```

### **SessionLocal() Direct Creation**

```python
# This is what SessionLocal() is:
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# When you call it:
db = SessionLocal()  # Creates a new session immediately
# It's just a regular object, no generator magic
# You control when it's created and closed
```

---

## 🎯 Key Differences Summary

| Aspect | `get_db()` with `Depends()` | `SessionLocal()` Direct |
|--------|----------------------------|------------------------|
| **Lifecycle** | Managed by FastAPI | Managed by you |
| **Automatic Cleanup** | ✅ Yes (for HTTP) | ❌ No (you must close) |
| **WebSocket Compatible** | ❌ No | ✅ Yes |
| **Long-Lived Connections** | ❌ Problematic | ✅ Works |
| **Control** | Limited | Full control |
| **Connection Leaks** | ❌ Possible | ✅ Preventable |

---

## ⚠️ Common Mistakes to Avoid

### **Mistake 1: Using `Depends(get_db)` in WebSocket**

```python
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(
    db: Session = Depends(get_db)  # ❌ Don't do this!
):
    # Session won't be cleaned up properly
```

### **Mistake 2: Not Closing in Finally**

```python
db = SessionLocal()
try:
    # ... use db ...
    db.close()  # ❌ If exception occurs, this won't execute
```

**Correct:**
```python
db = SessionLocal()
try:
    # ... use db ...
finally:
    db.close()  # ✅ Always executes
```

### **Mistake 3: Keeping Session Open During Loop**

```python
db = SessionLocal()
try:
    await manager.connect(websocket, user_id)
    while True:  # ❌ Session open during entire loop!
        data = await websocket.receive_text()
finally:
    db.close()
```

**Better:**
```python
db = SessionLocal()
try:
    # Do all DB work here
    user = db.query(...).first()
finally:
    db.close()  # ✅ Close before long loop

while True:  # ✅ No session open during loop
    data = await websocket.receive_text()
```

---

## 📈 Performance Impact

### **Connection Leaks: The Silent Killer**

```
Normal Operation (No Leaks):
- 10 WebSocket connections
- 10 database sessions (opened, used, closed)
- Database connection pool: 90/100 available ✅

With Leaks:
- 10 WebSocket connections
- 10 database sessions (opened, NEVER closed) ❌
- Database connection pool: 90/100 available
- After 100 connections: 0/100 available ❌
- Server crashes: Cannot accept new connections
```

### **Resource Consumption**

```
Each leaked connection:
- Memory: ~1-5 MB per connection
- Database connections: 1 per connection
- File descriptors: 1 per connection

After 50 leaked connections:
- Memory: 50-250 MB wasted
- Database: 50 connections locked
- File descriptors: 50 locked

Result: Server becomes slow, then crashes
```

---

## ✅ Best Practices

1. **Create Sessions When Needed**
   ```python
   # Only create session for DB operations
   db = SessionLocal()
   try:
       # Do DB work
   finally:
       db.close()
   ```

2. **Keep Sessions Short-Lived**
   ```python
   # ✅ Good: Session open briefly
   db = SessionLocal()
   user = db.query(UserDB).first()
   db.close()
   
   # ❌ Bad: Session open during long operation
   db = SessionLocal()
   await long_running_operation()
   db.close()
   ```

3. **Always Use try/finally**
   ```python
   db = SessionLocal()
   try:
       # Your code
   finally:
       db.close()  # Always closes
   ```

4. **For WebSocket: Close Before Loop**
   ```python
   db = SessionLocal()
   try:
       # Verify user, do DB work
   finally:
       db.close()
   
   # Now long-running WebSocket loop
   while True:
       # No DB session open
   ```

---

## 🎓 Summary

### **Why We Changed**

- ❌ `get_db()` is a generator designed for FastAPI dependency injection
- ❌ WebSocket connections are long-lived (hours, not milliseconds)
- ❌ Generator's `finally` block never executes during long-running connections
- ❌ Results in connection leaks

### **What We Changed To**

- ✅ Direct `SessionLocal()` creation
- ✅ Explicit session lifecycle control
- ✅ Close sessions in `finally` blocks
- ✅ Keep sessions short-lived
- ✅ Prevent connection leaks

### **Takeaways**

1. **`get_db()` is for HTTP endpoints**, not WebSocket
2. **Connection leaks** happen when sessions aren't closed
3. **Always use `try/finally`** to ensure cleanup
4. **Keep database sessions short-lived** - don't keep them open during long operations
5. **For WebSocket**: Verify user with short session, then close before long-running loop

---

**The key insight**: Database sessions should be **short-lived**, but WebSocket connections are **long-lived**. Don't tie them together! 🔒

