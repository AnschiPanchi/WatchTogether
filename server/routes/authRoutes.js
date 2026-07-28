const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/UserModel');
const { getIsConnected } = require('../config/db');

const router = express.Router();

// ─── POST /api/auth/register ──────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  if (!getIsConnected()) {
    return res.status(503).json({ message: 'Database not available. Auth requires MongoDB.' });
  }

  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Username, email, and password are required.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters.' });
  }

  try {
    const isAlreadyRegistered = await UserModel.findOne({
      $or: [{ email: email.toLowerCase().trim() }],
    });

    if (isAlreadyRegistered) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

    const user = await UserModel.create({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
    });

    const accessToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        username: user.username,
        email: user.email,
      },
      accessToken,
    });
  } catch (err) {
    console.error('[Auth] Register error:', err.message);
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  if (!getIsConnected()) {
    return res.status(503).json({ message: 'Database not available. Auth requires MongoDB.' });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const user = await UserModel.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
    const isPasswordValid = hashedPassword === user.password;

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const accessToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(200).json({
      message: 'Logged in successfully',
      user: {
        username: user.username,
        email: user.email,
      },
      accessToken,
    });
  } catch (err) {
    console.error('[Auth] Login error:', err.message);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

// ─── GET /api/auth/get-me ─────────────────────────────────────────────────────
router.get('/get-me', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token not found' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!getIsConnected()) {
      return res.json({
        message: 'User fetched successfully',
        user: { username: decoded.username || 'User', email: decoded.email || '' },
      });
    }

    const user = await UserModel.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      message: 'User fetched successfully',
      user: {
        username: user.username,
        email: user.email,
      },
    });
  } catch (err) {
    console.error('[Auth] get-me error:', err.message);
    res.status(401).json({ message: 'Invalid or expired token' });
  }
});

module.exports = router;
