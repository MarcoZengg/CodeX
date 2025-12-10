
# BUThrift - Campus Marketplace

> Boston University's trusted marketplace for sustainable student living

BUThrift is a full-stack web application that enables BU students to buy and sell secondhand items within a verified, secure campus community. This project is part of **CS-411 Software Engineering**.

## 📋 Table of Contents

- [Project Overview](#-project-overview)
- [Team Members](#-team-members)
- [Contribution](#-contribution)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the System](#running-the-system)
- [Running Tests and Coverage Report](#-running-tests-and-coverage-report)
- [Project Structure](#-project-structure)
- [Technology Stack](#-technology-stack)

## 📖 Project Overview

BUThrift is a campus marketplace platform designed exclusively for Boston University students. The platform promotes sustainability, affordability, and community building while ensuring a safe trading environment through Firebase authentication, real-time messaging via WebSocket, and comprehensive transaction management.

**Project Path**: `Project/CodeX/bu_trift/`

## 👥 Team Members

- **Kenneth Chen (U01705999)** - Lead Testing Engineer
- **Minjun Kim (U18012972)** - Backend Developer 
- **Jerry Teixeira (U61825071)** - Full stack (specialized in front-end)
- **Xiankun Zeng (U54725278)** - Full stack (specialized in backend)

## 📊 Contribution

All team members have contributed to the codebase:

- **Kenneth Chen**:  Mainly focus on Testing suite, code coverage improvements, deployment coordination
- **Minjun Kim**:  Mainly focus on Database administration, security features, Backend development, frontend development
- **Jerry Teixeira**: Mainly focus on Frontend development, frontend development, authentication features, Firebase integration, backend development
- **MarcoZengg (Xiankun Zeng)**: Mainly focus on Backend development, Frontend development, Firebase integration, transaction system, performance optimization


All team members have actively contributed across frontend, backend, testing, database administration, and documentation, demonstrating collaborative development throughout the project lifecycle.

## 🚀 Getting Started

### Prerequisites

Before running the application, ensure you have the following installed:

- **Node.js 18+** and npm
- **Python 3.12+** and pip
- **Git** (for cloning the repository)
- **Firebase Project** (for authentication)
- **Cloudinary Account** (for image storage)

### Installation

### 1. Clone the Repository

```bash
git clone https://github.com/MarcoZengg/CodeX.git
cd CodeX/Project/CodeX/bu_trift
```

### 2. Install Frontend Dependencies

```bash
npm install
```

### 3. Install Backend Dependencies

```bash
# Option 1: From project root
pip install -r requirement.txt

# Option 2: From backend folder
cd backend
pip install -r requirement.txt
cd ..
```

### 4. Configure Firebase

#### Step 4a: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Follow the setup wizard to create your project

#### Step 4b: Enable Authentication

1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Enable **Email/Password** provider
3. Click **Save**

#### Step 4c: Get Firebase Web App Configuration

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll down to **Your apps** section
3. Click the **Web** icon (`</>`) to add a web app
4. Register your app (you can name it "BUThrift Web")
5. Copy the Firebase configuration object that appears

The configuration will look like this:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

#### Step 4d: Set Frontend Environment Variables

1. Create a `.env` file in the project root (`Project/CodeX/bu_trift/.env`):
   ```bash
   cd Project/CodeX/bu_trift
   touch .env
   ```

2. Open `.env` in a text editor and add your Firebase configuration values from the config object you copied:

   Add the following variables with your Firebase configuration values:
   ```bash
   # Backend API URL
   VITE_API_URL=http://localhost:8000
   
   # Firebase Configuration (get these from Firebase Console)
   VITE_FIREBASE_API_KEY=your_api_key_from_firebase
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ``
**Important Notes**: 
- The `.env` file is **required** - the app will not work without it
- The `.env` file is already in `.gitignore` and will not be committed to Git
- **Never commit your `.env` file** - it contains sensitive credentials
- If you see an error about missing environment variables, make sure you've created `.env` with all required variables

#### Step 4e: Configure Backend Firebase Service Account

1. In Firebase Console, go to **Project Settings** → **Service Accounts**
2. Click **Generate new private key**
3. Save the downloaded JSON file and save `firebase_service.json` file in `backend/` as `backend/firebase_service.json` 

**Important**: The `firebase_service.json` file is already in `.gitignore` and should NOT be committed to Git.

### 5. Configure Cloudinary

1. Create account at [Cloudinary Console](https://cloudinary.com/console)
2. Set environment variables (create `.env` file in `backend/`):

```bash
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Running the System

#### Step 1: Start the Backend Server

Open a terminal and navigate to the backend directory:

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Verification**: The backend API will be available at:
- API Base URL: `http://localhost:8000`
- API Documentation: `http://localhost:8000/docs` (Swagger UI)
- Alternative Docs: `http://localhost:8000/redoc`

The database (SQLite) will be automatically created on first run.

#### Step 2: Start the Frontend Server

Open **another terminal** (keep the backend running) and run:

```bash
# From the bu_trift directory
npm run dev
```

**Verification**: The frontend will be available at `http://localhost:5173`

#### Step 3: Access the Application

1. Open your browser and navigate to `http://localhost:5173`
2. Register a new account using a `@bu.edu` email address
3. Start using the marketplace!

**Important**: Both servers must be running simultaneously for the application to work properly.

## 🧪 Running Tests and Coverage Report

### Running Tests

Navigate to the backend directory and run:

```bash
cd backend
pytest
```

Or run with verbose output:

```bash
pytest -v
```

### Generating Coverage Report

#### Terminal Coverage Report

```bash
cd backend
pytest --cov=. --cov-report=term
```

This displays a coverage summary in the terminal showing:
- Total coverage percentage
- Coverage per module
- Missed lines

#### HTML Coverage Report (Detailed)

```bash
cd backend
pytest --cov=. --cov-report=html --cov-report=term
```

This generates an HTML report in `htmlcov/` directory.

**View the HTML report**:
- **macOS**: `open htmlcov/index.html`
- **Linux**: `xdg-open htmlcov/index.html`
- **Windows**: Open `htmlcov/index.html` in your browser

### Coverage Report Results

The test suite achieves **90.0% overall statement coverage** with:
- **Total Statements**: 3,158
- **Covered Statements**: 2,843
- **Missed Statements**: 315
- **Total Tests**: 117 (all passing)

## 📁 Project Structure

```
bu_trift/
├── app/                    # Frontend React application
│   ├── routes/            # Page components
│   ├── entities/          # API client entities
│   ├── components/        # Reusable components
│   └── utils/             # Utility functions
├── backend/               # Backend FastAPI application
│   ├── models/           # Database models
│   ├── tests/            # Test files
│   ├── utils/            # Utility functions
│   ├── main.py           # FastAPI application entry
│   └── database.py       # Database configuration
├── README.md              # This file
└── requirement.txt        # Python dependencies
```

## 🏗️ Technology Stack

### Frontend
- **Framework**: React 19 with React Router v7
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui + Radix UI
- **Build Tool**: Vite

### Backend
- **Language**: Python 3.12+
- **Framework**: FastAPI
- **ORM**: SQLAlchemy
- **Database**: SQLite (development) / PostgreSQL (production)
- **Validation**: Pydantic
- **Authentication**: Firebase Admin SDK

### Testing
- **Framework**: pytest with pytest-cov
- **Coverage**: 90.0% statement coverage
- **Tests**: 117 tests (all passing)

### External Services
- **Authentication**: Firebase Authentication
- **Image Storage**: Cloudinary CDN
- **Real-time**: WebSocket (FastAPI native)

---

## 🌐 Website

- **Deployed to Render**: https://butrift-frontend.onrender.com

**Course**: CS-411 Software Engineering  
**Domain**: Sustainability  
**Project Type**: Campus Thrift Marketplace Application
