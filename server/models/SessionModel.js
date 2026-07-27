const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    index: true,
  },
  userId: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['host', 'moderator', 'participant'],
    default: 'participant',
  },
  joinedAt: {
    type: Number,
    default: Date.now,
  },
});

module.exports = mongoose.model('Session', SessionSchema);
