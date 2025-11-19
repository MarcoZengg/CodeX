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
- **Browse Page**: Item listing with filtering, sorting, and search functionality
- **Item Details Page**: Detailed item view with image gallery and seller information
- **Sell Page**: Form to create new listings
- **Messages Page**: Conversation list and messaging interface
- **Profile Page**: User profile with listings and stats

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
  - ✅ GET all items (`/api/items`)
  - ✅ GET item by ID (`/api/items/{item_id}`)
  - ✅ POST create item (`/api/items`)
  - ✅ Database persistence with SQLite

#### Database
- ✅ **SQLite Database**: `butrift.db` file (auto-generated)
- ✅ **Items Table**: Fully implemented with schema
  - Columns: id, title, description, price, category, condition, seller_id, status, location, is_negotiable, created_date

#### Frontend Integration
- ✅ **API Integration**: Frontend connected to FastAPI backend
- ✅ **Item Entity**: Calls real backend API (`http://localhost:8000/api/items`)
- ✅ **User Entity**: Calls real backend API (Simple - no authentication yet)
  - ✅ `User.register()` - Register new user (`POST /api/users/register`)
  - ✅ `User.getById()` - Get public user profile (`GET /api/users/{user_id}`)
  - ✅ `User.me()` - Returns mock user data (authentication to be added later)
  - ✅ **Fallback to Mock Data**: If backend unavailable, uses mock data
- ✅ **Error Handling**: Try-catch blocks for API calls
- ⏳ **Messaging**: Still using mock data
- ⏳ **Image Upload**: Not yet implemented
- ⏳ **Authentication Flow**: To be implemented after all backend services are complete

### ⏳ Pending Implementation

#### Backend Services
- ✅ **User Management Service**: Basic registration (Authentication to be added later)
  - ✅ User registration endpoint (`POST /api/users/register`)
  - ✅ Get user by ID (`GET /api/users/{user_id}`)
  - ✅ Users database table (`users` table with SQLAlchemy)
  - ✅ Password hashing with bcrypt (passwords stored securely)
  - ✅ BU email validation (@bu.edu required)
  - ⏳ **Authentication (JWT)**: To be implemented after all backend services are complete
- [ ] **Messaging Service**: Real-time messaging
  - [ ] Conversations CRUD
  - [ ] Messages CRUD
  - [ ] Database tables for conversations & messages
- [ ] **Image Upload Service**: File handling
  - [ ] Image upload endpoints
  - [ ] Image storage (local or cloud)
  - [ ] Image URLs in item records

#### Frontend Features
- ✅ User registration (calls backend API)
- ⏳ Authentication flow (JWT tokens) - To be added after backend services complete
- [ ] Add register UI page
- [ ] Add login UI page (after authentication is implemented)
- [ ] Replace Message mock data with API calls
- [ ] Replace Conversation mock data with API calls
- [ ] Implement image upload functionality
- [ ] Add error handling and loading states

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
│   │   ├── User.ts         # User entity (mock data)
│   │   ├── Message.ts      # Message entity (mock data)
│   │   ├── Conversation.ts # Conversation entity (mock data)
│   │   └── index.ts        # Entity exports
│   ├── utils/              # Utility functions
│   ├── root.tsx            # Root component
│   └── app.css             # Global styles
├── backend/                # Backend (FastAPI + SQLAlchemy)
│   ├── main.py             # FastAPI app & endpoints
│   ├── database.py         # Database connection setup
│   ├── models/             # Database models (SQLAlchemy)
│   │   ├── item.py         # ItemDB model
│   │   └── user.py         # UserDB model
│   ├── butrift.db          # SQLite database (auto-generated)
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
- (Optional) Python virtual environment (recommended)

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

### Development

#### Start Backend Server

Open a terminal and run:
```bash
cd backend
uvicorn main:app --reload
```

The API will be available at:
- **API**: `http://localhost:8000`
- **API Documentation (Swagger UI)**: `http://localhost:8000/docs`
- **Alternative API Docs (ReDoc)**: `http://localhost:8000/redoc`

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
  - `Item.create()` - Calls `POST /api/items` to create items in database

#### ⏳ Still Using Mock Data
- **User Entity** (`app/entities/User.ts`)
  - `User.me()` - Returns mock user data
- **Conversation Entity** (`app/entities/Conversation.ts`)
  - `Conversation.filter()` - Returns mock conversations
  - `Conversation.create()` - Returns mock conversation
- **Message Entity** (`app/entities/Message.ts`)
  - `Message.filter()` - Returns mock messages
  - `Message.create()` - Returns mock message

### API Endpoints

**Current Implemented Endpoints:**

**Item Endpoints:**
- `GET /api/items` - Get all items
- `GET /api/items/{item_id}` - Get item by ID
- `POST /api/items` - Create new item

**User Endpoints (Simple - no authentication yet):**
- `POST /api/users/register` - Register new user (requires @bu.edu email, no authentication)
- `GET /api/users/{user_id}` - Get public user profile by ID

**Health Check:**
- `GET /` - API health check
- `GET /api/health` - Database health check

**To Be Implemented:**
- User authentication (JWT tokens, login endpoint)
- Message endpoints (`/api/messages`, `/api/conversations`)
- Image upload endpoints
- Password reset endpoint

### Database

The SQLite database (`backend/butrift.db`) is automatically created when you first run the backend server. All created items are persisted in this file.

**Viewing the Database:**
- Use SQLite browser tools (DB Browser for SQLite)
- Use Python: `import sqlite3; conn = sqlite3.connect('backend/butrift.db')`
- Use command line: `sqlite3 backend/butrift.db`

### Next Steps

1. **Implement User Authentication**
   - Create User model in `backend/models/user.py`
   - Add user endpoints in `backend/main.py`
   - Update frontend User entity to call API

2. **Implement Messaging**
   - Create Message and Conversation models
   - Add messaging endpoints
   - Update frontend entities to call API

3. **Add Image Upload**
   - Implement file upload endpoints
   - Store images (local or cloud storage)
   - Update Item model to include image URLs

4. **Testing**
   - Write unit tests for backend models
   - Write integration tests for API endpoints
   - Write frontend component tests
   - Set up CI/CD

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

## 📚 Resources

### Frontend
- [React Router Documentation](https://reactrouter.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [TypeScript Documentation](https://www.typescriptlang.org/)

### Backend
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [Pydantic Documentation](https://docs.pydantic.dev/)
- [Uvicorn Documentation](https://www.uvicorn.org/)

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
