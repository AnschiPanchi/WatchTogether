const Participant = require('./Participant');

/**
 * Room class - Represents a single Watch Party room.
 * Holds all participants, current video state, and broadcast helpers.
 */
class Room {
  /**
   * @param {string} roomId
   * @param {import('socket.io').Server} io
   */
  constructor(roomId, io) {
    this.roomId = roomId;
    this.io = io;

    /** @type {Map<string, Participant>} */
    this.participants = new Map();

    /** @type {{ videoId: string, playState: 'playing'|'paused', currentTime: number, lastUpdatedAt: number }} */
    this.videoState = {
      videoId: '', // empty initially
      playState: 'paused',
      currentTime: 0,
      lastUpdatedAt: Date.now(),
    };

    /** @type {Array<{ id: string, videoId: string, title?: string, addedBy: string, addedByUsername: string, timestamp: number }>} */
    this.queue = [];

    this.createdAt = Date.now();
    this.lastEmptyAt = null;
    
    /** @type {Array<any>} */
    this.chatHistory = [];
  }

  // ─── Participant Management ───────────────────────────────────────────────

  addParticipant(participant) {
    this.participants.set(participant.userId, participant);
    this.lastEmptyAt = null;
  }

  removeParticipant(userId) {
    const p = this.participants.get(userId);
    this.participants.delete(userId);
    if (this.isEmpty()) {
      this.lastEmptyAt = Date.now();
    }
    return p;
  }

  getParticipant(userId) {
    return this.participants.get(userId);
  }

  getHost() {
    for (const p of this.participants.values()) {
      if (p.role === 'host') return p;
    }
    return null;
  }

  hasParticipant(userId) {
    return this.participants.has(userId);
  }

  isEmpty() {
    return this.participants.size === 0;
  }

  participantList() {
    return Array.from(this.participants.values()).map((p) => p.toJSON());
  }

  addChatMessage(msg) {
    this.chatHistory.push(msg);
    if (this.chatHistory.length > 200) {
      this.chatHistory.shift();
    }

    // Persist to MongoDB asynchronously if connected
    const ChatMessageModel = require('../models/ChatMessageModel');
    const { ensureDBConnection } = require('../config/db');
    ensureDBConnection().then(isConnected => {
      if (isConnected) {
        ChatMessageModel.create({
          roomId: this.roomId,
          userId: msg.userId,
          username: msg.username,
          role: msg.role,
          message: msg.message,
          timestamp: msg.timestamp,
        }).catch((err) => console.warn('[DB] Failed to persist chat message:', err.message));
      }
    }).catch(console.error);
  }

  // ─── Queue Management ──────────────────────────────────────────────────────

  addVideoToQueue({ id, videoId, title, addedBy, addedByUsername }) {
    const item = {
      id: id || Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      videoId,
      title: title || 'YouTube Video',
      addedBy: addedBy || '',
      addedByUsername: addedByUsername || 'Anonymous',
      timestamp: Date.now(),
    };
    this.queue.push(item);
    this.persistRoomState();
    return item;
  }

  removeVideoFromQueue(itemId) {
    const index = this.queue.findIndex(item => item.id === itemId);
    if (index !== -1) {
      const removed = this.queue.splice(index, 1)[0];
      this.persistRoomState();
      return removed;
    }
    return null;
  }

  popNextVideoFromQueue() {
    if (this.queue.length === 0) return null;
    const nextItem = this.queue.shift();
    this.updateVideoState({
      videoId: nextItem.videoId,
      playState: 'playing',
      currentTime: 0,
    });
    return nextItem;
  }

  // ─── Video State ──────────────────────────────────────────────────────────

  /**
   * Compute the effective current time, accounting for elapsed time since last update.
   */
  getEffectiveCurrentTime() {
    if (this.videoState.playState === 'playing') {
      const elapsed = (Date.now() - this.videoState.lastUpdatedAt) / 1000;
      return this.videoState.currentTime + elapsed;
    }
    return this.videoState.currentTime;
  }

  updateVideoState(patch) {
    this.videoState = {
      ...this.videoState,
      ...patch,
      lastUpdatedAt: Date.now(),
    };

    this.persistRoomState();
  }

  persistRoomState() {
    // Persist to MongoDB asynchronously if connected
    const RoomModel = require('../models/RoomModel');
    const { ensureDBConnection } = require('../config/db');
    ensureDBConnection().then(isConnected => {
      if (isConnected) {
        RoomModel.findOneAndUpdate(
          { roomId: this.roomId },
          { videoState: this.videoState, queue: this.queue, lastActiveAt: new Date() },
          { upsert: true }
        ).catch((err) => console.warn('[DB] Failed to persist room state:', err.message));
      }
    }).catch(console.error);
  }

  currentSyncPayload() {
    return {
      videoId: this.videoState.videoId,
      playState: this.videoState.playState,
      currentTime: this.getEffectiveCurrentTime(),
      queue: this.queue,
    };
  }

  // ─── Broadcast Helpers ────────────────────────────────────────────────────

  /** Broadcast to all sockets in this room */
  broadcast(event, payload) {
    this.io.to(this.roomId).emit(event, payload);
  }

  /** Broadcast to everyone EXCEPT the sender */
  broadcastExcept(senderSocket, event, payload) {
    senderSocket.to(this.roomId).emit(event, payload);
  }

  /** Auto-promote oldest remaining participant to host when host leaves */
  promoteOldestToHost() {
    let oldest = null;
    for (const p of this.participants.values()) {
      if (!oldest || p.joinedAt < oldest.joinedAt) {
        oldest = p;
      }
    }
    if (oldest) {
      oldest.role = 'host';
      return oldest;
    }
    return null;
  }
}

module.exports = Room;
