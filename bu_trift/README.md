# BUTrift - Campus Marketplace

> Boston University's trusted marketplace for sustainable student living

BUTrift is a campus marketplace platform that enables BU students to buy and sell secondhand items, promoting sustainability and affordability within the verified campus community.

## 📋 Project Overview

This project is part of **CS-411 Software Engineering** and addresses the **Sustainability** domain. The system is designed to help students reduce waste by sharing and repurposing items instead of buying new ones and throwing others away.

### Project Requirements

According to the course requirements:
- ✅ **Graphical User Interface (GUI)**: React-based web application (Mobile & Desktop compatible)
- ✅ **Backend Implementation**: Object-Oriented Classes in Python with FastAPI
- ✅ **API Integration**: Frontend connected to backend REST API
- ⏳ **Testing**: Comprehensive test coverage (TODO)

## 🚀 Current Progress

### ✅ Completed Features

#### Frontend (React + TypeScript)
- **Home Page**: Hero section, featured items, category grid, community stats
- **Browse Page**: Item listing with filtering, sorting, and search functionality (displays item images)
- **Item Details Page**: Detailed item view with image gallery (supports multiple images) and seller information
- **Sell Page**: Form to create new listings with image upload (requires authentication)
- **Login Page**: User login with Firebase Authentication
- **Register Page**: User registration with Firebase Authentication
- **Messages Page**: Conversation list and messaging interface with real-time updates via WebSocket
- **Profile Page**: User profile with listings and stats (requires authentication)

#### UI/UX
- Responsive design (Mobile & Desktop)
- Modern UI with Tailwind CSS and shadcn/ui components
- Smooth animations with Framer Motion
- Accessible components using Radix UI primitives

#### Architecture
- Entity-based data modeling (Item, User, Message, Conversation)
- Type-safe TypeScript implementation
- File-based routing with React Router v7
- Component-based architecture

#### Backend (Python + FastAPI)
- **FastAPI REST API**: High-performance Python web framework
- **SQLAlchemy ORM**: Database abstraction layer
- **SQLite Database**: Persistent data storage (development)
- **PostgreSQL Database**: Production-ready cloud database support
- **CORS Middleware**: Cross-origin resource sharing enabled (configurable)
- **Pydantic Models**: Request/response validation

#### Backend Services Implemented
- ✅ **Item Management Service**: Complete CRUD operations
  - ✅ GET all items (`/api/items`) with filtering support
  - ✅ GET item by ID (`/api/items/{item_id}`)
  - ✅ POST create item (`/api/items`) - Protected with Firebase auth
  - ✅ Database persistence with SQLite
- ✅ **User Management Service**: Complete with Firebase authentication
  - ✅ POST create profile (`/api/users/create-profile`) - Protected with Firebase
  - ✅ GET current user (`/api/users/me`) - Protected with Firebase
  - ✅ GET user by ID (`/api/users/{user_id}`) - Public
  - ✅ Firebase token verification on protected endpoints
- ✅ **Messaging Service**: Complete with real-time WebSocket support and authentication
  - ✅ Conversations CRUD (Create, Read, Update, Delete) - All protected with Firebase auth
  - ✅ Messages CRUD (Create, Read, Update, Delete) - All protected with Firebase auth
  - ✅ Real-time messaging via WebSocket (`/ws/{user_id}`) - Requires Firebase token authentication
  - ✅ Database persistence for conversations and messages
  - ✅ Authorization checks ensure users can only access their own conversations

#### Database
- ✅ **SQLite Database**: `butrift.db` file (auto-generated)
- ✅ **Items Table**: Fully implemented with schema
  - Columns: id, title, description, price, category, condition, seller_id, status, location, is_negotiable, created_date, images
- ✅ **Users Table**: Fully implemented with Firebase authentication
  - Columns: id, email, firebase_uid, display_name, is_verified, profile_image_url, bio, rating, total_sales, created_date, updated_date
- ✅ **Conversations Table**: Fully implemented
  - Columns: id, participant1_id, participant2_id, item_id, last_message_at, created_date, updated_date
- ✅ **Messages Table**: Fully implemented
  - Columns: id, conversation_id, sender_id, content, is_read, created_date

#### Frontend Integration
- ✅ **API Integration**: Frontend connected to FastAPI backend
- ✅ **Item Entity**: Calls real backend API (`http://localhost:8000/api/items`)
- ✅ **User Entity**: Calls real backend API with Firebase authentication
  - ✅ `User.register()` - Register new user with Firebase (`POST /api/users/create-profile`)
  - ✅ `User.getById()` - Get public user profile (`GET /api/users/{user_id}`)
  - ✅ `User.me()` - Get current user profile with Firebase token (`GET /api/users/me`)
- ✅ **Firebase Authentication**: Fully integrated
  - ✅ Firebase login/registration on frontend
  - ✅ Firebase token stored in localStorage
  - ✅ Protected endpoints use Firebase token verification
- ✅ **Error Handling**: Try-catch blocks for API calls
- ✅ **Image Upload**: Fully implemented
  - ✅ Image upload on sell page (`POST /api/upload-image`) - Protected with Firebase auth
  - ✅ Images stored in `backend/uploads` directory
  - ✅ Image URLs saved in database `images` column (JSON array)
  - ✅ Images displayed in item cards and item details pages
- ✅ **Messaging**: Fully implemented with real-time WebSocket support and authentication
  - ✅ Conversations CRUD operations (all protected with Firebase authentication)
  - ✅ Messages CRUD operations (all protected with Firebase authentication)
  - ✅ Real-time messaging via WebSocket (requires Firebase token authentication)
  - ✅ Frontend messaging page with live updates
  - ✅ Authorization ensures users can only access their own conversations

### ⏳ Pending Implementation

#### Backend Services
- ✅ **User Management Service**: Complete with Firebase authentication
  - ✅ User registration endpoint with Firebase (`POST /api/users/create-profile`)
  - ✅ Get current user profile (`GET /api/users/me`) - Protected with Firebase
  - ✅ Get user by ID (`GET /api/users/{user_id}`)
  - ✅ Users database table (`users` table with SQLAlchemy)
  - ✅ Firebase UID storage (`firebase_uid` column)
  - ✅ BU email validation (@bu.edu required)
  - ✅ **Firebase Authentication**: Fully implemented with token verification
- ✅ **Messaging Service**: Fully implemented with real-time support
  - ✅ Conversations CRUD (Create, Read, Update, Delete)
  - ✅ Messages CRUD (Create, Read, Update, Delete)
  - ✅ Database tables for conversations & messages
  - ✅ WebSocket support for real-time messaging
  - ✅ Connection manager for active WebSocket connections
- ✅ **Image Upload Service**: Fully implemented
  - ✅ Image upload endpoint (`POST /api/upload-image`) - Protected with Firebase
  - ✅ Image storage (local `backend/uploads` directory)
  - ✅ Image URLs stored in item records (`images` JSON column)
  - ✅ Static file serving (`/uploads` route)

#### Frontend Features
- ✅ User registration with Firebase (calls backend API)
- ✅ User login with Firebase (calls backend API)
- ✅ Register UI page
- ✅ Login UI page
- ✅ Messaging with real-time updates via WebSocket
- ✅ Replace Message mock data with API calls - **COMPLETE**
- ✅ Replace Conversation mock data with API calls - **COMPLETE**
- ✅ Implement image upload functionality - **COMPLETE**
- ⏳ Enhanced error handling and loading states

#### Testing
- [ ] Unit tests for entity classes
- [ ] Integration tests for API endpoints
- [ ] Frontend component tests
- [ ] End-to-end (E2E) tests

#### Additional Features
- [ ] Email notifications
- [ ] Push notifications for messages
- [ ] Advanced search with filters
- [ ] Item recommendations
- [ ] Rating & review system
- [ ] Payment integration (optional)

## 🛠️ Tech Stack

### Frontend
- **Framework**: React Router v7 with React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui + Radix UI
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Build Tool**: Vite

### Backend
- **Language**: Python 3.12+
- **Framework**: FastAPI
- **ORM**: SQLAlchemy
- **Database**: SQLite (development) / PostgreSQL (production ready)
- **Validation**: Pydantic
- **Server**: Uvicorn
- **Authentication**: Firebase Admin SDK
- **WebSocket**: FastAPI WebSocket support for real-time messaging

## 📁 Project Structure

```
bu_trift/
├── app/                    # Frontend (React)
│   ├── routes/              # Page routes
│   │   ├── home.tsx         # Home page
│   │   ├── items.tsx        # Browse items
│   │   ├── items.$id.tsx    # Item details
│   │   ├── sell.tsx         # Sell item form
│   │   ├── messages.tsx     # Messaging
│   │   └── profile.tsx      # User profile
│   ├── components/          # React components
│   │   ├── home/           # Home page components
│   │   ├── ui/             # Reusable UI components
│   │   └── Layout.tsx      # Main layout
│   ├── entities/           # Data models & API clients
│   │   ├── Item.ts         # Item entity (calls FastAPI)
│   │   ├── User.ts         # User entity (calls FastAPI with Firebase)
│   │   ├── Message.ts      # Message entity (calls FastAPI)
│   │   ├── Conversation.ts # Conversation entity (calls FastAPI)
│   │   └── index.ts        # Entity exports
│   ├── config/             # Configuration files
│   │   └── firebase.ts     # Firebase client configuration
│   ├── utils/              # Utility functions
│   │   └── websocket.ts    # WebSocket client for real-time messaging
│   ├── root.tsx            # Root component
│   └── app.css             # Global styles
├── backend/                # Backend (FastAPI + SQLAlchemy)
│   ├── main.py             # FastAPI app & endpoints
│   ├── database.py         # Database connection setup (supports SQLite & PostgreSQL)
│   ├── auth.py             # Firebase authentication verification
│   ├── firebase_config.py  # Firebase Admin SDK initialization (supports file & env var)
│   ├── start.sh            # Startup script for deployment (auto-creates database tables)
│   ├── models/             # Database models (SQLAlchemy)
│   │   ├── item.py         # ItemDB model
│   │   ├── user.py         # UserDB model (with firebase_uid)
│   │   ├── conversation.py # ConversationDB model
│   │   └── message.py      # MessageDB model
│   ├── uploads/            # Uploaded images (auto-generated)
│   ├── butrift.db          # SQLite database (auto-generated, local dev only)
│   ├── firebase_service.json # Firebase service account (NOT in Git - add locally)
│   └── requirement.txt     # Python dependencies (includes psycopg2-binary for PostgreSQL)
├── public/                 # Static assets
├── package.json            # Frontend dependencies
├── requirement.txt         # Python dependencies (also in backend/)
├── tsconfig.json           # TypeScript config
├── vite.config.ts          # Vite config
└── README.md
```

## 🏃 Getting Started

### Prerequisites

- **Node.js 18+** and npm
- **Python 3.12+** and pip
- **Firebase Project**: You'll need a Firebase project set up
- (Optional) Python virtual environment (recommended)

### Firebase Setup (Required)

1. **Create a Firebase Project** (if you don't have one):
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project
   - Enable Authentication → Sign-in method → Email/Password

2. **Get Firebase Service Account**:
   - Go to Project Settings → Service Accounts
   - Click "Generate new private key"
   - Save the JSON file as `backend/firebase_service.json`

3. **Get Firebase Web Config**:
   - Go to Project Settings → General
   - Scroll to "Your apps" → Web app
   - Copy the Firebase configuration object
   - The config is already in `app/config/firebase.ts` (verify it matches your project)

**Important**: `firebase_service.json` is **NOT** in Git for security. Each developer must add their own file to `backend/` directory.

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd bu_trift
```

2. Install frontend dependencies:
```bash
npm install
```

3. Install backend dependencies:
```bash
# Option 1: From project root (recommended)
pip install -r requirement.txt

# Option 2: From backend folder
cd backend
pip install -r requirement.txt
cd ..

# Note: requirement.txt exists in both root and backend/ folder
# Both contain the same dependencies
```

4. **Add Firebase Service Account File**:
   ```bash
   # Place your firebase_service.json in the backend directory
   # This file should NOT be committed to Git (already in .gitignore)
   cp /path/to/your/firebase_service.json backend/firebase_service.json
   ```

5. **Verify Firebase Configuration**:
   - Check that `app/config/firebase.ts` has your Firebase project configuration
   - Verify `backend/firebase_service.json` exists (required for backend authentication)

### Development

#### Start Backend Server

**Important**: Make sure `backend/firebase_service.json` exists before starting the backend!

Open a terminal and run:
```bash
cd backend
uvicorn main:app --reload
```

**Note**: If you see an error about `firebase_service.json` not found, add the file to `backend/` directory (see Firebase Setup above).

The API will be available at:
- **API**: `http://localhost:8000`
- **API Documentation (Swagger UI)**: `http://localhost:8000/docs`
- **Alternative API Docs (ReDoc)**: `http://localhost:8000/redoc`

**Database**: 
- **Development**: SQLite database `butrift.db` is automatically created on first run
- **Production**: Supports PostgreSQL (configured via `DATABASE_URL` environment variable)
- The database automatically detects SQLite vs PostgreSQL based on the connection string
- If upgrading from password-based auth, delete the old database file to recreate it with the new schema (includes `firebase_uid` column)

#### Start Frontend Server

Open another terminal and run:
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`.

**Important**: Both servers must be running simultaneously for the app to work.

### Building for Production

#### Frontend

Create a production build:
```bash
npm run build
```

Start the production server:
```bash
npm start
```

#### Backend

The backend uses Uvicorn for production. For deployment:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

Or use a production ASGI server like Gunicorn with Uvicorn workers.

## 📝 Development Notes

### Current State: Hybrid (Backend + Mock Data)

#### ✅ Fully Integrated with Backend
- **Item Entity** (`app/entities/Item.ts`)
  - `Item.filter()` - Calls `GET /api/items` (with fallback to mock data)
  - `Item.get()` - Calls `GET /api/items/{id}` (with fallback to mock data)
  - `Item.create()` - Calls `POST /api/items` to create items in database (with image support)
- **Image Upload** (`app/routes/sell.tsx`)
  - `handleFileUpload()` - Uploads images to `POST /api/upload-image`
  - Images saved to `backend/uploads` directory
  - Image URLs stored in database and displayed in item views

#### ✅ Fully Integrated with Backend (All Entities)
- **User Entity** (`app/entities/User.ts`)
  - `User.register()` - Creates Firebase user and backend profile
  - `User.me()` - Gets current user from backend with Firebase token
  - `User.getById()` - Gets user profile by ID
- **Conversation Entity** (`app/entities/Conversation.ts`)
  - `Conversation.filter()` - Calls `GET /api/conversations`
  - `Conversation.create()` - Calls `POST /api/conversations`
- **Message Entity** (`app/entities/Message.ts`)
  - `Message.filter()` - Calls `GET /api/messages`
  - `Message.create()` - Calls `POST /api/messages` (triggers WebSocket broadcast)
  - WebSocket client integrated for real-time updates

### API Endpoints

**Current Implemented Endpoints:**

**Item Endpoints:**
- `GET /api/items` - Get all items (supports filtering by seller_id, category, condition, status)
- `GET /api/items/{item_id}` - Get item by ID
- `POST /api/items` - Create new item (with images support, protected with Firebase, validates price > 0)

**User Endpoints (Firebase Authentication):**
- `POST /api/users/create-profile` - Create user profile (requires Firebase token) - Protected
- `GET /api/users/me` - Get current user profile (requires Firebase token) - Protected
- `GET /api/users/{user_id}` - Get public user profile by ID - Public

**Image Upload Endpoints:**
- `POST /api/upload-image` - Upload a single image file (returns URL) - Protected with Firebase, includes file validation (type, size, filename sanitization)
- `GET /uploads/{filename}` - Serve uploaded images (static files)

**Messaging Endpoints (All Protected with Firebase Authentication):**
- `POST /api/conversations` - Create a new conversation (requires auth, validates participants)
- `GET /api/conversations` - Get all conversations for a user (query param: `user_id`, requires auth, verifies user_id)
- `GET /api/conversations/{conversation_id}` - Get a specific conversation (requires auth, verifies participant)
- `PUT /api/conversations/{conversation_id}` - Update conversation (requires auth, verifies participant)
- `DELETE /api/conversations/{conversation_id}` - Delete conversation (requires auth, verifies participant)
- `PUT /api/conversations/{conversation_id}/mark-read` - Mark all messages as read (query param: `user_id`, requires auth)
- `POST /api/messages` - Create a new message (broadcasts via WebSocket, requires auth, validates content)
- `GET /api/messages` - Get all messages in a conversation (query param: `conversation_id`, requires auth, verifies participant)
- `GET /api/messages/{message_id}` - Get a specific message (requires auth, verifies participant)
- `PUT /api/messages/{message_id}` - Update a message (requires auth, verifies participant)
- `DELETE /api/messages/{message_id}` - Delete a message (requires auth, can only delete own messages)

**WebSocket Endpoints:**
- `WS /ws/{user_id}?token={firebase_token}` - WebSocket connection for real-time messaging (requires Firebase token authentication)

**Health Check:**
- `GET /` - API health check

### Database

The application supports **both SQLite (development) and PostgreSQL (production)** databases.

**Development (Local):**
- Uses SQLite database (`backend/butrift.db`) - automatically created on first run
- All data (items, users, conversations, messages) is persisted in this file
- No additional setup required

**Production (Render):**
- Uses PostgreSQL database (managed by Render)
- Automatically detects database type from `DATABASE_URL` environment variable
- Database tables are created automatically on startup via `start.sh` script
- Supports production-scale traffic and concurrent connections

**Database Schema**:
- **users** table: `id`, `email`, `firebase_uid`, `display_name`, `is_verified`, `profile_image_url`, `bio`, `rating`, `total_sales`, `created_date`, `updated_date`
- **items** table: `id`, `title`, `description`, `price`, `category`, `condition`, `seller_id`, `status`, `location`, `is_negotiable`, `created_date`, `images`
- **conversations** table: `id`, `participant1_id`, `participant2_id`, `item_id`, `last_message_at`, `created_date`, `updated_date`
- **messages** table: `id`, `conversation_id`, `sender_id`, `content`, `is_read`, `created_date`

**Important Notes**:
- The `backend/uploads/` directory for storing uploaded images is automatically created when the backend server starts
- If upgrading from password-based authentication, **delete** `backend/butrift.db` to recreate it with the new schema (includes `firebase_uid` instead of `password_hash`)
- The database file is already in `.gitignore` and should not be committed

**Viewing the Database:**

**SQLite (Local Development):**
- Use SQLite browser tools (DB Browser for SQLite)
- Use Python: `import sqlite3; conn = sqlite3.connect('backend/butrift.db')`
- Use command line: `sqlite3 backend/butrift.db`

**PostgreSQL (Production):**
- Use Render's built-in database dashboard
- Connect via PostgreSQL client using External Database URL
- Use tools like pgAdmin, DBeaver, or `psql` command-line client

### Next Steps

1. **Testing** (Priority)
   - Write unit tests for backend models
   - Write integration tests for API endpoints
   - Write frontend component tests
   - Set up CI/CD

2. **Enhanced Features**
   - Add email notifications for messages
   - Add push notifications for mobile
   - Implement advanced search with filters
   - Add item recommendations
   - Rating & review system

3. **Production Deployment** ✅
   - ✅ Set up production database (PostgreSQL) - Supported
   - ✅ Configure environment variables - Configured
   - ✅ Set up Firebase production environment - Configured
   - ✅ Deploy backend and frontend - Ready for deployment
   - See [Deployment Guide](#-deployment) section below

## 🔧 Available Scripts

### Frontend
- `npm run dev` - Start development server with HMR
- `npm run build` - Create production build
- `npm start` - Start production server
- `npm run typecheck` - Run TypeScript type checking

### Backend
- `uvicorn main:app --reload` - Start development server with auto-reload
- `uvicorn main:app --host 0.0.0.0 --port 8000` - Start production server
- `python -m pytest` - Run tests (when implemented)

## 🌐 Browser Support

- ✅ Chrome/Edge (tested)
- ✅ Safari (tested and optimized)
- ✅ Firefox (should work)

## 🔍 API Documentation

When the backend server is running, visit:
- **Swagger UI**: `http://localhost:8000/docs` - Interactive API documentation
- **ReDoc**: `http://localhost:8000/redoc` - Alternative API documentation

These provide automatic documentation for all API endpoints with the ability to test them directly in the browser.

## 🔐 Authentication & Security

### Firebase Authentication
- **Frontend**: Users sign in/register using Firebase Authentication
- **Backend**: Firebase Admin SDK verifies ID tokens on protected endpoints
- **Token Storage**: Firebase ID tokens stored in browser `localStorage`
- **Protected Endpoints**: All user-related, item creation, messaging, and WebSocket endpoints require valid Firebase token

### Security Features

#### Authentication & Authorization
- ✅ **Firebase Token Verification**: All protected endpoints verify Firebase ID tokens
- ✅ **WebSocket Authentication**: WebSocket connections require Firebase token in query parameter
- ✅ **Authorization Checks**: Users can only access their own data (conversations, messages)
- ✅ **User ID Verification**: Prevents impersonation attacks via user_id matching

#### Input Validation
- ✅ **Message Content Validation**: Empty messages rejected, 5000 character limit
- ✅ **File Upload Validation**: 
  - File type restriction (images only: jpg, jpeg, png, gif, webp)
  - File size limit (5MB maximum)
  - Filename sanitization (prevents path traversal attacks)
  - Unique filename generation (prevents overwrites)
- ✅ **Price Validation**: Items must have price > 0
- ✅ **User Existence Verification**: Prevents creating conversations with invalid users
- ✅ **Self-Conversation Prevention**: Users cannot create conversations with themselves

#### Data Integrity
- ✅ **Database Transaction Rollback**: All write operations wrapped in transactions with automatic rollback on errors
- ✅ **Prevents Partial Data**: Failed operations don't leave orphaned records
- ✅ **Session Management**: Proper database session handling for WebSocket connections (prevents connection leaks)

### Protected Endpoints

The following endpoints require a valid Firebase authentication token in the `Authorization: Bearer <token>` header:

**User Endpoints:**
- `POST /api/users/create-profile`
- `GET /api/users/me`

**Item Endpoints:**
- `POST /api/items`

**Image Upload:**
- `POST /api/upload-image`

**Messaging Endpoints (All):**
- `POST /api/conversations`
- `GET /api/conversations`
- `GET /api/conversations/{id}`
- `PUT /api/conversations/{id}`
- `DELETE /api/conversations/{id}`
- `PUT /api/conversations/{id}/mark-read`
- `POST /api/messages`
- `GET /api/messages`
- `GET /api/messages/{id}`
- `PUT /api/messages/{id}`
- `DELETE /api/messages/{id}`

**WebSocket:**
- `WS /ws/{user_id}?token={firebase_token}` - Token passed as query parameter

### Security Best Practices

- ✅ **Firebase Service Account**: Credentials (`firebase_service.json`) are **NOT** in Git
- ✅ **Sensitive Data Protection**: Each developer must add their own `firebase_service.json` file
- ✅ **No Credential Commits**: Never commit sensitive credentials to version control
- ✅ **Input Sanitization**: All user inputs validated and sanitized
- ✅ **Authorization First**: Always verify user permissions before allowing access
- ✅ **Transaction Safety**: Database operations use transactions to maintain data integrity
- ✅ **Connection Security**: WebSocket connections authenticated to prevent unauthorized access

### Recent Security Improvements

A comprehensive security audit was completed with the following enhancements:

1. **WebSocket Security**: Added Firebase token authentication to prevent unauthorized message interception
2. **Authorization**: Added checks to ensure users can only access their own conversations and messages
3. **File Upload Security**: Implemented comprehensive validation to prevent malicious file uploads
4. **Data Integrity**: Added transaction rollback to prevent partial data writes on errors
5. **Input Validation**: Enhanced validation for messages, prices, and user inputs
6. **Session Management**: Fixed WebSocket database session handling to prevent connection leaks

See `docs/COMPREHENSIVE_CHANGES_SUMMARY.md` for detailed information about all security improvements.

## 🚀 Deployment

### Production Deployment - Render

The application is **production-ready** and can be deployed to Render with full PostgreSQL and environment variable support.

#### Quick Start

1. **Follow the deployment guide**: See `docs/RENDER_DEPLOYMENT_GUIDE.md` for complete step-by-step instructions
2. **Quick checklist**: See `docs/DEPLOYMENT_CHECKLIST.md` for a fast reference

#### Key Deployment Features

✅ **Database Support:**
- Automatic detection: SQLite (local) or PostgreSQL (production)
- Database tables created automatically on startup
- Supports Render's managed PostgreSQL database

✅ **Configuration:**
- Environment variable support for all sensitive data
- Firebase credentials via environment variable (secure)
- Dynamic CORS configuration based on frontend URL
- Configurable API URLs per environment

✅ **Production-Ready:**
- Startup script automates database setup
- All security features enabled
- Error handling and validation in place
- Scalable architecture

#### Deployment Architecture

```
┌─────────────────────────────────────────┐
│         Render Platform                 │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────┐    ┌──────────────┐  │
│  │   Frontend   │    │   Backend    │  │
│  │   (Node)     │───▶│   (Python)   │  │
│  │              │    │              │  │
│  └──────────────┘    └──────┬───────┘  │
│         │                    │          │
│         │                    ▼          │
│         │           ┌──────────────┐   │
│         │           │  PostgreSQL  │   │
│         │           │   Database   │   │
│         │           └──────────────┘   │
│         │                               │
│         └─────────▶ Firebase Auth      │
│                                         │
└─────────────────────────────────────────┘
```

#### Environment Variables Required

**Backend:**
- `DATABASE_URL` - PostgreSQL connection string (from Render)
- `FIREBASE_SERVICE_ACCOUNT` - Firebase service account JSON
- `FRONTEND_URL` - Frontend URL for CORS configuration
- `API_BASE_URL` - Backend URL (optional, for file URLs)

**Frontend:**
- `VITE_API_URL` - Backend API URL

#### Deployment Steps Summary

1. **Create PostgreSQL database** on Render
2. **Deploy backend service:**
   - Environment: Python 3
   - Build: `cd backend && pip install -r requirement.txt`
   - Start: `cd backend && ./start.sh` (or use inline command)
   - Set environment variables
3. **Deploy frontend service:**
   - Environment: Node
   - Build: `npm install && npm run build`
   - Start: `npm start`
   - Set `VITE_API_URL` environment variable
4. **Configure CORS** by setting `FRONTEND_URL` in backend
5. **Test deployment** using the testing checklist

#### Important Notes

⚠️ **File Uploads:**
- Local file storage is ephemeral on Render (files lost on restart)
- Consider migrating to cloud storage (Firebase Storage, S3) for production

⚠️ **WebSocket:**
- Free tier may have limitations with persistent WebSocket connections
- Consider upgrading or implementing polling fallback

⚠️ **Sleep Mode:**
- Free tier services sleep after 15 minutes of inactivity
- First request after sleep takes ~30 seconds
- Upgrade to paid plan for always-on service

#### Deployment Documentation

For detailed deployment instructions, see:
- **Complete Guide**: `docs/RENDER_DEPLOYMENT_GUIDE.md`
- **Quick Checklist**: `docs/DEPLOYMENT_CHECKLIST.md`
- **Database URLs**: `docs/RENDER_DATABASE_URL_EXPLAINED.md`

## 📚 Resources

### Frontend
- [React Router Documentation](https://reactrouter.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [Firebase Web Documentation](https://firebase.google.com/docs/web)

### Backend
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [Pydantic Documentation](https://docs.pydantic.dev/)
- [Uvicorn Documentation](https://www.uvicorn.org/)
- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)
- [FastAPI WebSockets](https://fastapi.tiangolo.com/advanced/websockets/)

### Project Documentation
Detailed guides are available in the `docs/` folder:
- `COMPREHENSIVE_CHANGES_SUMMARY.md` - Complete summary of all security and functionality fixes
- `WEBSOCKET_AUTHENTICATION_EXPLAINED.md` - Deep dive into WebSocket authentication security
- `WEBSOCKET_DATABASE_SESSION_EXPLAINED.md` - Understanding database session management for WebSocket
- `FIREBASE_AUTH_INTEGRATION.md` - Firebase authentication integration guide
- `RENDER_DEPLOYMENT_GUIDE.md` - Complete guide for deploying to Render
- `RENDER_DATABASE_URL_EXPLAINED.md` - Understanding Render database URLs
- `DEPLOYMENT_CHECKLIST.md` - Quick deployment checklist

## 👥 Team

Kenneth Chen (U01705999) - Quality Assurance/Testing Lead & Deployment Coordinator
Minjun Kim (U18012972) - Database Administrator & Security Specialist
Jerry Teixeira (U61825071) - Frontend Developer & UI/UX Designer
Xiankun Zeng (U54725278) -Project Manager & Backend Developer

## 📄 License

[Add license information]

---

**Course**: CS-411 Software Engineering  
**Domain**: Sustainability  
**Project Type**: Campus Thrift Marketplace Application
