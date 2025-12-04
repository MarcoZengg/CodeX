#!/bin/bash
# Startup script for Render deployment
# Initializes database tables and starts the FastAPI server

# Initialize database tables
# Import all models first so SQLAlchemy knows about them
python -c "
from models.item import ItemDB
from models.user import UserDB
from models.conversation import ConversationDB
from models.message import MessageDB
from models.buy_request import BuyRequestDB
from models.transaction import TransactionDB
from database import Base, engine
Base.metadata.create_all(bind=engine)
print('Database tables created successfully')
"

# Start the server
uvicorn main:app --host 0.0.0.0 --port $PORT

