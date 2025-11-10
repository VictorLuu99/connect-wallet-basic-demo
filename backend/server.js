/**
 * Phoenix WalletConnect Backend Server - Zero-Trust Architecture
 *
 * This is a STATELESS RELAY SERVER that:
 * - Manages Socket.io rooms for real-time communication
 * - Forwards encrypted messages between dApp and wallet (cannot decrypt)
 * - Provides rate limiting for DoS protection
 * - Does NOT validate, verify, or store any session data
 *
 * Security: All messages are E2E encrypted with TweetNaCl (Curve25519)
 * Backend cannot read message content - acts as dumb relay only.
 *
 * Phoenix SDK Protocol Events:
 * - join: Join room by UUID
 * - connected_uuid: Wallet notifies dApp of connection
 * - dapp:request → wallet:request: dApp sends request to wallet
 * - wallet:response → dapp:response: Wallet sends response to dApp
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
 * 
 * Phoenix SDK Protocol Events:
 * - join: Join room by UUID
 * - connected_uuid: Wallet notifies dApp of connection
 * - dapp:request: dApp sends request → forwarded as wallet:request
 * - wallet:response: Wallet sends response → forwarded as dapp:response
 */
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  /**
   * Join a room (identified by UUID)
   * Phoenix SDK uses 'join' event (not 'join-room')
   * Both dApp and wallet join the same room using UUID from QR code
   */
  socket.on('join', (data) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('error', { message: 'Rate limit exceeded' });
      return;
    }

    const { uuid } = data;

    if (!uuid || typeof uuid !== 'string' || uuid.length > 100) {
      socket.emit('error', { message: 'Invalid UUID' });
      return;
    }

    socket.join(uuid);
    console.log(`✅ Client ${socket.id} joined room: ${uuid}`);
  });

  /**
   * Wallet emits 'connected_uuid' after joining room
   * Backend broadcasts to room (dApp listens for this)
   * Includes wallet's public key so dApp can encrypt messages
   */
  socket.on('connected_uuid', (data) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('error', { message: 'Rate limit exceeded' });
      return;
    }

    const { uuid } = data;
    console.log("connected_uuid", data);
    

    if (!uuid || typeof uuid !== 'string') {
      socket.emit('error', { message: 'Missing or invalid UUID' });
      return;
    }

    // Broadcast to room (dApp will receive this)
    // Backend just forwards - public key is not encrypted (it's meant to be public)
    io.to(uuid).emit('connected_uuid', data);

    console.log(`📱 Wallet connected to room: ${uuid}`);
  });

  /**
   * dApp sends encrypted request (unified event for signMessage/signTransaction)
   * Backend forwards encrypted blob to wallet as 'wallet:request' (cannot decrypt)
   * 
   * Phoenix SDK uses unified 'dapp:request' event for all request types
   * Request type (signMessage/signTransaction) is inside encrypted payload
   */
  socket.on('dapp:request', (data) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('error', { message: 'Rate limit exceeded' });
      return;
    }

    const { uuid, encryptedPayload, nonce, timestamp } = data;

    if (!uuid || !encryptedPayload || !nonce) {
      socket.emit('error', { message: 'Missing required fields' });
      return;
    }

    // Forward encrypted message to wallet (backend cannot read content)
    // Backend renames event: dapp:request → wallet:request
    socket.to(uuid).emit('wallet:request', {
      uuid,
      encryptedPayload,
      nonce,
      timestamp
    });

    console.log(`✍️  Relayed encrypted dApp request to wallet in room: ${uuid}`);
  });

  /**
   * Wallet sends encrypted response (approve/reject)
   * Backend forwards encrypted blob to dApp as 'dapp:response' (cannot decrypt)
   * 
   * Phoenix SDK uses 'wallet:response' event
   * Response status (success/error) is inside encrypted payload
   */
  socket.on('wallet:response', (data) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('error', { message: 'Rate limit exceeded' });
      return;
    }

    const { uuid, encryptedPayload, nonce, timestamp } = data;

    if (!uuid || !encryptedPayload || !nonce) {
      socket.emit('error', { message: 'Missing required fields' });
      return;
    }

    // Forward encrypted response to dApp (backend cannot read content)
    // Backend renames event: wallet:response → dapp:response
    socket.to(uuid).emit('dapp:response', {
      uuid,
      encryptedPayload,
      nonce,
      timestamp
    });

    console.log(`📤 Relayed encrypted wallet response to dApp in room: ${uuid}`);
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
    name: 'Phoenix WalletConnect Backend',
    version: '3.0.0',
    architecture: 'Zero-Trust E2E Encrypted Relay',
    encryption: 'TweetNaCl (Curve25519 + XSalsa20-Poly1305)',
    protocol: 'Phoenix SDK Protocol',
    events: {
      join: 'Join room by UUID',
      connected_uuid: 'Wallet notifies dApp of connection',
      'dapp:request': 'dApp sends request → forwarded as wallet:request',
      'wallet:request': 'Backend forwards dapp:request to wallet',
      'wallet:response': 'Wallet sends response → forwarded as dapp:response',
      'dapp:response': 'Backend forwards wallet:response to dApp'
    },
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
