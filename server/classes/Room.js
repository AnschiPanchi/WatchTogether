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
      videoId: 'dQw4w9WgXcQ', // default video
      playState: 'paused',
      currentTime: 0,
      lastUpdatedAt: Date.now(),
    };

    this.createdAt = Date.now();
    
    /** @type {Array<any>} */
    this.chatHistory = [];
  }

  // ─── Participant Management ───────────────────────────────────────────────

  addParticipant(participant) {
    this.participants.set(participant.userId, participant);
  }

  removeParticipant(userId) {
    const p = this.participants.get(userId);
    this.participants.delete(userId);
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
  }

  currentSyncPayload() {
    return {
      videoId: this.videoState.videoId,
      playState: this.videoState.playState,
      currentTime: this.getEffectiveCurrentTime(),
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
