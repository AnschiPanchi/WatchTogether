const mongoose = require('mongoose');

const ChatMessageSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    index: true,
    uppercase: true,
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
  message: {
    type: String,
    required: true,
    maxLength: 500,
  },
  timestamp: {
    type: Number,
    default: Date.now,
  },
});

module.exports = mongoose.model('ChatMessage', ChatMessageSchema);
