# 🎬 WatchParty

**Watch YouTube videos together — in perfect sync.**

A real-time, role-based YouTube Watch Party system built with React + TypeScript (Vite) on the frontend and Node.js + Express + Socket.IO on the backend.

---

## ✨ Features

| Feature | Status |
|---|---|
| Create / Join rooms via shareable code | ✅ |
| Real-time playback sync (play, pause, seek, change video) | ✅ |
| Late-join sync (new users land at current video state) | ✅ |
| Role-based access control (Host, Moderator, Participant) | ✅ |
| Host can promote/demote participants | ✅ |
| Host can remove participants from the room | ✅ |
| Transfer host to another participant | ✅ |
| Auto-promote oldest participant when host leaves | ✅ |
| Live participant list with role badges | ✅ |
| In-room chat with role indicators | ✅ |
| Video search by URL or paste ID with quick-picks | ✅ |
| Periodic drift correction every 10 seconds | ✅ |
| Server-side RBAC (client cannot bypass restrictions) | ✅ |
| Premium dark glassmorphism UI | ✅ |

---

## 🚀 Quick Start (Local)

### Prerequisites
- Node.js ≥ 18
- npm

### 1. Install & Run the Server
```bash
cd server
npm install
npm run dev   # nodemon, hot-reload
# Runs on http://localhost:3001
```

### 2. Install & Run the Client
```bash
cd client
npm install
npm run dev
# Runs on http://localhost:5173
```

Open `http://localhost:5173` and create a room!

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER                              │
│  React + TypeScript (Vite)                                  │
│  ┌──────────┐  ┌──────────────┐  ┌──────────┐  ┌────────┐ │
│  │ Landing  │  │  WatchRoom   │  │ YouTube  │  │  Chat  │ │
│  │  Page    │  │(orchestrator)│  │  Player  │  │  Panel │ │
│  └──────────┘  └──────┬───────┘  └──────────┘  └────────┘ │
│                        │ Socket.IO (WebSocket)              │
└────────────────────────┼────────────────────────────────────┘
                         │
┌────────────────────────┼────────────────────────────────────┐
│              NODE.JS SERVER                                  │
│  ┌─────────────────────▼────────────────────────────────┐   │
│  │                  EventRouter                          │   │
│  │  • Registers all Socket.IO event handlers            │   │
│  │  • Server-side RBAC validation before any broadcast  │   │
│  │  • Periodic sync broadcast every 10s                 │   │
│  └───────────────┬────────────────────┬──────────────────┘  │
│                  ▼                    ▼                      │
│           ┌─────────────┐    ┌────────────────┐            │
│           │    Room     │    │  Participant   │            │
│           │  • videoState    │  • userId       │            │
│           │  • participants  │  • role         │            │
│           │  • broadcast()   │  • socket ref   │            │
│           └─────────────┘    └────────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

### WebSocket Event Flow

1. **Create Room**: Client emits `join_room` (no roomId) → Server creates room, assigns Host, returns `joined_room` with current `sync_state`.
2. **Join Room**: Client emits `join_room` (with roomId) → Server validates room, assigns Participant role, sends late-join `sync_state`.
3. **Playback Control**: Host/Moderator emits `play/pause/seek/change_video` → EventRouter validates role → Room updates state → broadcasts `sync_state` to all.
4. **Role Management**: Host emits `assign_role/remove_participant/transfer_host` → EventRouter validates Host role → broadcasts updated participant list.
5. **Drift Correction**: Server broadcasts `sync_state` to all rooms every 10 seconds.

### RBAC Enforcement
All permission checks happen **server-side** in `EventRouter`. The client has no way to bypass restrictions — unauthorized events are rejected and never broadcast.

---

## 🌐 Deployment

### Render.com (Recommended)

**Backend (Web Service)**
- Root Directory: `server`
- Build Command: `npm install`
- Start Command: `node index.js`
- Environment Variable: `CLIENT_URL=https://your-frontend.netlify.app`

**Frontend (Netlify / Vercel)**
- Root Directory: `client`
- Build Command: `npm run build`
- Publish Directory: `dist`
- Environment Variable: `VITE_SERVER_URL=https://your-backend.onrender.com`

---

## 📁 Project Structure

```
watchparty/
├── server/
│   ├── index.js              # Express + Socket.IO server entry
│   └── classes/
│       ├── Participant.js    # Participant OOP class
│       ├── Room.js           # Room OOP class (state + broadcast)
│       └── EventRouter.js    # RBAC + event handling
├── client/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── socket.ts         # Socket.IO singleton
│   │   ├── types.ts          # Shared TypeScript types
│   │   ├── index.css         # Premium dark UI styles
│   │   └── components/
│   │       ├── LandingPage.tsx
│   │       ├── WatchRoom.tsx
│   │       ├── YouTubePlayer.tsx
│   │       ├── ParticipantList.tsx
│   │       ├── ChatPanel.tsx
│   │       └── VideoSearch.tsx
│   └── vite.config.ts
└── README.md
```

## 🔑 Socket.IO Event Reference

| Event | Direction | Description |
|---|---|---|
| `join_room` | C→S | Join or create a room |
| `leave_room` | C→S | Leave the current room |
| `play` | C→S | Play video (Host/Mod only) |
| `pause` | C→S | Pause video (Host/Mod only) |
| `seek` | C→S | Seek to time (Host/Mod only) |
| `change_video` | C→S | Change video (Host/Mod only) |
| `assign_role` | C→S | Change a user's role (Host only) |
| `remove_participant` | C→S | Remove a user (Host only) |
| `transfer_host` | C→S | Transfer host role (Host only) |
| `chat_message` | C→S | Send a chat message |
| `joined_room` | S→C | Confirmation + initial sync state |
| `sync_state` | S→C | Broadcast current video state |
| `user_joined` | S→C | New participant joined |
| `user_left` | S→C | Participant left |
| `role_assigned` | S→C | Role changed |
| `participant_removed` | S→C | User was removed |
| `removed_from_room` | S→C | You were removed |
| `chat_message` | S→C | Incoming chat message |
| `error_event` | S→C | Permission/validation error |
