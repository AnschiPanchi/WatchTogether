/**
 * Participant class - Represents a single user in a Watch Party room.
 */
class Participant {
  /**
   * @param {string} userId - Unique socket ID
   * @param {string} username - Display name
   * @param {'host'|'moderator'|'participant'} role
   * @param {import('socket.io').Socket} socket
   */
  constructor(userId, username, role, socket) {
    this.userId = userId;
    this.username = username;
    this.role = role;
    this.socket = socket;
    this.joinedAt = Date.now();
  }

  canControlPlayback() {
    return this.role === 'host' || this.role === 'moderator';
  }

  canManageRoom() {
    return this.role === 'host';
  }

  toJSON() {
    return {
      userId: this.userId,
      username: this.username,
      role: this.role,
      joinedAt: this.joinedAt,
    };
  }
}

module.exports = Participant;
