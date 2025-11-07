# 🔗 WalletConnect-like Demo (E2E Encrypted)

Demo mô phỏng cơ chế WalletConnect với **End-to-End Encryption**, cho phép Web App tương tác an toàn với blockchain thông qua Mobile Wallet App.

## 🔐 Security Architecture

**Zero-Trust E2E Encryption** - Backend cannot read message content
- 🔒 **TweetNaCl Encryption**: Curve25519 + XSalsa20-Poly1305
- 🛡️ **Stateless Backend**: Relay server only, no validation or storage
- 🔑 **Ephemeral Keys**: Session-specific key pairs for forward secrecy
- ⏱️ **Replay Protection**: Timestamp verification (5-minute window)
- 🏠 **Room-based Pattern**: UUID-based Socket.io rooms

## 🚀 Quick Start

**Want to get started immediately?**
- See **[QUICKSTART.md](./QUICKSTART.md)** for 5-minute setup
- Or run: `./INSTALL.sh` to auto-install all dependencies

**Having issues?**
- See **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** for solutions

**Documentation:**
- **[SESSION_PERSISTENCE.md](./SESSION_PERSISTENCE.md)** - Auto-restore sessions on reload (localStorage + AsyncStorage)
- **[TEST_SESSION_PERSISTENCE.md](./TEST_SESSION_PERSISTENCE.md)** - Testing guide with 7 test scenarios
- **[PHOENIX_SDK_INTEGRATION.md](./PHOENIX_SDK_INTEGRATION.md)** - SDK integration guide

## 📋 Mục tiêu

- Web App có thể thực hiện các chức năng blockchain (transfer fund, sign message)
- Ví (wallet) được quản lý ở Mobile App riêng biệt
- Người dùng scan QR code trên web để kết nối
- Mobile App hiển thị popup để approve/reject các request từ Web App
- **Tất cả messages được mã hóa E2E - Backend không thể đọc nội dung**

## 🏗️ Kiến trúc hệ thống

```
┌─────────────────────┐         ┌─────────────────────┐         ┌─────────────────────┐
│     Web App         │         │  Backend (Relay)    │         │    Mobile App       │
│                     │         │                     │         │                     │
│  React + Vite       │         │   Node.js +         │         │  React Native       │
│  🔑 Generate Keys   │◄───────►│   Socket.io         │◄───────►│  🔑 Generate Keys   │
│  🔒 Encrypt Request │ Encrypted│   📡 Relay Only     │ Encrypted│  🔓 Decrypt Request │
│  🔓 Decrypt Response│ Messages │   (Cannot Decrypt)  │ Messages │  🔒 Encrypt Response│
│  📱 QR Display      │         │   🏠 Room-based     │         │  📸 QR Scanner      │
└─────────────────────┘         └─────────────────────┘         └─────────────────────┘
        │                                                                   │
        │                      🔐 TweetNaCl E2E Encryption                  │
        └───────────────────────────────────────────────────────────────────┘
```

### Cấu trúc thư mục

```
demo-wallet-connect/
├── backend/                    # Node.js + Express + Socket.io
│   ├── server.js               # Stateless relay server (260 lines)
│   └── package.json
├── web/                        # React + Vite
│   ├── src/
│   │   ├── App.jsx             # Main component with E2E encryption
│   │   ├── crypto/
│   │   │   └── encryption.js   # TweetNaCl encryption utilities
│   │   └── main.jsx
│   ├── index.html
│   └── package.json
└── connect-wallet-demo/        # React Native + Expo
    ├── app/(tabs)/
    │   └── index.tsx           # Main wallet screen with E2E encryption
    ├── crypto/
    │   └── encryption.ts       # TweetNaCl encryption utilities (TypeScript)
    ├── app.json
    └── package.json
```

## 🔄 Flow hoạt động (E2E Encrypted)

### 1. Kết nối (Connection Flow with Key Exchange)

```
Web App                        Backend (Relay)              Mobile App
   │                                 │                           │
   │ 1. Generate webKeyPair          │                           │
   │ 2. Generate UUID client-side    │                           │
   │ 3. Connect Socket                │                           │
   │─────join-room {uuid}────────────►│                           │
   │                                 │                           │
   │ [Display QR: uuid,               │                           │
   │  serverUrl, webPublicKey]        │                           │
   │                                 │                           │
   │                                 │◄───Scan QR────────────────│
   │                                 │                           │
   │                                 │   1. Parse webPublicKey   │
   │                                 │   2. Generate mobileKeyPair│
   │                                 │                           │
   │                                 │◄──join-room {uuid}────────│
   │                                 │◄──connected_uuid──────────│
   │                                 │   {uuid, mobilePublicKey} │
   │◄──connected_uuid────────────────│                           │
   │   {uuid, mobilePublicKey}       │                           │
   │                                 │                           │
   │ ✅ Key exchange complete!       │                           │
   │ Both sides have peer's public key                           │
```

### 2. Sign Message Flow (Encrypted)

```
Web App                        Backend (Relay)              Mobile App
   │                                 │                           │
   │ 1. Create request object        │                           │
   │ 2. Encrypt with TweetNaCl       │                           │
   │    (webSecretKey + mobilePubKey)│                           │
   │─web:signMessage─────────────────►│                           │
   │  {uuid, encryptedPayload, nonce}│                           │
   │                                 │                           │
   │                                 │─mobile:signRequest────────►│
   │                                 │  {encryptedPayload, nonce}│
   │                                 │                           │
   │                                 │   1. Decrypt with TweetNaCl│
   │                                 │      (mobileSecretKey +    │
   │                                 │       webPubKey)          │
   │                                 │   2. Verify timestamp     │
   │                                 │                           │
   │                                 │                   [User Reviews]
   │                                 │                   [Approve/Reject]
   │                                 │                           │
   │                                 │   3. Create response      │
   │                                 │   4. Encrypt response     │
   │                                 │                           │
   │                                 │◄──mobile:response─────────│
   │                                 │  {uuid, encryptedPayload, │
   │                                 │   nonce}                  │
   │◄──web:response──────────────────│                           │
   │  {encryptedPayload, nonce}      │                           │
   │                                 │                           │
   │ 5. Decrypt response             │                           │
   │ 6. Verify timestamp             │                           │
   │ ✅ Display result                │                           │
```

### 3. Send Transaction Flow (Encrypted)

```
Web App                        Backend (Relay)              Mobile App
   │                                 │                           │
   │ 1. Create tx request            │                           │
   │ 2. Encrypt with TweetNaCl       │                           │
   │─web:sendTransaction─────────────►│                           │
   │  {uuid, encryptedPayload, nonce}│                           │
   │                                 │                           │
   │                                 │─mobile:transactionRequest►│
   │                                 │  {encryptedPayload, nonce}│
   │                                 │                           │
   │                                 │   1. Decrypt transaction  │
   │                                 │   2. Verify timestamp     │
   │                                 │                           │
   │                                 │                   [User Reviews]
   │                                 │                   [Approve/Reject]
   │                                 │                           │
   │                                 │   3. Create response      │
   │                                 │   4. Encrypt response     │
   │                                 │                           │
   │                                 │◄──mobile:response─────────│
   │                                 │  {uuid, encryptedPayload, │
   │                                 │   nonce}                  │
   │◄──web:response──────────────────│                           │
   │  {encryptedPayload, nonce}      │                           │
   │                                 │                           │
   │ 5. Decrypt response             │                           │
   │ 6. Verify timestamp             │                           │
   │ ✅ Display txHash                │                           │
```

**🔒 Security Notes:**
- Backend is a **dumb relay** - cannot decrypt any messages
- All encryption/decryption happens on client side (web & mobile)
- Ephemeral keys - forward secrecy guaranteed
- Replay protection via timestamp verification
- Zero-trust architecture - backend never sees plaintext

## 🚀 Hướng dẫn chạy

### Yêu cầu hệ thống

- Node.js >= 18.x
- npm hoặc yarn
- Expo CLI (cho mobile app)
- Điện thoại hoặc emulator để chạy mobile app

### 1. Backend Server

```bash
# Di chuyển vào thư mục backend
cd backend

# Cài đặt dependencies
npm install

# Chạy server
npm start

# Server sẽ chạy tại: http://localhost:3001
```

**Output mong đợi:**
```
🚀 Backend server running on port 3001
📡 Socket.io server ready
```

### 2. Web App

```bash
# Mở terminal mới, di chuyển vào thư mục web
cd web

# Cài đặt dependencies
npm install

# Chạy development server
npm run dev

# Web app sẽ chạy tại: http://localhost:3000
```

**Output mong đợi:**
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:3000/
➜  Network: use --host to expose
```

### 3. Mobile App

```bash
# Mở terminal mới, di chuyển vào thư mục mobile
cd mobile

# Cài đặt dependencies
npm install

# Chạy Expo development server
npm start

# Hoặc chạy trực tiếp trên platform cụ thể:
npm run android  # Cho Android
npm run ios      # Cho iOS (chỉ trên macOS)
```

**Chạy trên thiết bị:**
1. Cài đặt Expo Go app trên điện thoại ([iOS](https://apps.apple.com/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))
2. Scan QR code từ terminal bằng Expo Go app
3. App sẽ tự động load lên điện thoại

**Lưu ý quan trọng:**
- Đảm bảo điện thoại và máy tính cùng mạng WiFi
- Nếu chạy trên emulator, cần config lại BACKEND_URL trong web/src/App.jsx
  - Với Android emulator: `http://10.0.2.2:3001`
  - Với iOS simulator: `http://localhost:3001`
  - Với thiết bị thật: `http://<IP-máy-tính>:3001`

## 🧪 Kiểm tra hệ thống

### Test Flow hoàn chỉnh

1. **Khởi động tất cả services:**
   - Backend: `http://localhost:3001`
   - Web App: `http://localhost:3000`
   - Mobile App: Expo Go

2. **Kết nối Web ↔ Mobile:**
   - Mở Web App, click "Connect Wallet"
   - QR code sẽ hiển thị
   - Mở Mobile App, click "Scan QR Code"
   - Scan QR code từ Web App
   - Kết nối thành công: Web hiển thị "Mobile wallet connected"

3. **Test Sign Message:**
   - Trên Web App, nhập message vào ô "Message to Sign"
   - Click "Sign Message"
   - Mobile App sẽ hiển thị popup approval
   - Click "Approve" hoặc "Reject"
   - Web App nhận kết quả và hiển thị signature

4. **Test Send Transaction:**
   - Trên Web App, nhập địa chỉ và số lượng ETH
   - Click "Send Transaction"
   - Mobile App hiển thị popup với thông tin transaction
   - Click "Approve" hoặc "Reject"
   - Web App nhận kết quả và hiển thị transaction hash

### Kiểm tra Backend

```bash
# Kiểm tra health endpoint
curl http://localhost:3001/health

# Expected output:
# {"status":"ok","sessions":0,"timestamp":1234567890}
```

## 📡 API Reference (E2E Encrypted)

### REST API Endpoints

#### GET /health
Health check endpoint for backend relay server

**Response:**
```json
{
  "status": "ok",
  "timestamp": 1234567890,
  "connectedClients": 2
}
```

#### GET /
Root endpoint with server information

**Response:**
```json
{
  "name": "WalletConnect Demo Backend",
  "version": "2.0.0",
  "architecture": "Zero-Trust E2E Encrypted Relay",
  "encryption": "TweetNaCl (Curve25519 + XSalsa20-Poly1305)",
  "note": "Backend cannot decrypt messages - all communication is end-to-end encrypted"
}
```

### Socket.io Events (All Messages E2E Encrypted)

#### Common Events (Both Web & Mobile)

- `join-room` - Join a UUID-based room
  ```javascript
  { uuid: 'uuid-v4' }
  ```

#### Web App → Backend (Encrypted Requests)

- `web:signMessage` - Send encrypted sign message request
  ```javascript
  {
    uuid: 'uuid-v4',
    encryptedPayload: 'base64-encrypted-data',  // Encrypted request object
    nonce: 'base64-nonce',                      // 24-byte nonce for decryption
    timestamp: 1234567890
  }
  ```

- `web:sendTransaction` - Send encrypted transaction request
  ```javascript
  {
    uuid: 'uuid-v4',
    encryptedPayload: 'base64-encrypted-data',  // Encrypted transaction object
    nonce: 'base64-nonce',
    timestamp: 1234567890
  }
  ```

#### Backend → Web App

- `connected_uuid` - Mobile has connected and shared public key
  ```javascript
  {
    uuid: 'uuid-v4',
    mobilePublicKey: 'base64-encoded-public-key'  // For encryption
  }
  ```

- `web:response` - Encrypted response from mobile
  ```javascript
  {
    uuid: 'uuid-v4',
    encryptedPayload: 'base64-encrypted-data',  // Encrypted approval/rejection
    nonce: 'base64-nonce',
    timestamp: 1234567890
  }
  ```

#### Mobile App → Backend

- `connected_uuid` - Mobile broadcasts its public key to room
  ```javascript
  {
    uuid: 'uuid-v4',
    mobilePublicKey: 'base64-encoded-public-key'  // For encryption
  }
  ```

- `mobile:response` - Send encrypted approval/rejection
  ```javascript
  {
    uuid: 'uuid-v4',
    encryptedPayload: 'base64-encrypted-data',  // Encrypted response
    nonce: 'base64-nonce',
    timestamp: 1234567890
  }
  ```

#### Backend → Mobile App (Encrypted Requests)

- `mobile:signRequest` - Encrypted sign message request from web
  ```javascript
  {
    uuid: 'uuid-v4',
    encryptedPayload: 'base64-encrypted-data',
    nonce: 'base64-nonce',
    timestamp: 1234567890
  }
  ```

- `mobile:transactionRequest` - Encrypted transaction request from web
  ```javascript
  {
    uuid: 'uuid-v4',
    encryptedPayload: 'base64-encrypted-data',
    nonce: 'base64-nonce',
    timestamp: 1234567890
  }
  ```

### Encryption Utilities

All encryption/decryption is handled by `crypto/encryption.js` (web) and `crypto/encryption.ts` (mobile):

```javascript
// Key generation
const keyPair = generateKeyPair();  // Curve25519 key pair

// Encryption
const { encryptedPayload, nonce } = encryptMessage(
  messageObject,
  recipientPublicKey,
  mySecretKey
);

// Decryption
const decryptedMessage = decryptMessage(
  encryptedPayload,
  nonce,
  senderPublicKey,
  mySecretKey
);

// Timestamp verification (replay protection)
const isValid = verifyTimestamp(timestamp, maxAgeMs = 5 * 60 * 1000);
```

## 🔒 Security Architecture

### ✅ Implemented Security Features

1. ✅ **E2E Encryption**: TweetNaCl (Curve25519 + XSalsa20-Poly1305)
2. ✅ **Zero-Trust Backend**: Stateless relay - cannot decrypt messages
3. ✅ **Ephemeral Keys**: Session-specific key pairs for forward secrecy
4. ✅ **Replay Protection**: Timestamp verification (5-minute window)
5. ✅ **Rate Limiting**: DoS protection (100 requests/minute per socket)
6. ✅ **Room-based Isolation**: UUID-based Socket.io rooms
7. ✅ **Authenticated Encryption**: TweetNaCl box provides authentication + confidentiality

### ⚠️ Demo Limitations (Not Production Ready)

**Still using mock data:**
- ❌ Private key management is mock (not hardware wallet/secure enclave)
- ❌ Signature and transaction hash are simulated
- ❌ No biometric authentication for mobile

**Network security:**
- ❌ Using WS instead of WSS (no TLS encryption for transport layer)
- ❌ No certificate pinning
- ❌ Backend CORS allows all origins (`origin: "*"`)

**Session management:**
- ✅ **Session persistence** implemented (localStorage for web, AsyncStorage for mobile)
- ❌ No session expiration enforcement
- ❌ No connection limits per UUID
- ❌ No automatic cleanup of stale rooms

### 🚀 Production Readiness Checklist

**For production deployment, add:**

✅ **Key Management**:
- Hardware wallet integration (Ledger, Trezor)
- Secure Enclave for iOS
- Android Keystore for Android
- Never expose private keys

✅ **Transport Security**:
- Enable WSS (TLS/SSL) for Socket.io
- Certificate pinning for mobile
- Restrict CORS to specific domains

✅ **Enhanced Security**:
- Biometric authentication (Face ID, Touch ID)
- Session expiration with automatic cleanup
- Connection limits and abuse prevention
- Audit logging for all operations

✅ **Error Handling**:
- Comprehensive error recovery
- Secure error messages (no leak sensitive info)
- Automatic reconnection logic

✅ **Monitoring**:
- Real-time security monitoring
- Anomaly detection
- Performance metrics
- Alert system for suspicious activity

## 🛠️ Troubleshooting

### Quick Fixes

**Mobile App Issues:**
- ✅ **TurboModule errors**: Fixed! Using `expo-camera` v16 instead of deprecated `expo-barcode-scanner`
- Camera permission: Enable in device Settings → Expo Go → Camera
- Connection issues: Ensure same WiFi network and check firewall

**Web App Issues:**
- Backend connection: Verify backend running with `curl http://localhost:3001/health`
- CORS errors: Check CORS configuration in backend/server.js
- QR not showing: Verify sessionId created successfully

**Backend Issues:**
- Port in use: Kill process with `lsof -ti:3001 | xargs kill -9`
- Socket errors: Check CORS and transports configuration

### Detailed Troubleshooting

See **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** for comprehensive solutions including:
- TurboModule errors and Expo SDK compatibility
- Network configuration for mobile testing
- Camera permissions and QR scanning issues
- Socket.io connection problems
- Performance optimization tips
- Diagnostic commands and verification checklist

## 📝 Giải thích chi tiết

### 1. Backend (server.js) - Stateless Relay Server

Backend hoạt động như một **dumb relay** với zero-trust architecture:

- **Room Management**: UUID-based Socket.io rooms for isolation
- **Event Relay**: Forwards encrypted blobs between web and mobile (cannot decrypt)
- **Rate Limiting**: DoS protection (100 requests/minute per socket)
- **No State**: No sessions, no validation, no storage
- **Automatic Cleanup**: Periodic cleanup of rate limit data (every 5 minutes)
- **Lines of Code**: 260 lines (reduced from 630 lines - 58% reduction)

**Key Point**: Backend cannot read message content - zero-knowledge relay

### 2. Web App (App.jsx) - E2E Encrypted dApp

Web App provides secure blockchain interaction interface:

- **Key Generation**: Generates ephemeral Curve25519 key pair on connect
- **QR Generation**: Creates QR code with uuid, serverUrl, and webPublicKey
- **Socket Communication**: Real-time encrypted communication with mobile
- **Request Encryption**: Encrypts all requests with TweetNaCl before sending
- **Response Decryption**: Decrypts responses from mobile
- **Replay Protection**: Verifies timestamps on all received messages
- **Client-side UUID**: Generates UUID without backend API call

**Security Flow**:
1. Generate key pair → 2. Display QR with public key → 3. Receive mobile's public key →
4. Encrypt requests → 5. Decrypt responses → 6. Verify timestamps

### 3. Mobile App (index.tsx) - E2E Encrypted Wallet

Mobile App acts as a secure wallet with E2E encryption:

- **QR Scanner**: Scans QR to get uuid, serverUrl, and webPublicKey
- **Key Generation**: Generates ephemeral Curve25519 key pair after scan
- **Public Key Broadcast**: Broadcasts mobilePublicKey to room via `connected_uuid`
- **Request Decryption**: Decrypts incoming requests from web
- **Approval UI**: Shows popup for user to review and approve/reject
- **Response Encryption**: Encrypts approval/rejection before sending
- **Mock Signing**: Simulates blockchain operations (production uses real wallet)
- **Replay Protection**: Verifies timestamps on all received messages

**Security Flow**:
1. Scan QR → 2. Parse web's public key → 3. Generate key pair → 4. Broadcast public key →
5. Decrypt requests → 6. Encrypt responses → 7. Verify timestamps

### 4. Encryption Layer (crypto/encryption.js & crypto/encryption.ts)

**TweetNaCl Implementation**:
- **Algorithm**: Curve25519 (ECDH) + XSalsa20-Poly1305 (AEAD)
- **Key Exchange**: Diffie-Hellman key exchange with ephemeral keys
- **Authenticated Encryption**: `nacl.box()` provides both confidentiality and authenticity
- **Nonce**: Random 24-byte nonce per message (never reused)
- **Forward Secrecy**: Ephemeral keys ensure past messages safe if key compromised

**Key Functions**:
```javascript
generateKeyPair()        // Curve25519 key pair
encryptMessage()         // Encrypt + authenticate with nacl.box
decryptMessage()         // Decrypt + verify with nacl.box.open
verifyTimestamp()        // Replay protection (5-min window)
publicKeyToBase64()      // Encode for QR/transport
base64ToPublicKey()      // Decode from QR/transport
```

## 🎯 Features đã implement

### Core Features
✅ Kết nối Web ↔ Mobile qua QR code
✅ Real-time communication với Socket.io
✅ Sign message workflow với approval popup
✅ Send transaction workflow với approval popup
✅ Connection status tracking
✅ Error handling cơ bản
✅ Responsive UI cho cả web và mobile
✅ Mock blockchain operations

### Security Features (v2.0.0)
✅ **End-to-End Encryption** (TweetNaCl)
✅ **Zero-Trust Backend** (Stateless relay)
✅ **Ephemeral Keys** (Forward secrecy)
✅ **Replay Protection** (Timestamp verification)
✅ **Rate Limiting** (DoS protection)
✅ **Room-based Isolation** (UUID-based)
✅ **Authenticated Encryption** (AEAD)
✅ **Session Persistence** (Auto-restore on reload) - See [SESSION_PERSISTENCE.md](./SESSION_PERSISTENCE.md)

## 🚧 Potential Improvements

### High Priority
- [x] ~~Session persistence (auto-restore on reload)~~ ✅ DONE - See [SESSION_PERSISTENCE.md](./SESSION_PERSISTENCE.md)
- [ ] Enable WSS (TLS/SSL) for production
- [ ] Implement session expiration with auto cleanup
- [ ] Add connection limits per UUID
- [ ] Biometric authentication for mobile (Face ID, Touch ID)
- [ ] Hardware wallet integration (Ledger, Trezor)

### Medium Priority
- [ ] Request timeout with auto-retry
- [ ] Transaction history with persistent storage
- [ ] Multi-network support (Ethereum, BSC, Polygon)
- [ ] Real blockchain integration (ethers.js, web3.js)
- [ ] Certificate pinning for mobile

### Low Priority
- [ ] Multi-language support (i18n)
- [ ] Dark mode theme
- [ ] Advanced analytics dashboard
- [ ] QR code customization
- [ ] Batch transaction support

## 📄 License

MIT License - Tự do sử dụng cho mục đích học tập và nghiên cứu.

## 👨‍💻 Development

Project này được tạo ra như một demo đơn giản hóa của WalletConnect mechanism. Code được viết rõ ràng với comments chi tiết để dễ hiểu và học tập.

Nếu có câu hỏi hoặc gặp vấn đề, vui lòng tạo issue hoặc liên hệ developer.
