# Backend Server - WalletConnect Demo

Node.js + Express + Socket.io server hoạt động như relay giữa Web App và Mobile App.

## 📁 File Structure

```
backend/
├── server.js       # Main server file với Socket.io logic
├── package.json    # Dependencies và scripts
└── README.md       # Tài liệu này
```

## 🔧 Installation

```bash
npm install
```

## 🚀 Running

### Development mode (với nodemon)
```bash
npm run dev
```

### Production mode
```bash
npm start
```

Server sẽ chạy tại `http://localhost:3001`

## 📡 API Endpoints

### REST API

#### `POST /api/create-session`
Tạo session mới cho web app

**Response:**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Session created successfully"
}
```

#### `GET /api/session/:sessionId`
Kiểm tra trạng thái session

**Response:**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "connected",
  "connected": true
}
```

#### `GET /health`
Health check endpoint

**Response:**
```json
{
  "status": "ok",
  "sessions": 5,
  "timestamp": 1234567890
}
```

## 🔌 Socket.io Events

### Web Client Events

#### Emit (Web → Server)
- `web:join` - Join session
  ```javascript
  socket.emit('web:join', { sessionId: 'uuid' })
  ```

- `web:signMessage` - Request sign message
  ```javascript
  socket.emit('web:signMessage', {
    requestId: 'sign-123',
    message: 'Hello World'
  })
  ```

- `web:sendTransaction` - Request send transaction
  ```javascript
  socket.emit('web:sendTransaction', {
    requestId: 'tx-123',
    to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
    amount: '0.1'
  })
  ```

#### Listen (Server → Web)
- `web:joined` - Confirmation of joining session
- `mobile:connected` - Mobile wallet connected
- `mobile:disconnected` - Mobile wallet disconnected
- `web:response` - Response from mobile app
- `error` - Error messages

### Mobile Client Events

#### Emit (Mobile → Server)
- `mobile:join` - Join session after scanning QR
  ```javascript
  socket.emit('mobile:join', { sessionId: 'uuid' })
  ```

- `mobile:response` - Send response to web request
  ```javascript
  socket.emit('mobile:response', {
    requestId: 'sign-123',
    type: 'signMessage',
    approved: true,
    result: { signature: '0x...' }
  })
  ```

#### Listen (Server → Mobile)
- `mobile:joined` - Confirmation of joining session
- `mobile:signRequest` - Sign message request from web
- `mobile:transactionRequest` - Transaction request from web
- `error` - Error messages

## 🗄️ Data Structures

### Session Object
```javascript
{
  webSocketId: 'socket-id-1',      // Web client socket ID
  mobileSocketId: 'socket-id-2',   // Mobile client socket ID
  status: 'connected',             // pending | connected | disconnected
  createdAt: 1234567890            // Timestamp
}
```

## 🔄 Flow Diagrams

### Connection Flow
```
1. Web creates session    → POST /api/create-session
2. Web joins via socket   → emit 'web:join'
3. Mobile scans QR        → gets sessionId
4. Mobile joins via socket → emit 'mobile:join'
5. Server notifies web    → emit 'mobile:connected'
```

### Request/Response Flow
```
1. Web sends request      → emit 'web:signMessage'
2. Server relays to mobile → emit 'mobile:signRequest'
3. Mobile sends response   → emit 'mobile:response'
4. Server relays to web    → emit 'web:response'
```

## ⚙️ Configuration

### Environment Variables

Tạo file `.env` (optional):
```env
PORT=3001
NODE_ENV=development
```

### CORS Configuration

CORS được config cho phép tất cả origins trong development:
```javascript
cors: {
  origin: "*",
  methods: ["GET", "POST"]
}
```

**Production**: Nên giới hạn origins cụ thể:
```javascript
cors: {
  origin: ["https://yourdomain.com"],
  methods: ["GET", "POST"]
}
```

## 🧹 Cleanup Process

Server tự động dọn dẹp sessions cũ mỗi 10 phút:
- Sessions > 1 giờ và status = 'disconnected' sẽ bị xóa
- Giúp tránh memory leak

## 🐛 Debugging

### Enable verbose logging

Thêm console logs chi tiết hơn:
```javascript
// Socket connection
io.on('connection', (socket) => {
  console.log('New connection:', {
    socketId: socket.id,
    handshake: socket.handshake
  });
});
```

### Monitor sessions
```javascript
// Add endpoint to view all sessions
app.get('/api/sessions', (req, res) => {
  const sessionList = Array.from(sessions.entries()).map(([id, data]) => ({
    sessionId: id,
    ...data
  }));
  res.json(sessionList);
});
```

## 🧪 Testing

### Test REST API
```bash
# Create session
curl -X POST http://localhost:3001/api/create-session

# Check session status
curl http://localhost:3001/api/session/{sessionId}

# Health check
curl http://localhost:3001/health
```

### Test Socket.io

Sử dụng socket.io-client trong Node.js:
```javascript
const io = require('socket.io-client');
const socket = io('http://localhost:3001');

socket.emit('web:join', { sessionId: 'test-session' });

socket.on('web:joined', (data) => {
  console.log('Joined:', data);
});
```

## 🚨 Error Handling

Server xử lý các lỗi phổ biến:

1. **Invalid session ID**: Return error message
2. **Client disconnect**: Update session status
3. **Request timeout**: Handled by client
4. **Socket errors**: Logged and emitted to client

## 📊 Performance

- Sử dụng Map thay vì Object để lưu sessions (faster lookup)
- Socket.io rooms để optimize event broadcasting
- Cleanup interval để tránh memory leak
- Connection pooling với socket.io built-in

## 🔐 Security Considerations

**Current (Demo):**
- No authentication
- No encryption
- No rate limiting
- Open CORS policy

**Production TODO:**
- Add JWT authentication
- Implement WSS (WebSocket Secure)
- Add rate limiting
- Validate all inputs
- Implement proper CORS
- Add request signing
- Session encryption

## 📝 Logs

Server logs bao gồm:
- 🔌 Client connections/disconnections
- 📱 Session creation/cleanup
- ✍️ Sign message requests
- 💸 Transaction requests
- ✅/❌ Approvals/rejections

## 🛠️ Dependencies

- `express`: Web framework
- `socket.io`: Real-time communication
- `cors`: CORS middleware
- `uuid`: Generate session IDs

## 🔧 Development

### Add new event type

1. Thêm handler trong server.js:
```javascript
socket.on('web:newEvent', (data) => {
  const sessionId = socketToSession.get(socket.id);
  const session = sessions.get(sessionId);

  if (session.mobileSocketId) {
    io.to(session.mobileSocketId).emit('mobile:newEvent', data);
  }
});
```

2. Update mobile response handler nếu cần

### Add middleware

```javascript
io.use((socket, next) => {
  // Authentication, validation, etc.
  next();
});
```

## 📈 Monitoring

Recommended tools:
- PM2 for process management
- Winston for logging
- Socket.io Admin UI for monitoring connections
- New Relic/DataDog for APM
