# MiniChat — Real-Time Messaging Application

A full-stack WhatsApp-style messaging app with real-time chat, media sharing, reactions, group chats, and a premium dark-mode UI.

![MiniChat](https://img.shields.io/badge/MiniChat-Real--Time%20Messaging-00a884?style=for-the-badge)

## ✨ Features

- **Real-time messaging** via Socket.io WebSockets
- **One-to-one & group chats**
- **Message status** — sent ✓, delivered ✓✓, read ✓✓ (blue)
- **Typing indicators** — "User is typing..."
- **Message reactions** — 👍 ❤️ 😂 😮 😢 🙏
- **Reply to messages** — threaded replies
- **Media sharing** — images, videos, documents
- **File preview** in chat
- **Online/offline status** indicators
- **Unread message badges**
- **User search** — find people to chat with
- **Paginated chat history** (lazy loading)
- **JWT authentication** — secure signup/login
- **Dark mode UI** — premium WhatsApp-inspired design
- **Responsive** — works on desktop & mobile

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite, Socket.io-client |
| **Backend** | Node.js, Express, Socket.io |
| **Database** | MongoDB with Mongoose |
| **Auth** | JWT + bcrypt |
| **Styling** | Custom CSS (dark theme) |

## 📁 Project Structure

```
mini chat/
├── server/                  # Backend
│   ├── config/
│   │   └── db.js            # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── conversationController.js
│   │   └── messageController.js
│   ├── middleware/
│   │   ├── auth.js           # JWT middleware
│   │   └── upload.js         # Multer file upload
│   ├── models/
│   │   ├── User.js
│   │   ├── Message.js
│   │   └── Conversation.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── conversations.js
│   │   ├── messages.js
│   │   └── upload.js
│   ├── socket/
│   │   └── socketHandler.js  # Real-time events
│   ├── .env                  # Environment config
│   ├── package.json
│   └── server.js             # Entry point
│
├── client/                   # Frontend
│   ├── src/
│   │   ├── contexts/
│   │   │   ├── AuthContext.jsx
│   │   │   └── SocketContext.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   └── Chat.jsx
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   ├── authService.js
│   │   │   ├── chatService.js
│   │   │   └── userService.js
│   │   ├── utils/
│   │   │   └── formatDate.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

## 🚀 Setup Instructions

### Prerequisites

1. **Node.js** (v18 or higher) — [Download here](https://nodejs.org/)
2. **MongoDB** — either:
   - Local: [Install MongoDB Community](https://www.mongodb.com/try/download/community)
   - Cloud: [MongoDB Atlas](https://www.mongodb.com/atlas) (free tier)

### Step 1: Clone & Install

```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### Step 2: Configure Environment

Edit `server/.env`:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/minichat
JWT_SECRET=your_secure_secret_key_here
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:5173
```

> For MongoDB Atlas, replace `MONGODB_URI` with your connection string:
> `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/minichat`

### Step 3: Start the App

```bash
# Terminal 1 — Start backend
cd server
npm run dev

# Terminal 2 — Start frontend
cd client
npm run dev
```

- Backend runs at: `http://localhost:5000`
- Frontend runs at: `http://localhost:5173`

### Step 4: Test It

1. Open `http://localhost:5173` in your browser
2. Click **Sign Up** to create an account
3. Open a second browser / incognito window
4. Create a second account
5. Search for the other user and start chatting!

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Current user |
| GET | `/api/users/search?q=` | Search users |
| GET | `/api/users/:id` | Get user profile |
| PUT | `/api/users/:id` | Update profile |
| GET | `/api/conversations` | List conversations |
| POST | `/api/conversations` | Create conversation |
| GET | `/api/conversations/:id/messages` | Get messages (paginated) |
| PUT | `/api/conversations/:id/read` | Mark as read |
| POST | `/api/messages` | Send message |
| POST | `/api/messages/:id/react` | React to message |
| POST | `/api/upload` | Upload file |

## ⚡ Socket.io Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `conversation:join` | Client → Server | Join chat room |
| `conversation:leave` | Client → Server | Leave chat room |
| `message:send` | Client → Server | Send message |
| `message:received` | Server → Client | New message |
| `message:read` | Bidirectional | Mark messages read |
| `message:react` | Client → Server | Add/remove reaction |
| `message:reacted` | Server → Client | Reaction update |
| `message:status` | Server → Client | Status update |
| `typing:start` | Bidirectional | Typing started |
| `typing:stop` | Bidirectional | Typing stopped |
| `user:online` | Server → Client | Online status change |
| `users:online` | Server → Client | Online users list |

## 🌐 Deployment Guide

### Option A: Render (Recommended for backend)

1. Push code to GitHub
2. Create a new **Web Service** on [Render](https://render.com)
3. Connect your repo → set root: `server`
4. Set environment variables in Render dashboard
5. Deploy!

### Option B: Vercel (Frontend)

1. Create new project on [Vercel](https://vercel.com)
2. Import repo → set root: `client`
3. Add `VITE_API_URL` env variable pointing to your backend
4. Deploy!

### Option C: Railway

1. Create project on [Railway](https://railway.app)
2. Add MongoDB plugin
3. Deploy server and client as separate services

## 🔐 Security

- Passwords hashed with bcrypt (12 rounds)
- JWT tokens with configurable expiration
- CORS configured for frontend origin only
- File upload validation (type + size limits)
- Input validation with express-validator
- MongoDB injection prevention via Mongoose

## 📄 License

MIT
"# minichat" 
"# minichat" 
"# minichat" 
"# minichat" 
"# minichat" 
"# minichat" 
"# minichat" 
"# minichat" 
"# minichat" 
"# minichat" 
