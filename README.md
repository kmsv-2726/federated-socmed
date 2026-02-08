# Federated Social Media Platform

A decentralized social media application built with the MERN stack, featuring federated architecture that allows multiple independent servers to communicate and share content.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

This platform implements a federated social media system where users can:
- Create and share posts within their home server
- Follow users and channels across the federation
- Interact with content from multiple servers
- Maintain their identity through federated IDs

The architecture follows the federated model, allowing independent servers to operate autonomously while still enabling cross-server communication and content sharing.

---

## Features

### User Management
- User registration and authentication with JWT
- Profile management with avatars
- Follow/unfollow users
- View followers and following lists

### Content
- Create, read, and delete posts
- Channel-based content organization
- Public and private channel visibility
- Channel follow/unfollow functionality

### Admin Dashboard
- User management and oversight
- Channel administration (create, update, delete)
- Report handling and moderation
- Server statistics and analytics

### Federation
- Federated user identities (username@server)
- Cross-server content discovery
- Multi-server architecture support

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.0 | UI Framework |
| Vite | 7.2.4 | Build Tool |
| React Router DOM | 7.13.0 | Routing |
| Axios | 1.13.3 | HTTP Client |
| Material UI | 5.18.0 | Component Library |
| React Icons | 5.5.0 | Icon Library |
| Styled Components | 6.3.8 | CSS-in-JS |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | - | Runtime |
| Express | 5.2.1 | Web Framework |
| MongoDB | - | Database |
| Mongoose | 8.22.0 | ODM |
| JWT | - | Authentication |
| bcrypt | 6.0.0 | Password Hashing |

---

## Project Structure

```
federated-socmed/
├── backend/
│   ├── controllers/      # Request handlers
│   ├── middleware/       # Auth and validation middleware
│   ├── models/           # Mongoose schemas
│   ├── routes/           # API route definitions
│   ├── utils/            # Utility functions
│   └── index.js          # Entry point
├── frontend/
│   ├── public/           # Static assets
│   └── src/
│       ├── components/   # Reusable React components
│       ├── pages/        # Page components
│       ├── styles/       # CSS stylesheets
│       └── App.jsx       # Root component
└── docs/                 # Documentation
```

---

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- MongoDB (local instance or MongoDB Atlas)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/federated-socmed.git
cd federated-socmed
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Install frontend dependencies:
```bash
cd ../frontend
npm install
```

### Environment Variables

Create a `.env` file in the `backend` directory:

```env
PORT=5000
MONGO_URL=mongodb://localhost:27017/federated-socmed
JWT_SECRET=your_jwt_secret_key
```

### Running the Application

1. Start the backend server:
```bash
cd backend
npm run dev
```

2. Start the frontend development server:
```bash
cd frontend
npm run dev
```

3. Access the application:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000

---

## API Documentation

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user` | Get all users |
| GET | `/api/user/:federatedId` | Get user profile |
| POST | `/api/user/:federatedId/follow` | Follow user |
| DELETE | `/api/user/:federatedId/follow` | Unfollow user |
| GET | `/api/user/followers` | Get followers |
| GET | `/api/user/following` | Get following |

### Posts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/posts` | Get all posts |
| POST | `/api/posts` | Create post |
| DELETE | `/api/posts/:id` | Delete post |

### Channels
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/channels` | Get all channels |
| GET | `/api/channels/:channelName` | Get channel details |
| POST | `/api/channels` | Create channel (Admin) |
| DELETE | `/api/channels/:id` | Delete channel (Admin) |
| PUT | `/api/channels/description/:channelName` | Update description (Admin) |
| PUT | `/api/channels/rules/:channelName` | Update rules (Admin) |
| POST | `/api/channels/follow/:channelName` | Follow channel |
| DELETE | `/api/channels/unfollow/:channelName` | Unfollow channel |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports` | Get all reports |
| POST | `/api/reports` | Create report |
| PUT | `/api/reports/:id/status` | Update report status |

---
