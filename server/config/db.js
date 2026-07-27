const mongoose = require('mongoose');

let isConnected = false;

/**
 * Connects to MongoDB database using MONGO_URI from env.
 * Includes graceful fallback if connection fails or MONGO_URI is omitted.
 */
async function connectDB() {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.log('[DB] ⚠️ MONGO_URI not provided. Operating in memory-only mode.');
    return false;
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log('[DB] ✅ Connected to MongoDB successfully.');
    return true;
  } catch (err) {
    console.warn('[DB] ⚠️ MongoDB connection failed:', err.message);
    console.warn('[DB] ℹ️ Operating with in-memory fallback.');
    return false;
  }
}

function getIsConnected() {
  return isConnected;
}

module.exports = { connectDB, getIsConnected };
