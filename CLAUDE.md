# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**WalletConnect-Style Demo with End-to-End Encryption**

A demonstration of secure dApp-to-wallet communication using:
- **Zero-Trust E2E Encryption**: TweetNaCl (Curve25519 + XSalsa20-Poly1305)
- **QR Code Connection**: Web dApp displays QR, mobile wallet scans to connect
- **Stateless Relay Backend**: Cannot decrypt messages, only forwards encrypted payloads
- **Multi-Chain Protocol SDKs**: Reusable protocol packages for dApp and wallet integration

## Repository Structure

```
demo-wallet-connect/
├── backend/                   # Stateless relay server (Express + Socket.io)
├── web/                       # React dApp (Vite)
├── connect-wallet-demo/       # React Native wallet (Expo)
├── packages/                  # Protocol SDKs (NEW)
│   ├── phoenix-dapp/         # @phoenix-demo/dapp SDK
│   └── phoenix-wallet/       # @phoenix-demo/wallet SDK
└── flow/                      # Protocol documentation (sequence diagrams)
```

## Development Commands

### Backend Server
```bash
cd backend
npm install
npm start          # Production server on port 3001
npm run dev        # Development with nodemon
```

### Web dApp
```bash
cd web
npm install
npm run dev        # Vite dev server on port 3000
npm run build      # Production build
npm run preview    # Preview production build
```

### Mobile Wallet (React Native + Expo)
```bash
cd connect-wallet-demo
npm install
npm start          # Start Expo dev server
npm run android    # Run on Android
npm run ios        # Run on iOS (macOS only)
```

### Phoenix SDKs (Protocol Packages)
```bash
# Build both SDKs
cd packages/phoenix-dapp && npm run build
cd packages/phoenix-wallet && npm run build

# Or build from root if workspace configured
npm run build:sdks
```

### Testing
```bash
# Health check
curl http://localhost:3001/health

# Verify web app running
curl http://localhost:3000

# Clear Metro cache (React Native)
cd connect-wallet-demo
npx expo start --clear
```

## Architecture Overview

### Three-Tier Architecture

1. **Backend (Relay Server)** - `backend/server.js`
   - Stateless relay - cannot decrypt messages
   - Socket.io room-based message forwarding
   - Rate limiting (100 req/min per socket)
   - No session storage or validation
   - 260 lines of code (simplified from 630 lines)

2. **Web dApp** - `web/src/App.jsx` or `web/src/App-PhoenixSDK.jsx`
   - Generates ephemeral Curve25519 key pair
   - Creates QR code with UUID + server URL + public key
   - Encrypts all requests before sending
   - Decrypts responses from wallet
   - **With SDK**: 64% code reduction (819→295 lines)

3. **Mobile Wallet** - `connect-wallet-demo/app/(tabs)/index.tsx` or `index-PhoenixSDK.tsx`
   - Scans QR to get dApp's public key
   - Generates ephemeral Curve25519 key pair
   - Decrypts incoming sign requests
   - Shows approval UI to user
   - Encrypts and sends responses
   - **With SDK**: 52% code reduction (1058→510 lines)

### Phoenix Protocol SDKs

**Design Philosophy**: WalletConnect-style protocol SDKs that separate protocol logic from signing/crypto operations.

#### @phoenix-demo/dapp (`packages/phoenix-dapp/`)
- **Purpose**: dApp developers only call functions to generate QR and manage requests
- **Main Class**: `PhoenixDappClient`
- **Key Methods**:
  - `connect()` → Returns QR code URL and URI
  - `signMessage(params)` → Request message signing
  - `signTransaction(params)` → Request transaction signing
  - `disconnect()` → Close session
- **Event System**: EventEmitter3 (React-friendly)
  - `session_connected`, `session_disconnected`
  - `request_response`, `request_error`
- **Dependencies**: tweetnacl, socket.io-client, qrcode, eventemitter3

#### @phoenix-demo/wallet (`packages/phoenix-wallet/`)
- **Purpose**: Wallet developers implement `WalletSigner` interface, SDK handles protocol
- **Main Class**: `PhoenixWalletClient`
- **Key Interface**: `WalletSigner`
  ```typescript
  interface WalletSigner {
    address: string;
    chainType: ChainType;
    signMessage(params): Promise<string>;
    signTransaction(params): Promise<string>;
  }
  ```
- **Key Methods**:
  - `connect(qrData, signer)` → Connect to dApp
  - `approveRequest(requestId)` → Approve and sign automatically
  - `rejectRequest(requestId, reason?)` → Reject request
  - `disconnect()` → Close session
- **Event System**: EventEmitter3 (React Native compatible)
  - `session_connected`, `session_disconnected`
  - `sign_request` (show approval UI)
  - `request_approved`, `request_rejected`
- **Dependencies**: tweetnacl, socket.io-client, eventemitter3

### Encryption Layer

**Location**:
- Web: `web/src/crypto/encryption.js`
- Mobile: `connect-wallet-demo/crypto/encryption.ts`
- SDK dApp: `packages/phoenix-dapp/src/utils/encryption.ts`
- SDK Wallet: `packages/phoenix-wallet/src/utils/encryption.ts`

**Key Functions**:
- `generateKeyPair()` - Curve25519 ephemeral keys
- `encryptMessage(message, peerPublicKey, secretKey)` - nacl.box encryption
- `decryptMessage(encrypted, nonce, peerPublicKey, secretKey)` - nacl.box.open decryption
- `verifyTimestamp(timestamp, maxAge = 5min)` - Replay protection

**Security Properties**:
- Forward secrecy (ephemeral keys per session)
- Authenticated encryption (AEAD via nacl.box)
- Replay protection (timestamp verification)
- Zero-trust backend (relay cannot decrypt)

## Important Implementation Details

### Socket.io Event Flow

**Connection Flow**:
```
Web → join-room {uuid, webPublicKey}
Mobile → join-room {uuid}
Mobile → connected_uuid {uuid, mobilePublicKey}
Backend → broadcasts connected_uuid to room
Web receives mobile's public key
```

**Sign Request Flow**:
```
Web → web:signMessage {uuid, encryptedPayload, nonce}
Backend → mobile:signRequest (forwards encrypted)
Mobile decrypts → shows UI → user approves
Mobile → mobile:response {uuid, encryptedPayload, nonce}
Backend → web:response (forwards encrypted)
Web decrypts → displays result
```

### React Native Specific Issues

**CRITICAL: TweetNaCl PRNG Polyfill Required**

React Native doesn't provide `crypto.getRandomValues()` by default. Must polyfill before using TweetNaCl:

```typescript
import * as Crypto from 'expo-crypto';

// Polyfill BEFORE importing Phoenix SDK
if (typeof global.crypto === 'undefined') {
  global.crypto = {
    getRandomValues: (array: Uint8Array) => {
      const hex = Crypto.getRandomBytes(array.length);
      for (let i = 0; i < array.length; i++) {
        array[i] = hex[i];
      }
      return array;
    },
  } as any;
}

// NOW safe to import and use SDK
import { PhoenixWalletClient } from '@phoenix-demo/wallet';
```

**Metro Bundler Configuration for Local Packages**:

React Native requires `metro.config.js` to resolve local packages:

```javascript
// connect-wallet-demo/metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);
const phoenixWalletPath = path.resolve(__dirname, '../packages/phoenix-wallet');

config.watchFolders = [phoenixWalletPath];
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(phoenixWalletPath, 'node_modules'),
];
config.resolver.sourceExts = [...config.resolver.sourceExts, 'ts', 'tsx', 'js', 'jsx'];

module.exports = config;
```

**Expo Router File Naming**:
- Default export function name must match route
- Example: `index-PhoenixSDK.tsx` exports `IndexPhoenixSDK` (not `WalletConnectScreen`)

### TypeScript Build Configuration

Both SDKs use TypeScript with:
- **Target**: ES2020 (React Native compatible)
- **Module**: CommonJS (required for React Native Metro bundler)
- **Declaration**: true (generates .d.ts files)
- **Output**: `dist/` directory

**Build before testing**:
```bash
cd packages/phoenix-dapp && npm run build
cd packages/phoenix-wallet && npm run build
```

### Testing Integration Files

**Side-by-side implementations exist**:
- `web/src/App.jsx` (original) vs `web/src/App-PhoenixSDK.jsx` (SDK)
- `connect-wallet-demo/app/(tabs)/index.tsx` (original) vs `index-PhoenixSDK.tsx` (SDK)

**To switch implementations**:
- Web: Modify `web/src/main.jsx` import
- Mobile: Modify `connect-wallet-demo/app/(tabs)/_layout.tsx` screen name

## Common Development Tasks

### Adding New Chain Support

1. Update `packages/phoenix-dapp/src/types/protocol.ts`:
   ```typescript
   export type ChainType = 'evm' | 'solana' | 'YOUR_CHAIN';
   ```

2. Add chain config:
   ```typescript
   export const YOUR_CHAIN_CHAINS: ChainConfig[] = [
     { chainId: '1', name: 'Your Mainnet', rpc: 'https://...' },
   ];
   ```

3. Update both SDK type files identically

4. Rebuild SDKs

### Fixing Encryption Issues

**Symptoms**: "Decryption failed", "no PRNG", "cannot read nonce"

**Checklist**:
1. ✅ Polyfill `crypto.getRandomValues()` in React Native
2. ✅ Verify both parties have each other's public keys
3. ✅ Check nonce is 24 bytes (base64 encoded)
4. ✅ Ensure timestamp within 5-minute window
5. ✅ Verify encryption/decryption using same key pairs
6. ✅ Check Buffer/TextEncoder available (Node.js vs browser)

### Network Configuration

**Backend URL Configuration**:
- Development: `http://localhost:3001`
- Android Emulator: `http://10.0.2.2:3001`
- iOS Simulator: `http://localhost:3001`
- Physical Device: `http://<COMPUTER_IP>:3001` (same WiFi required)

Update in:
- `web/src/App.jsx` or `App-PhoenixSDK.jsx` - `BACKEND_URL` constant
- `connect-wallet-demo/app/(tabs)/index.tsx` - `BACKEND_URL` constant

### Debugging Socket.io Issues

**Enable debug mode**:
```javascript
// Web
import io from 'socket.io-client';
const socket = io(BACKEND_URL, {
  transports: ['websocket'],
  debug: true  // Add this
});

// Backend
// Set environment variable
DEBUG=socket.io* node server.js
```

**Common issues**:
- CORS errors → Check backend `cors({ origin: "*" })`
- Connection timeout → Verify network, firewall
- Room not joined → Check UUID matching on both sides
- Messages not received → Verify socket.on() event names match

## Code Quality Standards

### Security Requirements

1. **Never expose private keys** - Always use ephemeral session keys
2. **Always verify timestamps** - 5-minute window for replay protection
3. **Validate all inputs** - Type check before encryption/decryption
4. **Use authenticated encryption** - nacl.box provides AEAD
5. **Clear sensitive data** - Overwrite key material when done

### TypeScript Standards

- Full type safety required for SDK packages
- Export all public types from `types/` directory
- Use `readonly` for immutable properties
- Prefer `interface` over `type` for extensibility

### React Native Compatibility

- No Node.js-specific APIs (fs, path, crypto without polyfill)
- Use EventEmitter3 (not Node.js EventEmitter)
- Test on both iOS and Android
- Handle Metro bundler caching issues

## Protocol Documentation

See `flow/` directory for detailed sequence diagrams:
- `SEQUENCE_DIAGRAMS_CONNECTION.md` - Connection and key exchange flow
- `SEQUENCE_DIAGRAMS_SIGN_OPERATIONS.md` - Sign message and transaction flows

## Known Limitations

**This is a DEMO - not production ready**:

1. **Mock Signing**: Signatures/txHashes are simulated
2. **No TLS**: Using WS instead of WSS (plaintext transport)
3. **No Persistence**: Sessions lost on disconnect
4. **No Biometric Auth**: Mobile approval without Face ID/Touch ID
5. **Wide CORS**: Backend allows all origins
6. **No Rate Limiting**: Per-IP limits not implemented
7. **No Session Expiration**: Rooms never expire automatically

## Production Readiness Checklist

Before production deployment:

- [ ] Enable WSS (TLS/SSL) for Socket.io
- [ ] Implement proper key management (hardware wallet, secure enclave)
- [ ] Add biometric authentication (Face ID, Touch ID)
- [ ] Restrict CORS to specific domains
- [ ] Implement session expiration and cleanup
- [ ] Add connection limits per UUID
- [ ] Enable certificate pinning for mobile
- [ ] Add comprehensive audit logging
- [ ] Implement anomaly detection
- [ ] Set up monitoring and alerting
- [ ] Replace mock signing with real blockchain integration
- [ ] Add proper error recovery and retry logic
- [ ] Implement backup relay servers for failover

## Troubleshooting

See `TROUBLESHOOTING.md` for detailed solutions.

**Quick fixes**:
- Metro cache issues: `npx expo start --clear`
- Port conflicts: `lsof -ti:3001 | xargs kill -9`
- SDK not resolving: Rebuild SDKs and restart Metro
- PRNG error: Add crypto polyfill before importing SDK
- Type errors: Check TypeScript version compatibility (5.9.2)

## Additional Resources

- **README.md** - Full project documentation in Vietnamese
- **QUICKSTART.md** - 5-minute setup guide
- **PHOENIX_SDK_INTEGRATION.md** - SDK integration guide with code comparison
- **packages/phoenix-dapp/README.md** - dApp SDK API reference
- **packages/phoenix-wallet/README.md** - Wallet SDK API reference
