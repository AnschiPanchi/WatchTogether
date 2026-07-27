const { v4: uuidv4 } = require('uuid');
const Room = require('./Room');
const Participant = require('./Participant');

/**
 * EventRouter - Validates incoming Socket.IO events against role permissions
 * and delegates to Room methods. Server-side RBAC lives entirely here.
 */
class EventRouter {
  /**
   * @param {import('socket.io').Server} io
   */
  constructor(io) {
    this.io = io;
    /** @type {Map<string, Room>} */
    this.rooms = new Map();

    // Bind the connection handler
    this.io.on('connection', (socket) => this._onConnection(socket));

    // Periodic sync to prevent drift (every 10 seconds)
    setInterval(() => this._periodicSync(), 10_000);
  }

  // ─── Connection ───────────────────────────────────────────────────────────

  _onConnection(socket) {
    console.log(`[connect] ${socket.id}`);

    socket.on('join_room', (data) => this._onJoinRoom(socket, data));
    socket.on('leave_room', (data) => this._onLeaveRoom(socket, data));
    socket.on('play', (data) => this._onPlay(socket, data));
    socket.on('pause', (data) => this._onPause(socket, data));
    socket.on('seek', (data) => this._onSeek(socket, data));
    socket.on('change_video', (data) => this._onChangeVideo(socket, data));
    socket.on('assign_role', (data) => this._onAssignRole(socket, data));
    socket.on('remove_participant', (data) => this._onRemoveParticipant(socket, data));
    socket.on('transfer_host', (data) => this._onTransferHost(socket, data));
    socket.on('chat_message', (data) => this._onChatMessage(socket, data));

    socket.on('disconnect', () => this._onDisconnect(socket));
  }

  // ─── Room Lookup Helpers ──────────────────────────────────────────────────

  _getRoomAndParticipant(socket) {
    // Find which room this socket belongs to
    for (const room of this.rooms.values()) {
      if (room.hasParticipant(socket.id)) {
        const participant = room.getParticipant(socket.id);
        return { room, participant };
      }
    }
    return { room: null, participant: null };
  }

  _requireControlPermission(socket, room) {
    const p = room.getParticipant(socket.id);
    if (!p || !p.canControlPlayback()) {
      socket.emit('error_event', { message: 'Insufficient permissions.' });
      return false;
    }
    return true;
  }

  _requireHostPermission(socket, room) {
    const p = room.getParticipant(socket.id);
    if (!p || !p.canManageRoom()) {
      socket.emit('error_event', { message: 'Only the host can perform this action.' });
      return false;
    }
    return true;
  }

  // ─── Event Handlers ───────────────────────────────────────────────────────

  _onJoinRoom(socket, { roomId, username } = {}) {
    if (!username || typeof username !== 'string') {
      socket.emit('error_event', { message: 'Username is required.' });
      return;
    }

    username = username.trim().slice(0, 32);
    if (!username) {
      socket.emit('error_event', { message: 'Username cannot be empty.' });
      return;
    }

    let room;
    let role;

    if (!roomId) {
      // CREATE a new room
      roomId = uuidv4().slice(0, 8).toUpperCase();
      room = new Room(roomId, this.io);
      this.rooms.set(roomId, room);
      role = 'host';
      console.log(`[room:create] ${roomId} by ${username}`);
    } else {
      roomId = roomId.toUpperCase();
      room = this.rooms.get(roomId);
      if (!room) {
        socket.emit('error_event', { message: 'Room not found.' });
        return;
      }
      role = 'participant';
    }

    const participant = new Participant(socket.id, username, role, socket);
    room.addParticipant(participant);
    socket.join(roomId);

    console.log(`[room:join] ${username} (${role}) → ${roomId}`);

    // Confirm to the joining user
    socket.emit('joined_room', {
      roomId,
      userId: socket.id,
      role,
      syncState: room.currentSyncPayload(),
      participants: room.participantList(),
      chatHistory: room.chatHistory,
    });

    // Broadcast to others
    room.broadcastExcept(socket, 'user_joined', {
      username,
      userId: socket.id,
      role,
      participants: room.participantList(),
    });
  }

  _onLeaveRoom(socket, { roomId } = {}) {
    if (!roomId) return;
    roomId = roomId.toUpperCase();
    const room = this.rooms.get(roomId);
    if (!room) return;
    this._handleLeave(socket, room);
  }

  _onDisconnect(socket) {
    console.log(`[disconnect] ${socket.id}`);
    const { room } = this._getRoomAndParticipant(socket);
    if (room) this._handleLeave(socket, room);
  }

  _handleLeave(socket, room) {
    const removed = room.removeParticipant(socket.id);
    if (!removed) return;

    socket.leave(room.roomId);

    if (room.isEmpty()) {
      this.rooms.delete(room.roomId);
      console.log(`[room:closed] ${room.roomId}`);
      return;
    }

    let newHost = null;
    // If the host left, auto-promote
    if (removed.role === 'host') {
      newHost = room.promoteOldestToHost();
      console.log(`[host:transfer] Auto-promoted ${newHost?.username} in room ${room.roomId}`);
    }

    const payload = {
      username: removed.username,
      userId: removed.userId,
      participants: room.participantList(),
    };

    if (newHost) {
      payload.newHostId = newHost.userId;
      payload.newHostUsername = newHost.username;
    }

    room.broadcast('user_left', payload);
  }

  _onPlay(socket, _data) {
    const { room } = this._getRoomAndParticipant(socket);
    if (!room || !this._requireControlPermission(socket, room)) return;

    room.updateVideoState({ playState: 'playing' });
    room.broadcast('sync_state', { ...room.currentSyncPayload(), triggeredBy: socket.id });
    console.log(`[play] room ${room.roomId}`);
  }

  _onPause(socket, { currentTime } = {}) {
    const { room } = this._getRoomAndParticipant(socket);
    if (!room || !this._requireControlPermission(socket, room)) return;

    room.updateVideoState({
      playState: 'paused',
      currentTime: typeof currentTime === 'number' ? currentTime : room.getEffectiveCurrentTime(),
    });
    room.broadcast('sync_state', { ...room.currentSyncPayload(), triggeredBy: socket.id });
    console.log(`[pause] room ${room.roomId} at ${room.videoState.currentTime.toFixed(2)}s`);
  }

  _onSeek(socket, { time } = {}) {
    const { room } = this._getRoomAndParticipant(socket);
    if (!room || !this._requireControlPermission(socket, room)) return;
    if (typeof time !== 'number' || time < 0) {
      socket.emit('error_event', { message: 'Invalid seek time.' });
      return;
    }

    room.updateVideoState({ currentTime: time });
    room.broadcast('sync_state', { ...room.currentSyncPayload(), triggeredBy: socket.id });
    console.log(`[seek] room ${room.roomId} → ${time.toFixed(2)}s`);
  }

  _onChangeVideo(socket, { videoId } = {}) {
    const { room } = this._getRoomAndParticipant(socket);
    if (!room || !this._requireControlPermission(socket, room)) return;
    if (!videoId || typeof videoId !== 'string') {
      socket.emit('error_event', { message: 'Invalid video ID.' });
      return;
    }

    room.updateVideoState({ videoId: videoId.trim(), playState: 'paused', currentTime: 0 });
    room.broadcast('sync_state', { ...room.currentSyncPayload(), triggeredBy: socket.id });
    console.log(`[change_video] room ${room.roomId} → ${videoId}`);
  }

  _onAssignRole(socket, { userId, role } = {}) {
    const { room } = this._getRoomAndParticipant(socket);
    if (!room || !this._requireHostPermission(socket, room)) return;

    const validRoles = ['moderator', 'participant'];
    if (!validRoles.includes(role)) {
      socket.emit('error_event', { message: 'Invalid role. Must be moderator or participant.' });
      return;
    }

    const target = room.getParticipant(userId);
    if (!target) {
      socket.emit('error_event', { message: 'Participant not found.' });
      return;
    }
    if (target.role === 'host') {
      socket.emit('error_event', { message: 'Cannot change the host\'s role this way.' });
      return;
    }

    target.role = role;
    room.broadcast('role_assigned', {
      userId,
      username: target.username,
      role,
      participants: room.participantList(),
    });
    console.log(`[role] ${target.username} → ${role} in room ${room.roomId}`);
  }

  _onRemoveParticipant(socket, { userId } = {}) {
    const { room } = this._getRoomAndParticipant(socket);
    if (!room || !this._requireHostPermission(socket, room)) return;

    const target = room.getParticipant(userId);
    if (!target) {
      socket.emit('error_event', { message: 'Participant not found.' });
      return;
    }
    if (target.role === 'host') {
      socket.emit('error_event', { message: 'Cannot remove the host.' });
      return;
    }

    room.removeParticipant(userId);
    target.socket.leave(room.roomId);
    target.socket.emit('removed_from_room', { message: 'You have been removed from the room by the host.' });

    room.broadcast('participant_removed', {
      userId,
      username: target.username,
      participants: room.participantList(),
    });
    console.log(`[remove] ${target.username} removed from room ${room.roomId}`);
  }

  _onTransferHost(socket, { userId } = {}) {
    const { room } = this._getRoomAndParticipant(socket);
    if (!room || !this._requireHostPermission(socket, room)) return;

    const currentHost = room.getParticipant(socket.id);
    const newHost = room.getParticipant(userId);
    if (!newHost) {
      socket.emit('error_event', { message: 'Participant not found.' });
      return;
    }

    currentHost.role = 'participant';
    newHost.role = 'host';

    // Broadcast demotion of the old host
    room.broadcast('role_assigned', {
      userId: currentHost.userId,
      username: currentHost.username,
      role: 'participant',
      participants: room.participantList(),
    });

    // Broadcast promotion of the new host
    room.broadcast('role_assigned', {
      userId: newHost.userId,
      username: newHost.username,
      role: 'host',
      participants: room.participantList(),
    });
    console.log(`[host:transfer] ${currentHost.username} → ${newHost.username} in room ${room.roomId}`);
  }

  _onChatMessage(socket, { message } = {}) {
    const { room, participant } = this._getRoomAndParticipant(socket);
    if (!room || !participant) return;
    if (!message || typeof message !== 'string') return;

    const trimmed = message.trim().slice(0, 500);
    if (!trimmed) return;

    const msgPayload = {
      userId: socket.id,
      username: participant.username,
      role: participant.role,
      message: trimmed,
      timestamp: Date.now(),
    };

    room.addChatMessage(msgPayload);
    room.broadcast('chat_message', msgPayload);
  }

  // ─── Periodic Drift Correction ────────────────────────────────────────────

  _periodicSync() {
    for (const room of this.rooms.values()) {
      if (!room.isEmpty()) {
        room.broadcast('sync_state', room.currentSyncPayload());
      }
    }
  }

  // ─── REST API Helpers ──────────────────────────────────────────────────────

  getRoomInfo(roomId) {
    const room = this.rooms.get(roomId?.toUpperCase());
    if (!room) return null;
    return {
      roomId: room.roomId,
      participants: room.participantList(),
      videoState: room.currentSyncPayload(),
      createdAt: room.createdAt,
    };
  }

  getRoomCount() {
    return this.rooms.size;
  }
}

module.exports = EventRouter;
