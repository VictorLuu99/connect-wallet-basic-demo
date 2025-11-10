# Security Enhancement: SessionToken Authentication

## Executive Summary

Adding **sessionToken authentication** to Phoenix Protocol to provide cryptographic proof of wallet identity and prevent session hijacking, replay attacks, and unauthorized requests.

## Current Security Architecture

### Existing Protections
✅ **End-to-End Encryption** - TweetNaCl (Curve25519 + XSalsa20-Poly1305)
✅ **Ephemeral Keys** - New key pairs per session (forward secrecy)
✅ **Zero-Trust Backend** - Relay server cannot decrypt messages
✅ **Replay Protection** - Timestamp verification (5-minute window)

### Current Vulnerabilities
❌ **No Session Authentication** - No cryptographic proof of wallet identity
❌ **Weak Session Binding** - Session can be hijacked if shared key leaks
❌ **No Request Authentication** - Encrypted requests don't prove wallet identity
❌ **Parameter Tampering** - No binding between session and connection parameters

## Proposed Enhancement: SessionToken

### What is SessionToken?

A **cryptographically signed token** created by the wallet during connection that:
1. Proves wallet owns the claimed address
2. Binds session to specific connection parameters
3. Must be included in all subsequent requests
4. Verified by dApp before processing any request

### SessionToken Structure

```typescript
interface SessionToken {
  sessionId: string;        // UUID of the connection
  walletAddress: string;    // Wallet's blockchain address
  chainType: ChainType;     // Chain type (evm, solana, etc.)
  appUrl?: string;          // dApp's app URL (optional)
  serverUrl: string;        // Backend relay URL
  dappPublicKey: string;    // dApp's encryption public key (base64)
  timestamp: number;        // Token creation timestamp (replay protection)
  signature: string;        // Digital signature of all above fields
}
```

### Signature Process

**Message to Sign:**
```
${sessionId}:${walletAddress}:${chainType}:${appUrl}:${serverUrl}:${dappPublicKey}:${timestamp}
```

**Signing Method:**
- Use wallet's **actual blockchain private key** via `WalletSigner.signMessage()`
- For EVM: `eth_personal_sign` (recoverable ECDSA signature)
- For Solana: `signMessage` (Ed25519 signature)
- Not using encryption keys - using blockchain signing keys for stronger security

**Verification Method:**
- EVM: Use `ecrecover` or `ethers.utils.verifyMessage()`
- Solana: Use `nacl.sign.detached.verify()` with wallet's public key
- Verify all parameters match current connection
- Check timestamp freshness (within 5 minutes)

## Security Benefits

### 1. Authentication
- **Proof of Identity**: Wallet must possess private key for claimed address
- **Non-Repudiation**: Wallet cannot deny creating the session
- **Address Binding**: Session is cryptographically bound to wallet address

### 2. Integrity Protection
- **Parameter Binding**: Token includes all connection parameters (serverUrl, dappPublicKey, etc.)
- **Tamper Detection**: Any modification invalidates signature
- **Chain Verification**: Ensures correct blockchain network

### 3. Attack Prevention
- **Session Hijacking**: Attacker cannot create valid tokens without wallet's private key
- **Replay Attacks**: Timestamp + signature prevents reuse of old requests
- **Man-in-the-Middle**: Token binds to specific dApp public key
- **Parameter Injection**: Signature covers all critical parameters

### 4. Trust Model
- **Zero-Trust Backend**: Backend still cannot read messages or verify tokens
- **Mutual Authentication**: Both parties cryptographically authenticated
- **Session Lifecycle**: Clear token validity period

## Implementation Plan

### Phase 1: Connection Flow Changes

#### Current Flow
```
1. dApp: Generate keys, create UUID, display QR
2. Wallet: Scan QR, generate keys
3. Wallet → Backend: emit('connected_uuid', { uuid, publicKey })
4. Backend → dApp: Broadcast connected_uuid
5. Both parties: Compute shared secret
```

#### New Flow (Simplified)
```
1. dApp: Generate keys, create UUID, display QR
2. Wallet: Scan QR, generate keys, compute shared secret
3. Wallet: Create & sign sessionToken immediately
4. Wallet → Backend: emit('connected_uuid', {
     uuid,
     publicKey,
     nonce,
     data: encrypt({ sessionToken, address, chainType })
   })
5. Backend → dApp: Forward connected_uuid (with encrypted data)
6. dApp: Compute shared secret, decrypt, STORE sessionToken (no verification)
7. dApp: Include sessionToken in all sign requests
8. Wallet: VERIFY sessionToken before processing each request
```

#### Key Changes
- Wallet creates sessionToken **immediately** during connection (Phase 2)
- SessionToken sent in **same event** as public key (`connected_uuid`)
- No separate `connection_response` event needed
- **dApp does NOT verify** sessionToken during connection (just stores it)
- **Wallet verifies** sessionToken before processing each sign request
- Simpler flow: public key + encrypted sessionToken in one message
- Backend remains stateless (just forwards encrypted data)

### Phase 2: Sign Request/Response Changes

#### Sign Request (dApp → Wallet)
```typescript
// Before
{
  id: string;
  type: SignRequestType;
  chainType: ChainType;
  chainId: string;
  payload: string; // JSON-encoded
  timestamp: number;
}

// After (add sessionToken)
{
  id: string;
  type: SignRequestType;
  chainType: ChainType;
  chainId: string;
  payload: string;
  sessionToken: SessionToken; // Added
  timestamp: number;
}
```

#### Wallet Validation
```typescript
async handleSignRequest(encryptedRequest) {
  // 1. Decrypt request
  const request = decrypt(encryptedRequest);

  // 2. Verify sessionToken
  if (!request.sessionToken) {
    throw new Error('Missing session token');
  }

  // 3. Validate signature
  if (!verifySessionToken(request.sessionToken, session)) {
    throw new Error('Invalid session token');
  }

  // 4. Check parameters match
  if (request.sessionToken.sessionId !== session.uuid) {
    throw new Error('Session ID mismatch');
  }

  // 5. Check timestamp freshness
  if (!isTokenFresh(request.sessionToken.timestamp)) {
    throw new Error('Session token expired');
  }

  // 6. Process request
  const result = await signer.signMessage(request.payload);
  return result;
}
```

### Phase 3: Type Definitions

#### New Types (packages/*/src/types/protocol.ts)

```typescript
/**
 * Session token for authentication
 */
export interface SessionToken {
  sessionId: string;
  walletAddress: string;
  chainType: ChainType;
  appUrl?: string;
  serverUrl: string;
  dappPublicKey: string;
  timestamp: number;
  signature: string;
}

/**
 * Connection response data (encrypted)
 */
export interface ConnectionResponseData {
  sessionToken: SessionToken;
  address: string;
  chainType: ChainType;
  chainId?: string;
}

/**
 * Updated sign request with sessionToken
 */
export interface SignRequest {
  id: string;
  type: SignRequestType;
  chainType: ChainType;
  chainId: string;
  payload: string;
  sessionToken: SessionToken; // Added
  timestamp: number;
}
```

### Phase 4: SDK Implementation

#### Wallet SDK Changes (packages/phoenix-wallet/)

**File: `src/utils/sessionToken.ts`** (New)
```typescript
import { SessionToken, ChainType } from '../types';
import { WalletSigner } from '../types';

/**
 * Create session token signed by wallet
 */
export async function createSessionToken(
  sessionId: string,
  walletAddress: string,
  chainType: ChainType,
  serverUrl: string,
  dappPublicKey: string,
  signer: WalletSigner,
  appUrl?: string
): Promise<SessionToken> {
  const timestamp = Date.now();

  // Create message to sign
  const message = [
    sessionId,
    walletAddress,
    chainType,
    appUrl || '',
    serverUrl,
    dappPublicKey,
    timestamp.toString()
  ].join(':');

  // Sign with wallet's private key
  const signature = await signer.signMessage(message);

  return {
    sessionId,
    walletAddress,
    chainType,
    appUrl,
    serverUrl,
    dappPublicKey,
    timestamp,
    signature
  };
}

/**
 * Validate session token matches current session
 */
export function validateSessionToken(
  token: SessionToken,
  currentSession: {
    uuid: string;
    address: string;
    chainType: ChainType;
  },
  currentServerUrl: string,
  currentDappPublicKey: string
): boolean {
  // Check session ID
  if (token.sessionId !== currentSession.uuid) {
    return false;
  }

  // Check wallet address
  if (token.walletAddress.toLowerCase() !== currentSession.address.toLowerCase()) {
    return false;
  }

  // Check chain type
  if (token.chainType !== currentSession.chainType) {
    return false;
  }

  // Check server URL
  if (token.serverUrl !== currentServerUrl) {
    return false;
  }

  // Check dApp public key
  if (token.dappPublicKey !== currentDappPublicKey) {
    return false;
  }

  // Check timestamp freshness (5 minutes)
  const now = Date.now();
  const maxAge = 5 * 60 * 1000;
  if (now - token.timestamp > maxAge) {
    return false;
  }

  return true;
}
```

**File: `src/PhoenixWalletClient.ts`** (Modified)
```typescript
async connect(qrData: string, signer: WalletSigner): Promise<void> {
  // Parse QR code
  const connectionData: PhoenixURI = QRParser.parseURI(qrData);

  // Generate wallet keys
  this.encryption.generateKeyPair();

  // Set peer public key and compute shared secret
  this.encryption.setPeerPublicKey(connectionData.publicKey);

  // Create session token IMMEDIATELY
  const sessionToken = await createSessionToken(
    connectionData.uuid,
    signer.address,
    signer.chainType,
    connectionData.serverUrl,
    connectionData.publicKey,
    signer,
    connectionData.appUrl
  );

  // Prepare connection data with sessionToken
  const connectionResponseData: ConnectionResponseData = {
    sessionToken,
    address: signer.address,
    chainType: signer.chainType,
    chainId: this.session.chainId
  };

  // Encrypt using shared secret
  const encrypted = this.encryption.encrypt(connectionResponseData);

  // Connect to backend
  await this.connectSocket(connectionData.serverUrl, connectionData.uuid);

  // Send public key + encrypted sessionToken in ONE message
  this.socket.emit('connected_uuid', {
    uuid: connectionData.uuid,
    publicKey: this.encryption.getPublicKey(),
    nonce: encrypted.nonce,
    data: encrypted.encryptedData
  });

  // Update session
  this.session.connected = true;
  await this.sessionStorage.saveSession(/* ... */);
  this.emit('session_connected', this.session);
}
```

#### dApp SDK Changes (packages/phoenix-dapp/)

**Note**: dApp SDK does NOT need sessionToken verification utilities. It simply stores the token and includes it in requests.

**File: `src/PhoenixDappClient.ts`** (Modified)
```typescript
private setupSocketListeners(): void {
  // ... existing listeners ...

  // Handle connected_uuid with encrypted sessionToken
  this.socket.on('connected_uuid', async (data: {
    uuid: string;
    publicKey: string;
    nonce?: string;
    data?: string;
  }) => {
    try {
      // Set peer public key
      this.encryption.setPeerPublicKey(data.publicKey);

      // If encrypted data present, decrypt and STORE sessionToken (NO VERIFICATION)
      if (data.nonce && data.data) {
        const decrypted = this.encryption.decrypt(
          data.data,
          data.nonce,
          Date.now() // Use current time if timestamp not provided
        );

        const responseData: ConnectionResponseData = JSON.parse(decrypted);

        // Store session token for future requests (no verification here)
        this.session.sessionToken = responseData.sessionToken;
        this.session.address = responseData.address;
        this.session.chainType = responseData.chainType;
        this.session.chainId = responseData.chainId;
        this.session.connected = true;

        // Save session
        await this.sessionStorage.saveSession(/* ... */);

        // Emit connected event
        this.emit('session_connected', this.session);
      }
    } catch (error) {
      console.error('Failed to process connection:', error);
      this.emit('error', error);
    }
  });
}

// Update sign request to include sessionToken
async signMessage(params: SignMessageParams): Promise<string> {
  if (!this.session?.connected) {
    throw new Error('Not connected');
  }

  if (!this.session.sessionToken) {
    throw new Error('No session token available');
  }

  const request: SignRequest = {
    id: this.requestManager.generateRequestId(),
    type: 'sign_message',
    chainType: params.chainType || this.session.chainType,
    chainId: params.chainId || this.session.chainId,
    payload: encodePayload(params),
    sessionToken: this.session.sessionToken, // Added
    timestamp: Date.now()
  };

  return this.sendRequest(request);
}
```

### Phase 5: Backend Changes (Minimal)

Backend remains **stateless** and **no changes needed**!

The existing `connected_uuid` event handler already forwards all data:

```javascript
// backend/server.js - NO CHANGES NEEDED

socket.on('connected_uuid', (data) => {
  const { uuid } = data;

  // Forward entire data object to room (including nonce and encrypted data)
  socket.to(uuid).emit('connected_uuid', data);

  console.log(`[${uuid}] Wallet connected (with encrypted sessionToken)`);
});
```

The backend simply forwards whatever data the wallet sends, including the new encrypted sessionToken fields (`nonce` and `data`). This maintains the zero-trust architecture.

## Implementation Checklist

### Type Definitions
- [ ] Add `SessionToken` interface to `packages/*/src/types/protocol.ts`
- [ ] Add `ConnectionResponseData` interface
- [ ] Update `SignRequest` to include `sessionToken: SessionToken`
- [ ] Update `Session` interface to store `sessionToken?: SessionToken`

### Wallet SDK (packages/phoenix-wallet/)
- [ ] Create `src/utils/sessionToken.ts` with `createSessionToken()` and `validateSessionToken()`
- [ ] Modify `PhoenixWalletClient.connect()` to create and send sessionToken
- [ ] Add signature creation using `signer.signMessage()`
- [ ] Update `RequestHandler` to validate incoming sessionToken in requests
- [ ] Add sessionToken validation before processing any sign request
- [ ] Update session storage to include sessionToken

### dApp SDK (packages/phoenix-dapp/)
- [ ] Modify `PhoenixDappClient.connected_uuid` listener to handle encrypted data
- [ ] Store sessionToken in session (no verification needed)
- [ ] Update all sign methods to include sessionToken in requests
- [ ] Update session storage to include sessionToken

### Backend
- [ ] ~~No changes needed~~ ✅ Existing code already supports forwarding encrypted data
- [ ] Test that encrypted sessionToken is properly forwarded in `connected_uuid` event
- [ ] Verify backend remains stateless and cannot decrypt sessionToken

### Testing
- [ ] Unit test: sessionToken creation (wallet SDK)
- [ ] Unit test: sessionToken signature verification - EVM (wallet SDK)
- [ ] Unit test: sessionToken signature verification - Solana (wallet SDK)
- [ ] Unit test: sessionToken validation - parameters (wallet SDK)
- [ ] Unit test: sessionToken expiration (wallet SDK)
- [ ] Integration test: Full connection flow with sessionToken
- [ ] Integration test: dApp stores sessionToken correctly
- [ ] Integration test: Sign request with valid sessionToken (wallet verifies)
- [ ] Integration test: Sign request with invalid sessionToken (wallet rejects)
- [ ] Integration test: Expired sessionToken (wallet rejects)
- [ ] Integration test: Tampered parameters (wallet rejects)

### Documentation
- [ ] Update `SEQUENCE_DIAGRAMS_CONNECTION.md` with new flow
- [ ] Update `SEQUENCE_DIAGRAMS_SIGN_OPERATIONS.md`
- [ ] Update SDK READMEs with sessionToken explanation
- [ ] Add migration guide for existing implementations
- [ ] Document security improvements in CLAUDE.md

### Deployment
- [ ] Bump SDK versions (breaking change - major version)
- [ ] Publish updated SDKs to npm
- [ ] Update web dApp implementation
- [ ] Update mobile wallet implementation
- [ ] Test end-to-end flow
- [ ] Monitor for issues

## Migration Strategy

### Backward Compatibility

**Option 1: Hard Break (Recommended)**
- Require sessionToken immediately
- Bump to v2.0.0 (breaking change)
- Clear communication to users
- Simpler codebase

**Option 2: Gradual Migration**
- Support both with/without sessionToken
- Use protocol version to negotiate
- Deprecation warning for non-token connections
- More complex codebase

**Recommendation: Option 1** - Security enhancement justifies breaking change.

### Rollout Plan
1. **Week 1**: Implement and test in development
2. **Week 2**: Beta release with selected partners
3. **Week 3**: Public release with migration guide
4. **Week 4**: Monitor adoption and fix issues

## Security Considerations

### Token Lifetime
- **Short-lived**: 5-minute validity (same as message timestamps)
- **Non-renewable**: Must reconnect for new token
- **Session-bound**: One token per session

### Key Management
- **Wallet Keys**: Using actual blockchain signing keys
- **Encryption Keys**: Separate from signing keys (nacl.box)
- **No Key Reuse**: Different key types for different purposes

### Attack Scenarios

**Scenario 1: Token Theft**
- Attacker steals sessionToken from network
- **Mitigation**: Token is encrypted, only valid for specific session
- **Impact**: Low - Token bound to session and expires quickly

**Scenario 2: Signature Replay**
- Attacker replays signed sessionToken
- **Mitigation**: Timestamp + session ID binding
- **Impact**: Low - Token expires in 5 minutes

**Scenario 3: Parameter Tampering**
- Attacker modifies connection parameters
- **Mitigation**: Signature covers all parameters
- **Impact**: None - Signature verification fails

**Scenario 4: Session Hijacking**
- Attacker gets shared encryption key
- **Mitigation**: Without sessionToken signature, cannot create valid requests
- **Impact**: Low - Attacker still needs wallet's private key

## Performance Impact

### Connection Time
- **Additional Operations**: 1 signature creation, 1 signature verification
- **EVM Signing**: ~50-100ms
- **Solana Signing**: ~10-20ms
- **Total Impact**: < 150ms additional latency (negligible)

### Request Processing
- **Per-Request Overhead**: sessionToken validation (already in payload)
- **Verification Time**: Signature already created, just parameter checking
- **Total Impact**: < 5ms per request (negligible)

### Payload Size
- **SessionToken Size**: ~300-400 bytes
- **QR Code**: No impact (token sent after connection)
- **Network Traffic**: < 1KB per session (one-time)
- **Total Impact**: Negligible

## Success Metrics

### Security
- ✅ Zero session hijacking incidents
- ✅ Zero unauthorized request incidents
- ✅ 100% signature verification success rate

### Performance
- ✅ Connection time increase < 200ms
- ✅ Request processing time increase < 10ms
- ✅ 99.9% sessionToken validation success rate

### Adoption
- ✅ 100% of new connections use sessionToken
- ✅ Zero critical security bugs reported
- ✅ Positive developer feedback

## Conclusion

The sessionToken enhancement provides **strong cryptographic authentication** on top of the existing encryption, significantly improving security posture while maintaining the zero-trust backend architecture. The implementation is straightforward, performance impact is minimal, and security benefits are substantial.

**Recommendation**: Proceed with implementation as a **major version upgrade (v2.0.0)** with clear migration documentation.
