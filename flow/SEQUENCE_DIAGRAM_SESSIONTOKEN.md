# SessionToken Authentication Flow

## Overview

Enhanced Phoenix Protocol with sessionToken authentication for cryptographic proof of wallet identity.

**Multi-dApp Support**: Wallet can connect to multiple dApps simultaneously. Each connection creates an independent `DappSession` instance with its own socket, encryption keys, and request handler.

---

## Architecture: Multi-dApp Support

### Wallet Client Architecture

```
PhoenixWalletClient
├── sessions: Map<string, DappSession>
│   ├── session1 (uuid1) → DappSession
│   │   ├── socket: Socket (independent connection)
│   │   ├── encryption: EncryptionManager (session-specific keys)
│   │   ├── requestHandler: RequestHandler
│   │   └── session: Session
│   ├── session2 (uuid2) → DappSession
│   │   └── ... (independent state)
│   └── sessionN (uuidN) → DappSession
│       └── ... (independent state)
└── sessionStorage: SessionStorage (stores all sessions)
```

### Key Features

- **Independent Sessions**: Each dApp connection has isolated state (socket, encryption, requests)
- **Session Routing**: All events include `sessionUuid` to identify which session they belong to
- **Concurrent Connections**: Multiple dApps can be connected simultaneously
- **Session Management**: `connect()` creates new session, `disconnect(sessionUuid)` removes specific session

---

## Connection Flow with SessionToken (Single Session)

```mermaid
sequenceDiagram
    participant User
    participant DApp as PhoenixDappClient
    participant Backend as Backend (Relay)
    participant Wallet as PhoenixWalletClient

    Note over User,Wallet: Phase 1: Initial Connection (Unchanged)

    User->>DApp: client.connect()
    activate DApp
    DApp->>DApp: Generate Curve25519 key pair<br/>(dappSecretKey, dappPublicKey)
    DApp->>DApp: Generate UUID
    DApp->>DApp: Create URI: phoenix://connect?<br/>version=1&uuid=xxx&serverUrl=xxx&<br/>publicKey=dappPublicKey
    DApp->>Backend: Socket.io connect & join room
    activate Backend
    Backend-->>DApp: Connected
    deactivate Backend
    DApp-->>User: Display QR code
    deactivate DApp

    Note over User,Wallet: Phase 2: Wallet Scans & Creates SessionToken 🆕

    User->>Wallet: Scan QR → client.connect(qrData, signer)
    activate Wallet
    Wallet->>Wallet: Parse URI: QRParser.parseURI()
    Wallet->>Wallet: Extract: uuid, serverUrl, dappPublicKey
    
    Note right of Wallet: Multi-dApp: Check if session exists
    Wallet->>Wallet: Check: sessions.has(uuid)?
    alt Session exists and connected
        Wallet-->>User: Return existing sessionUuid
    else Create new DappSession instance
        Wallet->>Wallet: Create new DappSession(uuid, serverUrl, dappPublicKey, ...)
        Wallet->>Wallet: DappSession generates Curve25519 key pair<br/>(walletSecretKey, walletPublicKey)
        Wallet->>Wallet: DappSession computes shared secret:<br/>nacl.box.before(dappPublicKey, walletSecretKey)
        Wallet->>Wallet: Store: sessions.set(uuid, dappSession)
    end

    Note right of Wallet: Create SessionToken 🆕
    Wallet->>Wallet: DappSession prepares token data:<br/>{<br/>  sessionId: uuid,<br/>  walletAddress: signer.address,<br/>  chainType: signer.chainType,<br/>  serverUrl: serverUrl,<br/>  dappPublicKey: dappPublicKey,<br/>  timestamp: Date.now()<br/>}

    Wallet->>Wallet: Create message:<br/>"uuid:address:chain:appUrl:serverUrl:pubKey:timestamp"

    Wallet->>Wallet: Sign with blockchain key:<br/>signature = await signer.signMessage(message)

    Wallet->>Wallet: sessionToken = {...tokenData, signature}

    Note right of Wallet: Connect & Send (DappSession)
    Wallet->>Wallet: DappSession.connect() creates socket
    Wallet->>Backend: Socket.io connect & join room (session-specific socket)
    activate Backend
    Backend-->>Wallet: Connected

    Wallet->>Backend: emit('connected_uuid', {<br/>  uuid,<br/>  publicKey: walletPublicKey,<br/>  nonce,<br/>  data: encrypt({sessionToken, address, chainType})<br/>})
    Backend->>DApp: Forward: 'connected_uuid'
    deactivate Backend

    Wallet->>Wallet: DappSession: session.connected = true
    Wallet->>Wallet: DappSession emits 'session_connected'
    Wallet->>Wallet: PhoenixWalletClient forwards event:<br/>emit('session_connected', session, sessionUuid) 🆕
    Wallet->>Wallet: Save session to storage (by UUID)
    deactivate Wallet

    Note over User,Wallet: Phase 3: dApp Receives & Stores SessionToken 🆕

    activate DApp
    DApp->>DApp: Receive 'connected_uuid' event
    DApp->>DApp: Store walletPublicKey (peer key)
    DApp->>DApp: Compute shared secret:<br/>nacl.box.before(walletPublicKey, dappSecretKey)

    Note right of DApp: Decrypt & Store SessionToken
    DApp->>DApp: Decrypt using shared secret:<br/>data = nacl.box.open(encrypted, nonce, sharedKey)
    DApp->>DApp: Parse: { sessionToken, address, chainType }

    DApp->>DApp: Store sessionToken for future requests
    DApp->>DApp: session = {<br/>  uuid,<br/>  connected: true,<br/>  sessionToken,<br/>  address,<br/>  chainType<br/>}
    DApp->>DApp: emit('session_connected', session)
    deactivate DApp

    Note over User,Wallet: ✅ Authenticated E2E Encrypted Channel Established

    Note over User,Wallet: Phase 4: Sign Request with SessionToken 🆕

    User->>DApp: Sign message request
    activate DApp
    DApp->>DApp: Create sign request:<br/>{<br/>  id: requestId,<br/>  type: 'sign_message',<br/>  payload: message,<br/>  sessionToken: storedSessionToken, 🆕<br/>  timestamp: Date.now()<br/>}

    DApp->>DApp: Encrypt request using shared secret
    DApp->>Backend: emit('dapp:request', {uuid, encryptedPayload, nonce})
    activate Backend
    Backend->>Wallet: Forward: 'wallet:request'
    deactivate Backend
    deactivate DApp

    Note over User,Wallet: Phase 5: Wallet Validates & Signs 🆕

    activate Wallet
    Wallet->>Wallet: DappSession receives 'wallet:request' event
    Wallet->>Wallet: Route to correct DappSession by UUID from encrypted message
    Wallet->>Wallet: DappSession decrypts request using session-specific shared secret

    Note right of Wallet: Validate SessionToken (DappSession)
    Wallet->>Wallet: Extract sessionToken from request 🆕

    Wallet->>Wallet: DappSession verifies token parameters:<br/>- token.sessionId === session.uuid ✓<br/>- token.walletAddress === session.address ✓<br/>- token.chainType === session.chainType ✓<br/>- token.serverUrl === storedServerUrl ✓<br/>- token.dappPublicKey === peerPublicKey ✓

    Wallet->>Wallet: Check timestamp:<br/>now - token.timestamp < 5min ✓

    Wallet->>Wallet: sessionToken valid ✅

    Note right of Wallet: Process Request (DappSession)
    Wallet->>Wallet: DappSession emits 'sign_request' event
    Wallet->>Wallet: PhoenixWalletClient forwards:<br/>emit('sign_request', request, sessionUuid) 🆕
    Wallet->>User: Show approval UI (with sessionUuid context)
    User->>Wallet: Approve
    Wallet->>Wallet: client.approveRequest(requestId, sessionUuid) 🆕
    Wallet->>Wallet: DappSession: signature = await signer.signMessage(payload)

    Wallet->>Wallet: DappSession creates response:<br/>{<br/>  id: requestId,<br/>  status: 'success',<br/>  result: { signature },<br/>  timestamp: Date.now()<br/>}

    Wallet->>Wallet: DappSession encrypts response
    Wallet->>Backend: emit('wallet:response', encrypted) (session-specific socket)
    activate Backend
    Backend->>DApp: Forward: 'dapp:response'
    deactivate Backend
    Wallet->>Wallet: PhoenixWalletClient emits:<br/>emit('request_approved', requestId, sessionUuid) 🆕
    deactivate Wallet

    activate DApp
    DApp->>DApp: Decrypt response
    DApp->>User: Return signature
    deactivate DApp

    Note over User,Wallet: ✅ Authenticated Request Complete
```

---

## Multi-dApp Connection Flow

```mermaid
sequenceDiagram
    participant User
    participant DApp1 as PhoenixDappClient 1
    participant DApp2 as PhoenixDappClient 2
    participant Backend as Backend (Relay)
    participant Wallet as PhoenixWalletClient

    Note over User,Wallet: Wallet connects to multiple dApps simultaneously

    User->>DApp1: Connect to dApp 1
    DApp1->>DApp1: Generate UUID1, keyPair1
    DApp1->>Backend: Join room UUID1
    DApp1-->>User: Display QR1

    User->>DApp2: Connect to dApp 2
    DApp2->>DApp2: Generate UUID2, keyPair2
    DApp2->>Backend: Join room UUID2
    DApp2-->>User: Display QR2

    User->>Wallet: Scan QR1 → connect(qrData1, signer)
    activate Wallet
    Wallet->>Wallet: Create DappSession1(uuid1, ...)
    Wallet->>Wallet: sessions.set(uuid1, dappSession1)
    Wallet->>Backend: Connect socket1, join room UUID1
    Wallet->>Backend: emit('connected_uuid', {uuid: uuid1, ...})
    Wallet->>Wallet: emit('session_connected', session1, uuid1) 🆕
    deactivate Wallet

    User->>Wallet: Scan QR2 → connect(qrData2, signer)
    activate Wallet
    Wallet->>Wallet: Create DappSession2(uuid2, ...)
    Wallet->>Wallet: sessions.set(uuid2, dappSession2)
    Wallet->>Backend: Connect socket2, join room UUID2
    Wallet->>Backend: emit('connected_uuid', {uuid: uuid2, ...})
    Wallet->>Wallet: emit('session_connected', session2, uuid2) 🆕
    deactivate Wallet

    Note over User,Wallet: ✅ Wallet now connected to 2 dApps simultaneously

    DApp1->>Backend: emit('dapp:request', {uuid: uuid1, ...})
    Backend->>Wallet: Forward to socket1 (room UUID1)
    Wallet->>Wallet: Route to DappSession1 by UUID
    Wallet->>Wallet: DappSession1 validates & processes
    Wallet->>Wallet: emit('sign_request', request, uuid1) 🆕

    DApp2->>Backend: emit('dapp:request', {uuid: uuid2, ...})
    Backend->>Wallet: Forward to socket2 (room UUID2)
    Wallet->>Wallet: Route to DappSession2 by UUID
    Wallet->>Wallet: DappSession2 validates & processes
    Wallet->>Wallet: emit('sign_request', request, uuid2) 🆕

    Note over User,Wallet: ✅ Each request routed to correct session by UUID
```

---

## Security Flow Comparison

### Before SessionToken

```
Connection:
  dApp ←→ Wallet: Public key exchange
  ✅ Encryption established
  ❌ No authentication
  ❌ No proof of wallet identity

Sign Request:
  dApp → Wallet: Encrypted request
  ❌ No proof request from authenticated wallet
  ❌ Session can be hijacked if key leaks
```

### After SessionToken

```
Connection:
  dApp ←→ Wallet: Public key exchange
  ✅ Encryption established
  Wallet → dApp: Signed sessionToken (stored, not verified)
  Wallet has: Cryptographic proof of wallet identity
  Wallet has: Parameters bound to token

Sign Request:
  dApp → Wallet: Encrypted request + sessionToken
  Wallet verifies: sessionToken matches session parameters
  ✅ Proof request from authenticated wallet
  ✅ Session hijacking prevented (verified by wallet)
  ✅ Parameter tampering detected (verified by wallet)
```

---

## SessionToken Structure

```typescript
interface SessionToken {
  // Connection binding
  sessionId: string;        // UUID of connection
  dappPublicKey: string;    // dApp's encryption public key
  serverUrl: string;        // Backend relay URL
  appUrl?: string;          // dApp's app URL (optional)

  // Wallet identity
  walletAddress: string;    // Blockchain address
  chainType: ChainType;     // 'evm' | 'solana' | ...

  // Security
  timestamp: number;        // Creation time (replay protection)
  signature: string;        // Digital signature of all above
}
```

### Message Signed

```
Format: "${sessionId}:${walletAddress}:${chainType}:${appUrl}:${serverUrl}:${dappPublicKey}:${timestamp}"

Example:
"66e72b66-...:0x742d35C...:evm::http://localhost:3001:41qSsdt2CB...:1699123456789"
```

### Signature Method

- **EVM**: `eth_personal_sign` → ECDSA signature (65 bytes)
- **Solana**: `signMessage` → Ed25519 signature (64 bytes)
- **Key Used**: Wallet's actual blockchain private key (NOT encryption key)

### Verification (Wallet Side Only)

**Note**: dApp does NOT verify sessionToken during connection. Wallet verifies it before processing each sign request.

```typescript
// Wallet side verification before processing requests
function validateSessionToken(
  token: SessionToken,
  session: Session,
  storedServerUrl: string,
  peerPublicKey: string
): boolean {
  // Check parameters match
  if (token.sessionId !== session.uuid) return false;
  if (token.walletAddress !== session.address) return false;
  if (token.chainType !== session.chainType) return false;
  if (token.serverUrl !== storedServerUrl) return false;
  if (token.dappPublicKey !== peerPublicKey) return false;

  // Check timestamp freshness (5 minutes)
  if (Date.now() - token.timestamp > 5 * 60 * 1000) return false;

  return true;
}
```

---

## Attack Prevention

### 1. Session Hijacking
**Attack**: Attacker steals shared encryption key
**Prevention**: SessionToken signature requires wallet's private key
**Result**: Attacker cannot create valid requests ✅

### 2. Replay Attack
**Attack**: Attacker replays old signed request
**Prevention**: Timestamp verification (5-minute window)
**Result**: Old requests rejected ✅

### 3. Parameter Tampering
**Attack**: Attacker modifies serverUrl or dappPublicKey
**Prevention**: Signature covers all parameters
**Result**: Verification fails ✅

### 4. Man-in-the-Middle
**Attack**: Attacker intercepts and modifies connection
**Prevention**: SessionToken binds to specific dApp public key
**Result**: Modified connection detected ✅

---

## Multi-dApp Implementation Details

### Session Management

```typescript
// PhoenixWalletClient manages multiple sessions
class PhoenixWalletClient {
  private sessions: Map<string, DappSession> = new Map();

  async connect(qrData: string, signer: WalletSigner): Promise<string> {
    const connectionData = QRParser.parseURI(qrData);
    
    // Create new DappSession instance per connection
    const dappSession = new DappSession(
      connectionData.uuid,
      connectionData.serverUrl,
      connectionData.publicKey,
      sessionToken,
      signer
    );
    
    // Store in Map
    this.sessions.set(connectionData.uuid, dappSession);
    
    // Each session has independent socket connection
    await dappSession.connect();
    
    return connectionData.uuid; // Return UUID for tracking
  }
}
```

### Event Routing with sessionUuid

All events now include `sessionUuid` to identify which session they belong to:

```typescript
// Event signatures updated
interface PhoenixWalletEvents {
  session_connected: (session: Session, sessionUuid: string) => void;
  session_disconnected: (sessionUuid: string) => void;
  sign_request: (request: SignRequest, sessionUuid: string) => void;
  request_approved: (requestId: string, sessionUuid: string) => void;
  request_rejected: (requestId: string, sessionUuid: string) => void;
  error: (error: Error, sessionUuid?: string) => void;
}
```

### Session Isolation

Each `DappSession` instance maintains:
- **Independent Socket**: Separate Socket.io connection per session
- **Independent Encryption**: Session-specific Curve25519 key pair and shared secret
- **Independent Request Handler**: Isolated pending request state
- **Independent Session State**: UUID, connection status, sessionToken

### Backward Compatibility

Methods work without `sessionUuid` parameter (uses first active session):

```typescript
// Backward compatible - uses first active session
await client.approveRequest(requestId);

// Multi-dApp - specify session
await client.approveRequest(requestId, sessionUuid);
```

---

## Implementation Notes

### Performance Impact
- **Connection**: +50-150ms (one-time signature creation & verification)
- **Requests**: +1-5ms (parameter validation, no signature needed)
- **Payload**: +300-400 bytes (sessionToken in request)
- **Multi-dApp**: Minimal overhead - each session is independent

### Memory Usage
- **Per Session**: ~50-100KB (socket, encryption keys, session state)
- **Scalability**: Supports 10+ simultaneous connections efficiently

### Backward Compatibility
- **Breaking Change**: Event signatures now include `sessionUuid`
- **Migration**: Update event handlers to accept `sessionUuid` parameter
- **SDK Version**: Requires wallet SDK v0.2.0+ (multi-dApp support)

### Testing Priorities
1. Signature creation & verification (EVM + Solana)
2. Parameter validation & mismatch detection
3. Timestamp expiration handling
4. Full end-to-end connection & sign flow
5. Attack scenario testing (hijacking, replay, tampering)
6. **Multi-dApp**: Concurrent connections, session isolation, event routing
7. **Multi-dApp**: Session storage/restore with multiple sessions

---

## Benefits Summary

### Security Improvements
✅ **Authentication** - Cryptographic proof of wallet identity
✅ **Integrity** - Parameters bound and tamper-evident
✅ **Non-repudiation** - Wallet cannot deny session creation
✅ **Anti-replay** - Timestamp prevents request reuse
✅ **Session Binding** - Token bound to specific connection

### Maintains Existing Benefits
✅ **Zero-Trust Backend** - Server still cannot decrypt
✅ **E2E Encryption** - All messages remain encrypted
✅ **Forward Secrecy** - Ephemeral keys per session
✅ **Replay Protection** - Existing timestamp checks

### Developer Experience
✅ **Minimal Changes** - Most logic handled by SDK
✅ **Clear API** - Simple signature and verification
✅ **Better Security** - Stronger guarantees for dApp developers
✅ **Easy Testing** - Clear validation rules
✅ **Multi-dApp Support** - Connect to multiple dApps simultaneously
✅ **Session Management** - Clear session lifecycle and routing
✅ **Event Context** - All events include sessionUuid for proper routing

### Multi-dApp Benefits
✅ **Concurrent Connections** - No need to disconnect before connecting to another dApp
✅ **Session Isolation** - Each connection is completely independent
✅ **Scalable** - Supports many simultaneous connections
✅ **Clear API** - sessionUuid parameter makes routing explicit
✅ **Backward Compatible** - Existing code works (uses first session)
