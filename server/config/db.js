const mongoose = require('mongoose');

let cachedConnection = null;

/**
 * Connects to MongoDB database using MONGO_URI from env.
 * Caches the connection for Serverless environments (like Vercel).
 */
async function ensureDBConnection() {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.log('[DB] ⚠️ MONGO_URI not provided.');
    return false;
  }

  // If already connected or connecting, wait for it
  if (cachedConnection) {
    return cachedConnection;
  }

  console.log('[DB] 🔄 Initiating new MongoDB connection...');
  cachedConnection = mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 5000,
  }).then(() => {
    console.log('[DB] ✅ Connected to MongoDB successfully.');
    return true;
  }).catch((err) => {
    console.warn('[DB] ⚠️ MongoDB connection failed:', err.message);
    cachedConnection = null; // reset so we can try again
    return false;
  });

  return cachedConnection;
}

module.exports = { ensureDBConnection };
