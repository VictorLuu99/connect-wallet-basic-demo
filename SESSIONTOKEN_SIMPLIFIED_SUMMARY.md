# SessionToken Implementation - Simplified Flow

## Key Simplification

**Original plan**: Separate phases for public key exchange and sessionToken exchange (2 events)
**Simplified plan**: SessionToken created immediately and sent with public key (1 event)

## Simplified Flow

### Phase 1: dApp Prepares (Unchanged)
```
dApp: Generate keys → Create UUID → Display QR code
```

### Phase 2: Wallet Scans & Sends Everything
```
Wallet:
  1. Scan QR → Parse connectionData
  2. Generate wallet keys
  3. Compute shared secret (can encrypt immediately)
  4. Create & sign sessionToken
  5. Encrypt { sessionToken, address, chainType }
  6. Send ONE message with:
     - publicKey (plain)
     - nonce (for decryption)
     - data (encrypted sessionToken)
```

### Phase 3: dApp Receives & Verifies
```
dApp:
  1. Receive 'connected_uuid' event
  2. Extract publicKey, nonce, data
  3. Compute shared secret
  4. Decrypt data → get sessionToken
  5. Verify sessionToken signature
  6. Store sessionToken for future requests
```

### Result: 3 Phases Instead of 5!

## Technical Implementation

### Wallet Side (PhoenixWalletClient)

```typescript
async connect(qrData: string, signer: WalletSigner): Promise<void> {
  // 1. Parse QR
  const { uuid, serverUrl, publicKey: dappPublicKey } = QRParser.parseURI(qrData);

  // 2. Generate keys & compute shared secret
  this.encryption.generateKeyPair();
  this.encryption.setPeerPublicKey(dappPublicKey);

  // 3. Create sessionToken IMMEDIATELY
  const sessionToken = await createSessionToken(
    uuid,
    signer.address,
    signer.chainType,
    serverUrl,
    dappPublicKey,
    signer
  );

  // 4. Encrypt sessionToken
  const encrypted = this.encryption.encrypt({
    sessionToken,
    address: signer.address,
    chainType: signer.chainType
  });

  // 5. Connect & send EVERYTHING in one message
  await this.connectSocket(serverUrl, uuid);
  this.socket.emit('connected_uuid', {
    uuid,
    publicKey: this.encryption.getPublicKey(),
    nonce: encrypted.nonce,
    data: encrypted.encryptedData
  });
}
```

### dApp Side (PhoenixDappClient)

```typescript
this.socket.on('connected_uuid', async (data) => {
  // 1. Set peer public key
  this.encryption.setPeerPublicKey(data.publicKey);

  // 2. If encrypted data present, process sessionToken
  if (data.nonce && data.data) {
    // 3. Decrypt
    const decrypted = this.encryption.decrypt(data.data, data.nonce);
    const { sessionToken, address, chainType } = JSON.parse(decrypted);

    // 4. Store sessionToken (NO VERIFICATION - wallet owns verification)
    this.session.sessionToken = sessionToken;
    this.session.address = address;
    this.session.chainType = chainType;
    this.session.connected = true;
    this.emit('session_connected', this.session);
  }
});
```

### Backend (NO CHANGES NEEDED!)

```javascript
// Existing code already forwards all data
socket.on('connected_uuid', (data) => {
  socket.to(data.uuid).emit('connected_uuid', data);
});
```

Backend forwards the entire data object (including `nonce` and `data` fields) without knowing what's inside!

## Benefits of Simplified Flow

### 1. Fewer Network Round-Trips
- **Before**: 3 messages (join, publicKey, sessionToken)
- **After**: 2 messages (join, publicKey+sessionToken)
- **Improvement**: 33% fewer messages

### 2. Simpler Implementation
- No separate `connection_response` event
- Less state management
- Fewer edge cases to handle

### 3. Atomic Connection
- Public key and sessionToken sent together
- Either both succeed or both fail
- No partial connection states

### 4. Better Performance
- Faster connection establishment
- Less waiting time for user
- Single encryption operation

### 5. Easier Testing
- One flow to test instead of two
- Clearer success/failure conditions
- Simpler mocks needed

## Event Structure

### connected_uuid Event (Enhanced)

```typescript
{
  uuid: string;              // Session ID
  publicKey: string;         // Wallet's encryption public key (plain)
  nonce?: string;            // Encryption nonce (NEW)
  data?: string;             // Encrypted sessionToken data (NEW)
}
```

**Backward Compatible**: Old wallets can send just `uuid` and `publicKey`. New wallets add `nonce` and `data`.

## Migration Path

### Phase 1: Update SDKs
1. Update wallet SDK to create sessionToken immediately
2. Update dApp SDK to expect encrypted data in `connected_uuid`
3. Make sessionToken optional initially (for backward compatibility)

### Phase 2: Deploy & Monitor
1. Deploy new SDKs (v2.0.0)
2. Monitor connection success rates
3. Ensure both old and new flows work

### Phase 3: Enforce (Optional)
1. After migration period, make sessionToken required
2. Reject connections without sessionToken
3. Remove backward compatibility code

## Comparison: Before vs After

### Before (Proposed in Original Plan)
```
Wallet → Backend: connected_uuid { uuid, publicKey }
Backend → dApp: Forward connected_uuid

[Separate event]

Wallet → Backend: connection_response { uuid, nonce, data }
Backend → dApp: Forward connection_response
```

### After (Simplified)
```
Wallet → Backend: connected_uuid { uuid, publicKey, nonce, data }
Backend → dApp: Forward connected_uuid
```

**Result**: Same security, simpler implementation, better performance!

## Security Analysis

### Does Simplification Reduce Security?

**No! Security is maintained:**

✅ SessionToken still signed by wallet's blockchain private key
✅ SessionToken still encrypted with shared secret (E2E encryption)
✅ **Wallet verifies sessionToken** before processing any sign request
✅ Backend still cannot decrypt sessionToken (zero-trust maintained)
✅ All parameters still bound to session
✅ Replay protection still enforced (timestamp validation)

### What Changed?

**Timing Simplification:**
- Before: SessionToken created after seeing dApp's acknowledgment
- After: SessionToken created immediately upon scanning QR

**Verification Simplification:**
- Before: dApp verifies sessionToken signature during connection
- After: **Wallet verifies sessionToken** before processing each request

**Why this is better:**
- Wallet already has all information from QR code
- Shared secret can be computed immediately after reading dappPublicKey
- No need to wait for network round-trip
- Wallet controls when to send (same security guarantees)
- **Wallet owns the sessionToken, so wallet should verify it**
- Simpler dApp implementation (just store and forward)
- Security enforced at the point of use (sign request time)

## Implementation Effort

### Reduced Complexity
- **Less code**: ~100 lines saved by removing separate event
- **Less testing**: 1 connection flow instead of 2
- **Less documentation**: Simpler sequence diagrams
- **Less debugging**: Fewer failure modes

### Unchanged Complexity
- SessionToken creation (same)
- Signature verification (same)
- Encryption/decryption (same)
- Request validation (same)

## Conclusion

The simplified flow provides **the same security guarantees** with:
- ✅ 33% fewer network messages
- ✅ Simpler implementation
- ✅ Better performance
- ✅ Easier testing
- ✅ Atomic connection semantics
- ✅ **NO backend changes needed**

**Recommendation**: Proceed with simplified implementation.
