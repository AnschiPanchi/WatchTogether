require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { connectDB } = require('./config/db');
const EventRouter = require('./classes/EventRouter');

const PORT = process.env.PORT || 3001;

// Connect to MongoDB
connectDB();

const app = express();
const httpServer = http.createServer(app);

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.CLIENT_URL
  ? [process.env.CLIENT_URL]
  : ['http://localhost:5173', 'http://localhost:4173', 'http://localhost:3000'];

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

// ─── Socket.IO ────────────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Boot the event router (registers all socket handlers + periodic sync)
const eventRouter = new EventRouter(io);

// ─── REST API ─────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', rooms: eventRouter.getRoomCount(), ts: Date.now() });
});

app.get('/api/room/:roomId', (req, res) => {
  const info = eventRouter.getRoomInfo(req.params.roomId);
  if (!info) return res.status(404).json({ error: 'Room not found' });
  res.json(info);
});

// ─── Serve static frontend in production ──────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

// ─── Start ────────────────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`\n🚀 WatchParty server running on http://localhost:${PORT}\n`);
});


