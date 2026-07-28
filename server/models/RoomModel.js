const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  videoState: {
    videoId: { type: String, default: 'dQw4w9WgXcQ' },
    playState: { type: String, enum: ['playing', 'paused'], default: 'paused' },
    currentTime: { type: Number, default: 0 },
    lastUpdatedAt: { type: Number, default: Date.now },
  },
  queue: [
    {
      id: { type: String, required: true },
      videoId: { type: String, required: true },
      title: { type: String, default: '' },
      addedBy: { type: String, default: '' },
      addedByUsername: { type: String, default: '' },
      timestamp: { type: Number, default: Date.now },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastActiveAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Room', RoomSchema);
