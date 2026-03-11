# 🌐 Federated Social Media Platform

A decentralized social media application built with the **MERN stack** (MongoDB, Express, React, Node.js). This platform features a federated architecture that allows multiple independent servers to communicate, share content, and form a broader decentralized network.

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Project Architecture](#-project-architecture)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running the Application](#running-the-application)
- [API Documentation](#-api-documentation)
- [Contributing](#-contributing)
- [License](#-license)

---

## 📖 Overview

This platform implements a federated social media system where users can:
- **Host locally, connect globally**: Create and share posts within their home server while interacting with content from the wider federation.
- **Federated Identities**: Maintain a unique identity formatted as `username@server`.
- **Seamless Communication**: Follow users, join channels, and exchange real-time messages across the federation.
- **Autonomous Operating**: Independent servers operate autonomously and can manage their own trusted server lists.

---

## ✨ Key Features

### 👤 User Management & Social Graph
- Secure registration and JWT-based authentication.
- Profile management with avatars and bio.
- Follow/unfollow mechanisms across the federation.
- Privacy controls: Block and mute users.
- Real-time direct messaging between users (Socket.io).

### 📝 Content & Channels
- Create, read, edit, delete, and like posts.
- Commenting system for engaging discussions.
- **Channel-based organization**:
  - Discover, follow, and join public/private channels.
  - Request access to private channels and manage pending requests.
- Rich media support for posts and channel avatars.

### 🛡️ Admin Dashboard & Moderation
- Global user management and oversight.
- Channel administration (create, update, delete, manage access requests).
- Content moderation and report handling (resolve user reports).
- Dynamic Server Configuration management directly from the dashboard.

### 🌍 Federation System
- ActivityPub-inspired actor/inbox model for cross-server communication.
- Cross-server content discovery and feed generation.
- **Trusted Servers Management**: Admins can approve or block federation with specific external servers.
- Cryptographic verification of federated requests using public/private key pairs.

---

## 🛠️ Tech Stack

### Frontend
| Technology | Description |
|------------|-------------|
| **React (19.x)** | Core UI framework |
| **Vite** | Blazing fast build tool |
| **React Router v7**| Client-side routing |
| **Material UI & Styled Components** | UI component library and styling |
| **Axios** | HTTP client for API requests |
| **Socket.io-client** | Real-time bidirectional event-based communication |

### Backend
| Technology | Description |
|------------|-------------|
| **Node.js & Express (v5)** | High-performance backend runtime and web framework |
| **MongoDB & Mongoose** | NoSQL database and Object Data Modeling |
| **JWT & bcrypt** | Security, authentication, and password hashing |
| **Socket.io** | WebSocket framework for real-time messaging |
| **Nodemailer** | Email integration (e.g., for notifications/verification) |

---

## 📂 Project Structure

```text
federated-socmed/
├── backend/
│   ├── controllers/      # Route request handlers
│   ├── middleware/       # Auth, Admin validation, Federation verification
│   ├── models/           # Mongoose schemas (User, Post, Channel, Message, etc.)
│   ├── routes/           # RESTful API route definitions
│   ├── utils/            # Helper functions
│   ├── services/ 
│   └── index.js          # Main application entry point
├── frontend/
│   ├── public/           # Static assets
│   └── src/
│       ├── components/   # Reusable UI components
│       ├── pages/        # Main application pages/views
│       ├── styles/       # CSS/Styled Components
│       └── App.jsx       # React application root
└── docs/                 # Additional project documentation
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **MongoDB** (Local instance or MongoDB Atlas)

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

Create a `.env` file in the `backend` directory with the following base configuration:

```env
PORT=5000
MONGO_URL=mongodb://localhost:27017/federated-socmed
SERVER_NAME=server_name
JWT_SECRET=your_super_secret_jwt_key
```

Create a `.env` file in the `frontend` directory:

```env
VITE_API_URL=http://localhost:5000/api
```

### Running the Application

1. **Start the backend server:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start the frontend development server:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Access the application:**
   - Frontend: [http://localhost:5173](http://localhost:5173)
   - Backend API: [http://localhost:5000](http://localhost:5000)

---

## 📡 API Documentation

Below is a summary of the available REST API endpoints:

### Authentication (`/api/auth`)
- `POST /register` - Register a new user
- `POST /login` - Login user and receive JWT

### Users (`/api/user`)
- `GET /` - Get all users
- `GET /:federatedId` - Get user profile
- `GET /followers` | `GET /following` - Get user's social network
- `POST /:federatedId/follow` | `DELETE /:federatedId/follow` - Follow/Unfollow a user
- `GET /:federatedId/follow/status` - Check current follow status

### Posts (`/api/posts`)
- `GET /` | `POST /` - Read and Create posts
- `DELETE /:id` - Delete a post
- `PUT /like/:id` - Toggle like on a post
- `PUT /comment/:id` - Add a comment to a post

### Channels (`/api/channels`)
- `GET /` | `GET /:channelName` - Fetch channels and their details
- `POST /follow/:channelName` | `DELETE /unfollow/:channelName` - Follow/unfollow
- `GET /follow/:channelName` - Check follow status
- `POST /request-access/:channelName` - Request access to a private channel
- `GET /requests/:channelName` | `PUT /resolve-request/:channelName` - Manage access requests
- **Admin Only:**
  - `POST /` | `DELETE /:id` - Create or delete a channel
  - `PUT /description/:channelName` | `PUT /rules/:channelName` | `PUT /image/:channelName` - Update channel configuration
  - `GET /followers/:channelName` - View channel members
  - `GET /all-requests` - View global pending access requests

### Messaging (`/api/messages`)
- `GET /users` - Get list of users with active chat history
- `GET /:targetUserId` - Get message history with a specific user
- `POST /` - Send a new direct message

### Privacy & Moderation (`/api/block`, `/api/mute`, `/api/reports`)
- `PUT /api/block/:federatedId/toggle` - Block/unblock a user
- `GET /api/block` - List blocked users
- `PUT /api/mute/:federatedId/toggle` - Mute/unmute a user
- `GET /api/mute` - List muted users
- `GET /api/reports` | `POST /api/reports` - Fetch or create moderation reports
- `PUT /api/reports/:id/status` - Update report resolution status (Admin)

### Federation System (`/api/federation`)
- `GET /public-key` - Expose the server's public key for signature verification
- `POST /inbox` - Receive incoming federated events/messages
- `GET /feed` - Fetch cross-server feed
- **Admin Only:**
  - `GET /trusted-servers` | `POST /trusted-servers` - View or add trusted federated nodes
  - `PUT /trusted-servers/:id/toggle` | `DELETE /trusted-servers/:id` - Manage trusted servers

### Server Configuration (`/api/server-config`)
- `GET /` - Get public server configuration details
- `PUT /` - Update server metadata (Admin only)