# Web App - WalletConnect Demo

React + Vite web application với QR code generation và Socket.io integration.

## 📁 File Structure

```
web/
├── src/
│   ├── App.jsx       # Main component với logic chính
│   ├── main.jsx      # Entry point
│   └── index.css     # Global styles
├── index.html        # HTML template
├── vite.config.js    # Vite configuration
├── package.json      # Dependencies và scripts
└── README.md         # Tài liệu này
```

## 🔧 Installation

```bash
npm install
```

## 🚀 Running

### Development mode
```bash
npm run dev
```
App sẽ chạy tại `http://localhost:3000`

### Build for production
```bash
npm run build
```
Output sẽ ở trong folder `dist/`

### Preview production build
```bash
npm run preview
```

## 🎨 Features

### 1. QR Code Generation
- Tự động tạo QR code khi click "Connect Wallet"
- QR code chứa sessionId và serverUrl
- Format: `{ sessionId: 'uuid', serverUrl: 'http://...' }`

### 2. Socket.io Integration
- Real-time connection với backend
- Auto-reconnect khi mất kết nối
- Event-driven architecture

### 3. Connection Management
- Hiển thị trạng thái kết nối (pending/connected)
- Auto-detect khi mobile connect/disconnect
- Error handling và display

### 4. Request Handling
- Sign Message: Gửi text message để mobile ký
- Send Transaction: Gửi transaction details đến mobile
- Pending state management
- Response display với format JSON

## 🔌 Socket.io Events

### Emit (Web → Backend)

```javascript
// Join session
socket.emit('web:join', { sessionId })

// Request sign message
socket.emit('web:signMessage', {
  requestId: 'sign-{timestamp}',
  message: 'Hello World'
})

// Request send transaction
socket.emit('web:sendTransaction', {
  requestId: 'tx-{timestamp}',
  to: '0x...',
  amount: '0.1'
})
```

### Listen (Backend → Web)

```javascript
// Joined session confirmation
socket.on('web:joined', (data) => {
  // { sessionId, status }
})

// Mobile connected
socket.on('mobile:connected', (data) => {
  // { sessionId, message }
})

// Mobile disconnected
socket.on('mobile:disconnected', (data) => {
  // { sessionId }
})

// Response from mobile
socket.on('web:response', (data) => {
  // { requestId, approved, result, type }
})

// Error handling
socket.on('error', (error) => {
  // { message }
})
```

## 🎯 Component State

### Connection State
```javascript
const [socket, setSocket] = useState(null)              // Socket.io instance
const [sessionId, setSessionId] = useState(null)        // Current session ID
const [connectionStatus, setConnectionStatus] = useState('disconnected')
// 'disconnected' | 'pending' | 'connected'
const [errorMessage, setErrorMessage] = useState('')    // Error display
```

### Request State
```javascript
const [message, setMessage] = useState('Hello...')      // Message to sign
const [toAddress, setToAddress] = useState('0x...')     // Transaction recipient
const [amount, setAmount] = useState('0.1')             // Transaction amount
const [pendingRequest, setPendingRequest] = useState(null) // Current pending request
const [response, setResponse] = useState(null)          // Latest response
```

## 🔄 Flow Diagrams

### Connection Flow
```
1. User clicks "Connect Wallet"
2. POST /api/create-session → get sessionId
3. Display QR code with sessionId
4. socket.emit('web:join', { sessionId })
5. Wait for mobile to scan and connect
6. Receive 'mobile:connected' event
7. Status → 'connected'
```

### Sign Message Flow
```
1. User enters message
2. Click "Sign Message"
3. Generate requestId
4. socket.emit('web:signMessage', { requestId, message })
5. Set pending state
6. Wait for mobile approval
7. Receive 'web:response' event
8. Display signature
```

### Send Transaction Flow
```
1. User enters to address and amount
2. Click "Send Transaction"
3. Generate requestId
4. socket.emit('web:sendTransaction', { requestId, to, amount })
5. Set pending state
6. Wait for mobile approval
7. Receive 'web:response' event
8. Display transaction hash
```

## ⚙️ Configuration

### Backend URL

Thay đổi trong `src/App.jsx`:
```javascript
const BACKEND_URL = 'http://localhost:3001';
```

**Production**: Sử dụng environment variables:
```javascript
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
```

Tạo `.env` file:
```env
VITE_BACKEND_URL=https://your-backend.com
```

### Socket.io Configuration

```javascript
const newSocket = io(BACKEND_URL, {
  transports: ['websocket', 'polling'],  // Try WebSocket first
  reconnection: true,                     // Enable auto-reconnect
  reconnectionDelay: 1000,                // Wait 1s before reconnect
  reconnectionAttempts: 5                 // Try 5 times
});
```

## 🎨 Styling

### CSS Architecture
- Global styles trong `index.css`
- Gradient background với purple theme
- Responsive card-based layout
- Button states (normal, hover, disabled)
- Modal overlay để hiển thị loading/status

### Key CSS Classes
```css
.container        # Main white card container
.status           # Status banner (pending/connected/error)
.qr-section       # QR code display area
.actions          # Button container
.btn              # Button base
.btn-primary      # Primary action button
.btn-secondary    # Secondary action button
.response         # Response display box
.loading          # Loading spinner
```

### Customization

Thay đổi theme colors:
```css
/* Primary gradient */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* Accent colors */
--primary: #667eea;
--success: #28a745;
--danger: #dc3545;
```

## 🧪 Testing

### Manual Testing Checklist

1. ✅ Connect wallet generates QR code
2. ✅ QR code contains valid JSON
3. ✅ Mobile scan establishes connection
4. ✅ Status updates to "connected"
5. ✅ Sign message sends request
6. ✅ Response displays correctly
7. ✅ Send transaction sends request
8. ✅ Transaction response displays
9. ✅ Disconnect clears state
10. ✅ New connection works after disconnect

### Error Scenarios

Test error handling:
- ❌ Backend offline
- ❌ Mobile disconnects mid-request
- ❌ Invalid session ID
- ❌ Network interruption
- ❌ Socket timeout

## 🐛 Debugging

### Enable Console Logs

Component đã có console.logs built-in:
```javascript
console.log('✅ Connected to backend');
console.log('📱 Mobile connected:', data);
console.log('✍️ Sent sign message request:', requestId);
console.log('💸 Sent transaction request:', requestId);
console.log('📥 Response from mobile:', data);
```

### Browser DevTools

1. Open DevTools → Network tab
2. Filter by "WS" to see WebSocket connections
3. Monitor Socket.io frames
4. Check for connection drops

### React DevTools

Install React DevTools extension để inspect:
- Component state
- Props flow
- Re-render performance

## 🚨 Common Issues

### "Connection failed"
- Check if backend is running
- Verify BACKEND_URL is correct
- Check CORS configuration in backend

### "Mobile wallet not connected"
- Ensure mobile app scanned QR successfully
- Check network connectivity
- Verify both devices on same network (if using local IP)

### QR code not displaying
- Check if sessionId was created
- Verify qrcode.react is installed
- Check browser console for errors

### Responses not showing
- Verify socket connection is active
- Check if mobile sent response
- Inspect socket event names match

## 📱 Mobile Testing

### Testing với thật device
1. Get local IP: `ipconfig` (Windows) hoặc `ifconfig` (Mac/Linux)
2. Update BACKEND_URL: `http://192.168.1.x:3001`
3. Ensure firewall allows connections
4. Mobile và máy tính cùng WiFi

### Testing với emulator
- **Android**: Sử dụng `http://10.0.2.2:3001`
- **iOS**: Sử dụng `http://localhost:3001`

## 🔐 Security Considerations

**Current implementation (Demo):**
- ❌ No input validation
- ❌ No XSS protection beyond React defaults
- ❌ No rate limiting
- ❌ Sensitive data in console logs

**Production TODO:**
- ✅ Input sanitization
- ✅ Remove console logs
- ✅ HTTPS/WSS only
- ✅ Content Security Policy
- ✅ Rate limiting
- ✅ Request signing

## 📊 Performance

### Optimization tips
- QR code chỉ render khi cần (conditional rendering)
- Socket connection reused across component lifecycle
- Debounce input fields nếu cần
- Lazy load qrcode.react library

### Bundle size
```bash
npm run build

# Check bundle size
ls -lh dist/assets/
```

## 🛠️ Dependencies

### Core
- `react`: UI framework
- `react-dom`: React renderer
- `socket.io-client`: WebSocket client
- `qrcode.react`: QR code generator

### Dev
- `vite`: Build tool
- `@vitejs/plugin-react`: React plugin for Vite

## 🔧 Customization

### Add new request type

1. Add state:
```javascript
const [customData, setCustomData] = useState('');
```

2. Add handler:
```javascript
const handleCustomRequest = () => {
  const requestId = `custom-${Date.now()}`;
  socket.emit('web:customRequest', { requestId, customData });
};
```

3. Add UI:
```javascript
<button onClick={handleCustomRequest}>
  Custom Request
</button>
```

### Customize QR code

```javascript
<QRCodeSVG
  value={qrData}
  size={200}              // Size in pixels
  level="H"               // Error correction: L, M, Q, H
  includeMargin={true}    // Add white margin
  bgColor="#ffffff"       // Background color
  fgColor="#000000"       // Foreground color
/>
```

## 📈 Next Steps

Potential enhancements:
- [ ] Add loading animations
- [ ] Transaction history display
- [ ] Multi-session support
- [ ] Dark mode toggle
- [ ] Notification system
- [ ] Session timeout warning
- [ ] Internationalization (i18n)
