# BUTrift - Campus Marketplace

> Boston University's trusted marketplace for sustainable student living

BUTrift is a campus marketplace platform that enables BU students to buy and sell secondhand items, promoting sustainability and affordability within the verified campus community.

## 📋 Project Overview

This project is part of **CS-411 Software Engineering** and addresses the **Sustainability** domain. The system is designed to help students reduce waste by sharing and repurposing items instead of buying new ones and throwing others away.

### Project Requirements

According to the course requirements:
- ✅ **Graphical User Interface (GUI)**: React-based web application (Mobile & Desktop compatible)
- ⏳ **Backend Implementation**: Object-Oriented Classes in Python or Java (TODO)
- ⏳ **API Integration**: Connect frontend to backend services (TODO)
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

### ⏳ Pending Implementation

#### Backend Services (Critical)
- [ ] **Python/Java Backend**: Object-Oriented class implementation
  - [ ] Item management service
  - [ ] User authentication & profile service
  - [ ] Messaging service
  - [ ] Image upload & storage service
- [ ] **Database**: Design and implement data persistence
  - [ ] Items table/schema
  - [ ] Users table/schema
  - [ ] Messages & Conversations schema
- [ ] **API Endpoints**: RESTful API or GraphQL
  - [ ] Item CRUD operations
  - [ ] User authentication & authorization
  - [ ] Messaging endpoints
  - [ ] Image upload endpoints

#### Frontend Integration
- [ ] Replace mock data with API calls
- [ ] Implement authentication flow
- [ ] Add error handling and loading states
- [ ] Implement image upload functionality

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

### Backend (To Be Implemented)
- **Language**: Python or Java (TBD)
- **Framework**: To be determined
- **Database**: To be determined

## 📁 Project Structure

```
bu_trift/
├── app/
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
│   ├── entities/           # Data models & mock implementations
│   │   ├── Item.ts         # Item entity (with mock data)
│   │   ├── User.ts         # User entity (with mock data)
│   │   ├── Message.ts      # Message entity (with mock data)
│   │   └── Conversation.ts # Conversation entity (with mock data)
│   ├── utils/              # Utility functions
│   ├── root.tsx            # Root component
│   └── app.css             # Global styles
├── public/                 # Static assets
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 🏃 Getting Started

### Prerequisites

- Node.js 18+ and npm
- (Future) Python 3.9+ or Java 17+ for backend

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd bu_trift
```

2. Install dependencies:
```bash
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

### Building for Production

Create a production build:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

## 📝 Development Notes

### Current State: Mock Data

The application currently uses **mock data** for all entity operations:
- `ItemEntity.filter()` - Returns mock items
- `ItemEntity.get()` - Returns mock item by ID
- `UserEntity.me()` - Returns mock current user
- `ConversationEntity.filter()` - Returns mock conversations
- `MessageEntity.filter()` - Returns mock messages

**All entity methods are located in:**
- `app/entities/Item.ts`
- `app/entities/User.ts`
- `app/entities/Message.ts`
- `app/entities/Conversation.ts`

### Next Steps

1. **Design Backend Architecture**
   - Choose Python or Java
   - Design database schema
   - Plan API endpoints

2. **Implement Backend Services**
   - Create OOP classes for each entity
   - Implement CRUD operations
   - Add authentication middleware

3. **Connect Frontend to Backend**
   - Replace mock implementations with API calls
   - Add environment variables for API URLs
   - Implement error handling

4. **Testing**
   - Write unit tests
   - Write integration tests
   - Set up CI/CD

## 🔧 Available Scripts

- `npm run dev` - Start development server with HMR
- `npm run build` - Create production build
- `npm start` - Start production server
- `npm run typecheck` - Run TypeScript type checking

## 🌐 Browser Support

- ✅ Chrome/Edge (tested)
- ✅ Safari (tested)
- ✅ Firefox (should work)

## 📚 Resources

- [React Router Documentation](https://reactrouter.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [TypeScript Documentation](https://www.typescriptlang.org/)

## 👥 Team

[Add team member names and roles]

## 📄 License

[Add license information]

---

**Course**: CS-411 Software Engineering  
**Domain**: Sustainability  
**Project Type**: Campus Thrift Marketplace Application
