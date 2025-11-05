/**
 * WalletConnect Demo Backend Server - Zero-Trust Architecture
 *
 * This is a STATELESS RELAY SERVER that:
 * - Manages Socket.io rooms for real-time communication
 * - Forwards encrypted messages between web and mobile (cannot decrypt)
 * - Provides rate limiting for DoS protection
 * - Does NOT validate, verify, or store any session data
 *
 * Security: All messages are E2E encrypted with TweetNaCl (Curve25519)
 * Backend cannot read message content - acts as dumb relay only.
 */

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Configure CORS for Socket.io
const io = socketIO(server, {
  cors: {
    origin: "*", // In production, restrict to specific origins
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

/**
 * Simple rate limiter for DoS protection
 * Maps socket ID to request timestamps
 */
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 100; // Max 100 requests per minute

function checkRateLimit(socketId) {
  const now = Date.now();

  if (!rateLimitMap.has(socketId)) {
    rateLimitMap.set(socketId, [now]);
    return true;
  }

  const timestamps = rateLimitMap.get(socketId);

  // Remove timestamps outside the window
  const recentTimestamps = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);

  if (recentTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return false; // Rate limit exceeded
  }

  recentTimestamps.push(now);
  rateLimitMap.set(socketId, recentTimestamps);

  return true;
}

/**
 * Socket.io Connection Handler
 * Manages rooms and relays encrypted messages
 */
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  /**
   * Join a room (identified by UUID)
   * Both web and mobile join the same room using UUID from QR code
   */
  socket.on('join-room', (data) => {
    const { uuid } = data;

    if (!uuid || typeof uuid !== 'string' || uuid.length > 100) {
      socket.emit('error', { message: 'Invalid UUID' });
      return;
    }

    socket.join(uuid);
    console.log(`✅ Client ${socket.id} joined room: ${uuid}`);
  });

  /**
   * Mobile emits 'connected_uuid' after joining room
   * Backend broadcasts to room (web listens for this)
   */
  socket.on('connected_uuid', (data) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('error', { message: 'Rate limit exceeded' });
      return;
    }

    const { uuid, mobilePublicKey } = data;

    if (!uuid || !mobilePublicKey) {
      socket.emit('error', { message: 'Missing required fields' });
      return;
    }

    // Broadcast to room (web will receive this)
    socket.to(uuid).emit('connected_uuid', {
      uuid,
      mobilePublicKey
    });

    console.log(`📱 Mobile connected to room: ${uuid}`);
  });

  /**
   * Web sends encrypted sign message request
   * Backend forwards encrypted blob to mobile (cannot decrypt)
   */
  socket.on('web:signMessage', (data) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('error', { message: 'Rate limit exceeded' });
      return;
    }

    const { uuid, encryptedPayload, nonce, timestamp } = data;

    if (!uuid || !encryptedPayload || !nonce) {
      socket.emit('error', { message: 'Missing required fields' });
      return;
    }

    // Forward encrypted message to mobile (backend cannot read content)
    socket.to(uuid).emit('mobile:signRequest', {
      uuid,
      encryptedPayload,
      nonce,
      timestamp
    });

    console.log(`✍️  Relayed encrypted sign request to room: ${uuid}`);
  });

  /**
   * Web sends encrypted transaction request
   * Backend forwards encrypted blob to mobile (cannot decrypt)
   */
  socket.on('web:sendTransaction', (data) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('error', { message: 'Rate limit exceeded' });
      return;
    }

    const { uuid, encryptedPayload, nonce, timestamp } = data;

    if (!uuid || !encryptedPayload || !nonce) {
      socket.emit('error', { message: 'Missing required fields' });
      return;
    }

    // Forward encrypted message to mobile (backend cannot read content)
    socket.to(uuid).emit('mobile:transactionRequest', {
      uuid,
      encryptedPayload,
      nonce,
      timestamp
    });

    console.log(`💸 Relayed encrypted transaction request to room: ${uuid}`);
  });

  /**
   * Mobile sends encrypted response (approve/reject)
   * Backend forwards encrypted blob to web (cannot decrypt)
   */
  socket.on('mobile:response', (data) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('error', { message: 'Rate limit exceeded' });
      return;
    }

    const { uuid, encryptedPayload, nonce, timestamp } = data;

    if (!uuid || !encryptedPayload || !nonce) {
      socket.emit('error', { message: 'Missing required fields' });
      return;
    }

    // Forward encrypted response to web (backend cannot read content)
    socket.to(uuid).emit('web:response', {
      uuid,
      encryptedPayload,
      nonce,
      timestamp
    });

    console.log(`📤 Relayed encrypted response to room: ${uuid}`);
  });

  /**
   * Handle disconnect
   * Socket.io automatically removes socket from rooms
   */
  socket.on('disconnect', () => {
    // Cleanup rate limit data
    rateLimitMap.delete(socket.id);

    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    connectedClients: io.sockets.sockets.size
  });
});

/**
 * Root endpoint
 */
app.get('/', (req, res) => {
  res.json({
    name: 'WalletConnect Demo Backend',
    version: '2.0.0',
    architecture: 'Zero-Trust E2E Encrypted Relay',
    encryption: 'TweetNaCl (Curve25519 + XSalsa20-Poly1305)',
    note: 'Backend cannot decrypt messages - all communication is end-to-end encrypted'
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`📡 Socket.io relay server ready (stateless)`);
  console.log(`🔒 Zero-trust architecture - E2E encrypted`);
});

/**
 * Periodic cleanup of rate limit data (every 5 minutes)
 */
setInterval(() => {
  const now = Date.now();

  for (const [socketId, timestamps] of rateLimitMap.entries()) {
    // Remove entries older than the rate limit window
    const recentTimestamps = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);

    if (recentTimestamps.length === 0) {
      rateLimitMap.delete(socketId);
    } else {
      rateLimitMap.set(socketId, recentTimestamps);
    }
  }

  console.log(`🧹 Cleaned up rate limit data (${rateLimitMap.size} active clients)`);
}, 5 * 60 * 1000);
