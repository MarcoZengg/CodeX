#!/bin/bash
# Startup script for Render deployment
# Initializes database tables and starts the FastAPI server

# Initialize database tables
python -c "from database import Base, engine; Base.metadata.create_all(bind=engine)"

# Start the server
uvicorn main:app --host 0.0.0.0 --port $PORT

