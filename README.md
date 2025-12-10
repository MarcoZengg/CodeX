
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

- **Kenneth Chen (U01705999)** - Quality Assurance/Testing Lead & Deployment Coordinator
- **Minjun Kim (U18012972)** - Database Administrator & Security Specialist  
- **Jerry Teixeira (U61825071)** - Frontend Developer & UI/UX Designer
- **Xiankun Zeng (U54725278)** - Project Manager & Backend Developer

## 📊 Contribution

All team members have contributed to the codebase:

- **MarcoZengg (Xiankun Zeng)**: Backend development, Frontend development, Firebase integration, transaction system, performance optimization
- **Jerry Teixeira**: Frontend development, frontend development, authentication features, backend development
- **Kenneth Chen**:  Testing suite, code coverage improvements, deployment coordination
- **Minjun Kim**:  Database administration, security features, Backend development, frontend development


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

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication → Sign-in method → Email/Password
3. Download service account key:
   - Go to Project Settings → Service Accounts
   - Click "Generate new private key"
   - Save as `backend/firebase_service.json`
4. Update `app/config/firebase.ts` with your Firebase web app configuration

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
