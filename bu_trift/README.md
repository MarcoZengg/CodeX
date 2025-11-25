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
- **SQLite Database**: Persistent data storage
- **CORS Middleware**: Cross-origin resource sharing enabled
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
- ✅ **Messaging Service**: Complete with real-time WebSocket support
  - ✅ Conversations CRUD (Create, Read, Update, Delete)
  - ✅ Messages CRUD (Create, Read, Update, Delete)
  - ✅ Real-time messaging via WebSocket (`/ws/{user_id}`)
  - ✅ Database persistence for conversations and messages

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
- ✅ **Messaging**: Fully implemented with real-time WebSocket support
  - ✅ Conversations CRUD operations
  - ✅ Messages CRUD operations
  - ✅ Real-time messaging via WebSocket
  - ✅ Frontend messaging page with live updates

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
│   ├── database.py         # Database connection setup
│   ├── auth.py             # Firebase authentication verification
│   ├── firebase_config.py  # Firebase Admin SDK initialization
│   ├── models/             # Database models (SQLAlchemy)
│   │   ├── item.py         # ItemDB model
│   │   ├── user.py         # UserDB model (with firebase_uid)
│   │   ├── conversation.py # ConversationDB model
│   │   └── message.py      # MessageDB model
│   ├── uploads/            # Uploaded images (auto-generated)
│   ├── butrift.db          # SQLite database (auto-generated)
│   ├── firebase_service.json # Firebase service account (NOT in Git - add locally)
│   └── requirement.txt     # Python dependencies (also at root)
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

**Database**: The database `butrift.db` will be automatically created on first run. If you're upgrading from password-based auth, delete the old database file to recreate it with the new schema (includes `firebase_uid` column).

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
- `POST /api/items` - Create new item (with images support)

**User Endpoints (Firebase Authentication):**
- `POST /api/users/create-profile` - Create user profile (requires Firebase token) - Protected
- `GET /api/users/me` - Get current user profile (requires Firebase token) - Protected
- `GET /api/users/{user_id}` - Get public user profile by ID - Public

**Image Upload Endpoints:**
- `POST /api/upload-image` - Upload a single image file (returns URL) - Protected with Firebase
- `GET /uploads/{filename}` - Serve uploaded images (static files)

**Messaging Endpoints:**
- `POST /api/conversations` - Create a new conversation
- `GET /api/conversations` - Get all conversations for a user (query param: `user_id`)
- `GET /api/conversations/{conversation_id}` - Get a specific conversation
- `PUT /api/conversations/{conversation_id}` - Update conversation
- `DELETE /api/conversations/{conversation_id}` - Delete conversation
- `PUT /api/conversations/{conversation_id}/mark-read` - Mark all messages as read (query param: `user_id`)
- `POST /api/messages` - Create a new message (broadcasts via WebSocket)
- `GET /api/messages` - Get all messages in a conversation (query param: `conversation_id`)
- `GET /api/messages/{message_id}` - Get a specific message
- `PUT /api/messages/{message_id}` - Update a message
- `DELETE /api/messages/{message_id}` - Delete a message

**WebSocket Endpoints:**
- `WS /ws/{user_id}` - WebSocket connection for real-time messaging

**Health Check:**
- `GET /` - API health check

### Database

The SQLite database (`backend/butrift.db`) is automatically created when you first run the backend server. All data (items, users, conversations, messages) is persisted in this file.

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
- Use SQLite browser tools (DB Browser for SQLite)
- Use Python: `import sqlite3; conn = sqlite3.connect('backend/butrift.db')`
- Use command line: `sqlite3 backend/butrift.db`

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

3. **Production Deployment**
   - Set up production database (PostgreSQL)
   - Configure environment variables
   - Set up Firebase production environment
   - Deploy backend and frontend

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
- **Protected Endpoints**: All user-related and item creation endpoints require valid Firebase token

### Protected Endpoints
The following endpoints require a valid Firebase authentication token in the `Authorization: Bearer <token>` header:
- `POST /api/users/create-profile`
- `GET /api/users/me`
- `POST /api/upload-image`
- `POST /api/items`
- `WS /ws/{user_id}` (WebSocket connections)

### Security Notes
- Firebase service account credentials (`firebase_service.json`) are **NOT** in Git
- Each developer must add their own `firebase_service.json` file
- Never commit sensitive credentials to version control

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
- `FASTAPI_DATABASE_IMPLEMENTATION_GUIDE.md` - How to add new features to backend
- `DATABASE_CONCEPTS_EXPLAINED.md` - Understanding database setup
- `INCREMENTAL_SETUP_GUIDE.md` - Step-by-step backend setup
- `API_FUNDAMENTALS_EXPLAINED.md` - API concepts and patterns
- `FRONTEND_BACKEND_CONNECTION.md` - Connecting frontend to backend

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
