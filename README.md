# WatchParty

Watch YouTube videos together with friends — everyone stays in sync, no matter where they are.

WatchParty is a real-time watch party app where one person creates a room, shares the code, and everyone watches the same video at the same time. When someone plays, pauses, or skips — it happens for everyone.

## What it does

- **Rooms** — Create a room and get a shareable 6-character code. Anyone with the code can join instantly. No sign-up needed.
- **Sync** — Play, pause, seek, and switch videos. Every action syncs across all viewers in real time through WebSockets.
- **Late join** — If someone joins mid-video, they automatically land at the exact spot everyone else is watching.
- **Drift correction** — The server pushes the current timestamp to everyone every 10 seconds so nobody falls out of sync over time.
- **Video queue** — Anyone in the room can add videos to a waiting list. When the current video ends, the next one in the queue plays automatically. You can also skip or remove items.
- **Chat** — Talk with everyone in the room while watching. Messages show up instantly with role badges next to each name.
- **Roles** — There are three roles: Host, Moderator, and Participant. The host has full control — they can promote people to moderator, demote them, kick them, or hand over host to someone else. If the host leaves, the person who joined earliest automatically becomes the new host.
- **Permissions** — All role checks happen on the server. A regular participant can't play/pause or change the video even if they tried to send those events manually. The backend rejects anything unauthorized.
- **Social sharing** — Share the room directly to WhatsApp, Telegram, Twitter/X, or Discord with one click. There's also a system share option and a copy-to-clipboard button.
- **Draggable chat** — On desktop, the chat panel floats over the video and you can drag it around wherever you want.
- **Mobile layout** — On phones, the video sits on top and below it you get tabs for Chat, Queue, Players, and Add Video. Everything works well in portrait mode.
- **MongoDB persistence** — Room state, video queue, and chat history are saved to MongoDB. If MongoDB isn't available, the app still works fine using in-memory storage as a fallback.
- **Direct room links** — You can share a link like `yoursite.com/?room=ABC123` and the person opening it will land directly on the join page with the code pre-filled.

## Tech stack

**Frontend:** React (Vite), Framer Motion, Lucide React, ReactBits components (Aurora, Particles, TiltedCard, SpotlightCard, ShinyText, MagnetButton)

**Backend:** Node.js, Express, Socket.IO, Mongoose

**Database:** MongoDB Atlas (optional — works without it too)

**Deployment:** Vercel (frontend) + Render (backend)

## How to run locally

You'll need Node.js 18+ and npm.

**Server:**
```bash
cd server
npm install
npm run dev
```
Starts on `http://localhost:3001`

**Client:**
```bash
cd client
npm install
npm run dev
```
Starts on `http://localhost:5173`

Open the client URL, pick a name, create a room, and share the room code with another tab or device.

### Environment variables

**Server** (`server/.env`):
```
PORT=3001
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/watchparty
CLIENT_URL=https://your-frontend.vercel.app
```
If you skip `MONGO_URI`, the server runs in memory-only mode — still fully functional, just no persistence across restarts.

**Client** (`client/.env`):
```
VITE_SERVER_URL=http://localhost:3001
```
Point this to your deployed backend URL in production.

## Deploying

**Backend on Render:**
- Root directory: `server`
- Build command: `npm install`
- Start command: `node index.js`
- Add `CLIENT_URL` and `MONGO_URI` as environment variables

**Frontend on Vercel:**
- Root directory: `client`
- Build command: `npm run build`
- Output directory: `dist`
- Add `VITE_SERVER_URL` pointing to your Render backend URL

## Project structure

```
WatchTogether/
├── server/
│   ├── index.js                  # Express + Socket.IO server
│   ├── config/
│   │   └── db.js                 # MongoDB connection (with fallback)
│   ├── classes/
│   │   ├── Room.js               # Room state, video state, queue, broadcast
│   │   ├── Participant.js        # User model with role-based permissions
│   │   └── EventRouter.js        # All socket event handlers + RBAC checks
│   └── models/
│       ├── RoomModel.js          # Mongoose schema for rooms + queue
│       ├── ChatMessageModel.js   # Mongoose schema for chat messages
│       └── SessionModel.js       # Mongoose schema for user sessions
│
├── client/
│   └── src/
│       ├── App.jsx
│       ├── services/
│       │   └── socket.js         # Socket.IO client singleton
│       ├── components/
│       │   ├── LandingPage.jsx   # Create / join room screen
│       │   ├── WatchRoom.jsx     # Main room — video + HUD panels
│       │   ├── YouTubePlayer.jsx # YouTube iframe wrapper with sync logic
│       │   ├── ParticipantList.jsx
│       │   ├── ChatPanel.jsx
│       │   ├── VideoSearch.jsx   # Paste URL or pick from quick-picks
│       │   ├── QueuePanel.jsx    # Video waiting list
│       │   └── reactbits/        # Aurora, Particles, TiltedCard, etc.
│       └── styles/
│
└── README.md
```

## How it works under the hood

1. A user creates a room — the server generates a room ID, assigns the creator as Host, and stores the initial video state.
2. Other users join with the room code — the server sends them the current video state (which video, current timestamp, playing or paused) so they sync up immediately.
3. When the Host or a Moderator plays/pauses/seeks/changes the video, that event goes to the server. The server checks their role, updates the room state, and broadcasts the new state to everyone.
4. Every 10 seconds, the server pushes a sync update to all rooms to correct any small timing drift.
5. When someone adds a video to the queue, it gets stored in the room state. When the current video ends (or the host clicks "Play Next"), the server pops the next item from the queue and broadcasts the change.
6. All permission checks are server-side. The `EventRouter` class validates every incoming event against the sender's role before doing anything with it.

## Socket events

| Event | Direction | What it does |
|---|---|---|
| `join_room` | Client → Server | Create or join a room |
| `leave_room` | Client → Server | Leave the room |
| `play` / `pause` / `seek` | Client → Server | Playback controls (Host/Mod only) |
| `change_video` | Client → Server | Switch to a different video (Host/Mod only) |
| `add_to_queue` | Client → Server | Add a video to the waiting list (anyone) |
| `remove_from_queue` | Client → Server | Remove a video from the queue |
| `next_video` | Client → Server | Skip to next queued video |
| `assign_role` | Client → Server | Promote/demote a user (Host only) |
| `remove_participant` | Client → Server | Kick a user (Host only) |
| `transfer_host` | Client → Server | Give host role to someone else (Host only) |
| `chat_message` | Both ways | Send/receive chat messages |
| `joined_room` | Server → Client | Room joined successfully + initial state |
| `sync_state` | Server → Client | Current video state broadcast |
| `user_joined` / `user_left` | Server → Client | Someone joined or left |
| `role_assigned` | Server → Client | A user's role changed |
| `participant_removed` | Server → Client | A user was kicked |
| `removed_from_room` | Server → Client | You got kicked |
| `error_event` | Server → Client | Permission denied or validation error |
