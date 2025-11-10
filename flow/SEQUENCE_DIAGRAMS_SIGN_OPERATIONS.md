# Sign Operations Flow - Phoenix Protocol SDK

## Overview
Unified flow for dApp to request wallet to sign messages or transactions using the Phoenix Protocol SDK. All communication is end-to-end encrypted using TweetNaCl (Curve25519 + XSalsa20-Poly1305). The backend only forwards encrypted messages without reading content. Supports multiple blockchain types (EVM, Solana) via `chainType` and `chainId`.

## Prerequisites
- dApp and Wallet are connected (same UUID room)
- Shared secret established via ECDH key exchange during connection phase
- Both parties in the same Socket.io room
- Phoenix SDKs initialized on both sides

## Supported Operations
- `sign_message`: Sign arbitrary message
- `sign_transaction`: Sign transaction (returns signature, does not broadcast)
- `sign_all_transactions`: Batch sign multiple transactions (e.g., Solana)
- `send_transaction`: Sign and broadcast transaction immediately (e.g., EVM)

## Supported Chain Types
- `evm`: Ethereum Virtual Machine chains (Ethereum, Polygon, BSC, etc.)
- `solana`: Solana blockchain

---

## Mermaid Diagram - SDK Flow

```mermaid
sequenceDiagram
    participant User
    participant DAppSDK as PhoenixDappClient<br/>(@phoenix-demo/dapp)
    participant Backend as Backend<br/>(Dumb Relay)
    participant WalletSDK as PhoenixWalletClient<br/>(@phoenix-demo/wallet)
    participant Signer as WalletSigner<br/>(User Implementation)

    Note over User,Signer: Prerequisites: Wallet & dApp Connected via SDK

    alt Sign Message Flow
        User->>DAppSDK: client.signMessage({<br/>  message: "Hello",<br/>  chainType: "evm",<br/>  chainId: "1"<br/>})
        activate DAppSDK
        DAppSDK->>DAppSDK: RequestManager.generateRequestId('sign_message')<br/>→ "msg-{timestamp}-{random}"
        DAppSDK->>DAppSDK: encodePayload({ message })<br/>→ JSON string
        DAppSDK->>DAppSDK: Create SignRequest:<br/>{ id, type, chainType, chainId,<br/>  payload: string, timestamp }
        DAppSDK->>DAppSDK: EncryptionManager.encrypt(request)<br/>→ { encrypted, nonce }
        DAppSDK->>DAppSDK: RequestManager.addRequest(id, resolve, reject)<br/>→ Track pending request (60s timeout)
        DAppSDK->>Backend: socket.emit('dapp:request', {<br/>  uuid, encryptedPayload,<br/>  nonce, timestamp })
        deactivate DAppSDK
    else Sign Transaction Flow
        User->>DAppSDK: client.signTransaction({<br/>  transaction: {...},<br/>  chainType: "evm",<br/>  chainId: "1"<br/>})
        activate DAppSDK
        DAppSDK->>DAppSDK: RequestManager.generateRequestId('sign_transaction')<br/>→ "tx-{timestamp}-{random}"
        DAppSDK->>DAppSDK: encodePayload(transaction)<br/>→ JSON string
        DAppSDK->>DAppSDK: Create SignRequest & encrypt
        DAppSDK->>Backend: socket.emit('dapp:request', {...})
        deactivate DAppSDK
    else Sign All Transactions Flow (Batch)
        User->>DAppSDK: client.signAllTransactions({<br/>  transactions: [...],<br/>  chainType: "solana",<br/>  chainId: "mainnet-beta"<br/>})
        activate DAppSDK
        DAppSDK->>DAppSDK: RequestManager.generateRequestId('sign_all_transactions')<br/>→ "txs-{timestamp}-{random}"
        DAppSDK->>DAppSDK: encodePayload({ transactions })<br/>→ JSON string
        DAppSDK->>DAppSDK: Create SignRequest & encrypt
        DAppSDK->>Backend: socket.emit('dapp:request', {...})
        deactivate DAppSDK
    else Send Transaction Flow (Direct Send)
        User->>DAppSDK: client.sendTransaction({<br/>  transaction: {...},<br/>  chainType: "evm",<br/>  chainId: "1"<br/>})
        activate DAppSDK
        DAppSDK->>DAppSDK: RequestManager.generateRequestId('send_transaction')<br/>→ "send-{timestamp}-{random}"
        DAppSDK->>DAppSDK: encodePayload(transaction)<br/>→ JSON string
        DAppSDK->>DAppSDK: Create SignRequest & encrypt
        DAppSDK->>Backend: socket.emit('dapp:request', {...})
        deactivate DAppSDK
    end

    activate Backend
    Note over Backend: Backend CANNOT read content<br/>Just forward to room
    Backend->>Backend: Broadcast to room (uuid)<br/>(NO verification, just forward)
    Backend->>WalletSDK: socket.emit('wallet:request', {<br/>  uuid, encryptedPayload,<br/>  nonce, timestamp })
    deactivate Backend

    activate WalletSDK
    WalletSDK->>WalletSDK: Receive 'wallet:request' event
    WalletSDK->>WalletSDK: EncryptionManager.decrypt(encryptedPayload, nonce)<br/>→ SignRequest
    WalletSDK->>WalletSDK: RequestHandler.validateRequest(request)<br/>→ Check timestamp (5min), chainType match
    WalletSDK->>WalletSDK: RequestHandler stores as pendingRequest
    WalletSDK->>WalletSDK: emit('sign_request', request)
    
    alt type === 'sign_message'
        WalletSDK->>User: Show approval modal<br/>Display: decodedPayload.message<br/>Chain: {chainType, chainId}
    else type === 'sign_transaction'
        WalletSDK->>User: Show approval modal<br/>Display: Transaction details<br/>(To, Value, From, Chain, Type)
    else type === 'sign_all_transactions'
        WalletSDK->>User: Show approval modal<br/>Display: Batch transactions<br/>(Count, Details, Chain)
    else type === 'send_transaction'
        WalletSDK->>User: Show approval modal<br/>Display: Transaction details<br/>(Note: Will broadcast immediately)
    end
    deactivate WalletSDK

    Note over User,Signer: User Reviews Request

    alt User Approves ✅
        User->>WalletSDK: client.approveRequest(requestId)
        activate WalletSDK
        WalletSDK->>WalletSDK: RequestHandler.approveRequest(requestId)
        activate WalletSDK
        WalletSDK->>WalletSDK: decodePayload(request.payload)<br/>→ Decoded payload object
        WalletSDK->>Signer: Call signer method based on type
        activate Signer
        alt type === 'sign_message'
            Signer->>Signer: signer.signMessage(decodedPayload)<br/>(chainType-specific)
            Signer-->>WalletSDK: signature: string
        else type === 'sign_transaction'
            Signer->>Signer: signer.signTransaction(decodedPayload)<br/>(chainType-specific)
            Signer-->>WalletSDK: signature: string
        else type === 'sign_all_transactions'
            Signer->>Signer: signer.signAllTransactions(decodedPayload.transactions)<br/>(chainType-specific)
            Signer-->>WalletSDK: signatures: string[]
        else type === 'send_transaction'
            Signer->>Signer: signer.sendTransaction(decodedPayload)<br/>or signer.signTransaction() fallback<br/>(chainType-specific)
            Signer-->>WalletSDK: txHash: string
        end
        deactivate Signer
        
        WalletSDK->>WalletSDK: Create SignResponse:<br/>{ id, type, status: 'success',<br/>  result: { signature/signatures/txHash },<br/>  timestamp }
        WalletSDK->>WalletSDK: EncryptionManager.encrypt(response)<br/>→ { encrypted, nonce }
        WalletSDK->>WalletSDK: RequestHandler.clearPendingRequest()
        WalletSDK->>WalletSDK: emit('request_approved', requestId)
        WalletSDK->>Backend: socket.emit('wallet:response', {<br/>  uuid, encryptedPayload,<br/>  nonce, timestamp })
        deactivate WalletSDK

        Note over Backend: Backend CANNOT read content<br/>Just forward to room
        Backend->>Backend: Broadcast to room (uuid)<br/>(NO verification, just forward)
        Backend->>DAppSDK: socket.emit('dapp:response', {<br/>  uuid, encryptedPayload,<br/>  nonce, timestamp })
        deactivate Backend

        activate DAppSDK
        DAppSDK->>DAppSDK: Receive 'dapp:response' event
        DAppSDK->>DAppSDK: EncryptionManager.decrypt(encryptedPayload, nonce)<br/>→ SignResponse
        DAppSDK->>DAppSDK: RequestManager.resolveRequest(id, response)<br/>→ Resolve Promise
        DAppSDK->>DAppSDK: emit('request_response', response)
        DAppSDK-->>User: Promise resolves with SignResponse<br/>{ status: 'success', result: {...} }
        deactivate DAppSDK

        Note over User,Signer: ✅ Operation Completed Successfully
    else User Rejects ❌
        User->>WalletSDK: client.rejectRequest(requestId, reason?)
        activate WalletSDK
        WalletSDK->>WalletSDK: RequestHandler.rejectRequest(requestId, reason)
        WalletSDK->>WalletSDK: Create SignResponse:<br/>{ id, type, status: 'error',<br/>  error: 'User rejected',<br/>  timestamp }
        WalletSDK->>WalletSDK: EncryptionManager.encrypt(response)
        WalletSDK->>WalletSDK: RequestHandler.clearPendingRequest()
        WalletSDK->>WalletSDK: emit('request_rejected', requestId)
        WalletSDK->>Backend: socket.emit('wallet:response', {...})
        deactivate WalletSDK

        Note over Backend: Backend CANNOT read content<br/>Just forward to room
        Backend->>Backend: Broadcast to room (uuid)
        Backend->>DAppSDK: socket.emit('dapp:response', {...})
        deactivate Backend

        activate DAppSDK
        DAppSDK->>DAppSDK: Decrypt response
        DAppSDK->>DAppSDK: RequestManager.rejectRequest(id, Error)<br/>→ Reject Promise
        DAppSDK->>DAppSDK: emit('request_response', response)
        DAppSDK-->>User: Promise rejects with Error<br/>{ status: 'error', error: '...' }
        deactivate DAppSDK

        Note over User,Signer: ❌ Request Rejected
    end
```

---

## SDK Usage Examples

### dApp Side (PhoenixDappClient)

#### 1. Sign Message

```typescript
import { PhoenixDappClient } from '@phoenix-demo/dapp';

const client = new PhoenixDappClient({
  serverUrl: 'http://localhost:3001',
});

// Connect first (returns QR code URI)
const { uri, uuid } = await client.connect();

// Wait for wallet to connect
client.on('session_connected', (session) => {
  console.log('Connected to wallet:', session);
});

// Sign message
try {
  const response = await client.signMessage({
    message: 'Hello World',
    chainType: 'evm',
    chainId: '1', // Ethereum mainnet
  });

  if (response.status === 'success') {
    console.log('Signature:', response.result?.signature);
    console.log('Message:', response.result?.message);
  }
} catch (error) {
  console.error('Sign message failed:', error);
}
```

#### 2. Sign Transaction

```typescript
const response = await client.signTransaction({
  transaction: {
    to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
    value: '100000000000000000', // Wei
    data: '0x',
    gasLimit: '21000',
  },
  chainType: 'evm',
  chainId: '1',
});

if (response.status === 'success') {
  console.log('Transaction signature:', response.result?.signature);
}
```

#### 3. Sign All Transactions (Batch)

```typescript
const response = await client.signAllTransactions({
  transactions: [
    { /* Solana transaction 1 */ },
    { /* Solana transaction 2 */ },
  ],
  chainType: 'solana',
  chainId: 'mainnet-beta',
});

if (response.status === 'success') {
  console.log('Signatures:', response.result?.signatures);
  console.log('Count:', response.result?.signatures?.length);
}
```

#### 4. Send Transaction (Direct Broadcast)

```typescript
const response = await client.sendTransaction({
  transaction: {
    to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
    value: '100000000000000000',
    data: '0x',
  },
  chainType: 'evm',
  chainId: '1',
});

if (response.status === 'success') {
  console.log('Transaction hash:', response.result?.txHash);
}
```

### Wallet Side (PhoenixWalletClient)

#### 1. Connect to dApp

```typescript
import { PhoenixWalletClient } from '@phoenix-demo/wallet';

const client = new PhoenixWalletClient();

// Implement WalletSigner interface
const signer: WalletSigner = {
  address: '0x...',
  chainType: 'evm',
  async signMessage(payload: any): Promise<string> {
    // Implement message signing logic
    return '0x...';
  },
  async signTransaction(payload: any): Promise<string> {
    // Implement transaction signing logic
    return '0x...';
  },
  async sendTransaction(payload: any): Promise<string> {
    // Implement transaction sending logic
    return '0x...';
  },
};

// Connect by scanning QR code
await client.connect(qrData, signer);

client.on('session_connected', (session) => {
  console.log('Connected to dApp:', session);
});
```

#### 2. Handle Sign Requests

```typescript
client.on('sign_request', (request: SignRequest) => {
  console.log('Sign request received:', request.type);
  
  // Show approval UI to user
  if (request.type === 'sign_message') {
    const payload = JSON.parse(request.payload);
    showApprovalModal({
      message: payload.message,
      chainType: request.chainType,
      chainId: request.chainId,
      onApprove: () => client.approveRequest(request.id),
      onReject: () => client.rejectRequest(request.id, 'User rejected'),
    });
  } else if (request.type === 'sign_transaction') {
    const transaction = JSON.parse(request.payload);
    showTransactionModal({
      from: signer.address,
      to: transaction.to,
      value: transaction.value,
      chainType: request.chainType,
      chainId: request.chainId,
      onApprove: () => client.approveRequest(request.id),
      onReject: () => client.rejectRequest(request.id),
    });
  }
  // ... handle other request types
});

client.on('request_approved', (requestId) => {
  console.log('Request approved:', requestId);
});

client.on('request_rejected', (requestId) => {
  console.log('Request rejected:', requestId);
});
```

---

## Step-by-Step Breakdown (SDK Internal Flow)

### Phase 1: dApp SDK Initiates Request

The SDK handles all low-level details automatically:

1. **Generate Request ID**: `RequestManager.generateRequestId(type)` creates unique ID:
   - `sign_message` → `msg-{timestamp}-{random}`
   - `sign_transaction` → `tx-{timestamp}-{random}`
   - `sign_all_transactions` → `txs-{timestamp}-{random}`
   - `send_transaction` → `send-{timestamp}-{random}`

2. **Encode Payload**: `encodePayload(payload)` converts payload object to JSON string for multi-chain support

3. **Create Request**: Builds `SignRequest` object:
   ```typescript
   {
     id: string,
     type: SignRequestType,
     chainType: ChainType,
     chainId: string,
     payload: string, // JSON-encoded string
     timestamp: number
   }
   ```

4. **Encrypt**: `EncryptionManager.encrypt(request)` encrypts using nacl.box with wallet's public key

5. **Track Request**: `RequestManager.addRequest(id, resolve, reject)` tracks pending request with 60s timeout

6. **Send**: Emits `dapp:request` event to backend

### Phase 2: Backend Forwards Request (Dumb Relay)

```javascript
// Backend code - Just forwards encrypted messages
socket.on('dapp:request', (data) => {
  const { uuid } = data;
  // Backend CANNOT and SHOULD NOT decrypt or verify
  // Just broadcast to room participants
  socket.to(uuid).emit('wallet:request', data);
});
```

### Phase 3: Wallet SDK Receives and Processes Request

1. **Receive Event**: Listens for `wallet:request` event

2. **Decrypt**: `EncryptionManager.decrypt(encryptedPayload, nonce)` decrypts to `SignRequest`

3. **Validate**: `RequestHandler.validateRequest(request)`:
   - Verifies timestamp (max 5 minutes old)
   - Validates chainType matches signer's chainType
   - Stores as `pendingRequest`

4. **Emit Event**: Emits `sign_request` event for UI to show approval modal

### Phase 4: User Approves (Wallet SDK Generates Response)

1. **User Action**: Calls `client.approveRequest(requestId)`

2. **Process Request**: `RequestHandler.approveRequest(requestId)`:
   - Decodes payload: `decodePayload(request.payload)` → payload object
   - Calls appropriate signer method based on request type:
     - `sign_message` → `signer.signMessage(decodedPayload)`
     - `sign_transaction` → `signer.signTransaction(decodedPayload)`
     - `sign_all_transactions` → `signer.signAllTransactions(decodedPayload.transactions)`
     - `send_transaction` → `signer.sendTransaction(decodedPayload)` or fallback

3. **Create Response**: Builds `SignResponse`:
   ```typescript
   {
     id: string,
     type: SignRequestType,
     status: 'success',
     result: {
       signature?: string,
       signatures?: string[],
       txHash?: string,
       message?: string,
       from?: string,
     },
     timestamp: number
   }
   ```

4. **Encrypt & Send**: Encrypts response and emits `wallet:response` event

### Phase 5: User Rejects (Alternative Path)

1. **User Action**: Calls `client.rejectRequest(requestId, reason?)`

2. **Create Error Response**: `RequestHandler.rejectRequest(requestId, reason)` creates error response:
   ```typescript
   {
     id: string,
     type: SignRequestType,
     status: 'error',
     error: string,
     timestamp: number
   }
   ```

3. **Encrypt & Send**: Encrypts response and emits `wallet:response` event

### Phase 6: Backend Forwards Response (Dumb Relay)

```javascript
socket.on('wallet:response', (data) => {
  const { uuid } = data;
  socket.to(uuid).emit('dapp:response', data);
});
```

### Phase 7: dApp SDK Receives and Processes Response

1. **Receive Event**: Listens for `dapp:response` event

2. **Decrypt**: `EncryptionManager.decrypt(encryptedPayload, nonce)` decrypts to `SignResponse`

3. **Resolve/Reject**: `RequestManager.resolveRequest(id, response)` or `rejectRequest(id, error)`:
   - Resolves or rejects the Promise returned from the original method call
   - Clears pending request tracking

4. **Emit Event**: Emits `request_response` event

---

## Security Benefits

### ✅ End-to-End Encryption
- All messages encrypted with nacl.box (Curve25519 + XSalsa20-Poly1305)
- Backend cannot read message/transaction content
- Only dApp and Wallet can decrypt

### ✅ Authenticated Encryption
- nacl.box provides built-in MAC
- Prevents tampering even by backend
- Automatic integrity verification

### ✅ Replay Protection
- Timestamp verification (5 minute window)
- Request ID prevents duplicate processing
- SDK automatically validates timestamps

### ✅ Multi-Chain Support
- Chain type and chain ID in every request
- Generic payload encoding (JSON strings) supports any chain format
- WalletSigner interface handles chain-specific signing
- Supports EVM and Solana (extensible to any blockchain)

### ✅ Unified Event System
- Standardized `dapp:request` / `wallet:response` events
- Type field distinguishes operation types
- Status field distinguishes success/error

### ✅ Zero-Trust Backend
- Backend only forwards encrypted blobs
- No verification or decryption
- Compromised backend ≠ compromised security

### ✅ SDK Abstraction
- Automatic encryption/decryption
- Request timeout handling (60s default)
- Promise-based API for async operations
- Event-driven architecture for UI updates

---

## Message Formats

### Request Format (Encrypted)

The encrypted payload contains a `SignRequest`:

```typescript
interface SignRequest {
  id: string;              // "msg-1699234567890-abc123" | "tx-..." | "txs-..." | "send-..."
  type: SignRequestType;   // "sign_message" | "sign_transaction" | "sign_all_transactions" | "send_transaction"
  chainType: ChainType;    // "evm" | "solana"
  chainId: string;         // "1" (Ethereum), "mainnet-beta" (Solana), etc.
  payload: string;         // JSON-encoded string: "{\"message\":\"Hello\"}" or "{\"to\":\"0x...\",\"value\":\"...\"}"
  timestamp: number;       // Unix timestamp
}
```

Sent as `EncryptedMessage`:

```typescript
interface EncryptedMessage {
  uuid: string;            // Room UUID
  encryptedPayload: string; // base64 encrypted payload
  nonce: string;           // base64 nonce (24 bytes)
  timestamp: number;       // Unix timestamp (envelope timestamp)
}
```

### Response Format (Encrypted)

The encrypted payload contains a `SignResponse`:

**Success Response:**
```typescript
interface SignResponse {
  id: string;              // Request ID
  type: SignRequestType;   // Same as request type
  status: 'success';
  result: {
    signature?: string;    // For sign_message, sign_transaction
    signatures?: string[]; // For sign_all_transactions
    txHash?: string;       // For send_transaction
    message?: string;      // Optional: original message
    from?: string;         // Optional: sender address
  };
  timestamp: number;
}
```

**Error Response:**
```typescript
interface SignResponse {
  id: string;              // Request ID
  type: SignRequestType;   // Same as request type
  status: 'error';
  error: string;           // Error message
  timestamp: number;
}
```

Sent as `EncryptedMessage` (same format as request).

---

## Event Names

### Socket.io Events

| Event Name | Direction | Description |
|------------|-----------|-------------|
| `dapp:request` | dApp → Backend → Wallet | dApp sends request to wallet |
| `wallet:request` | Backend → Wallet | Backend forwards request to wallet |
| `wallet:response` | Wallet → Backend → dApp | Wallet sends response to dApp |
| `dapp:response` | Backend → dApp | Backend forwards response to dApp |

### SDK Events (EventEmitter3)

**PhoenixDappClient Events:**
- `session_connected` - Wallet connected to session
- `session_disconnected` - Wallet disconnected
- `request_sent` - Request sent to wallet (requestId)
- `request_response` - Response received from wallet (SignResponse)
- `error` - Error occurred

**PhoenixWalletClient Events:**
- `session_connected` - Connected to dApp
- `session_disconnected` - Disconnected from dApp
- `sign_request` - Sign request received (SignRequest) - **Show approval UI here**
- `request_approved` - Request approved (requestId)
- `request_rejected` - Request rejected (requestId)
- `error` - Error occurred

### Payload Type Field

The `type` field in `SignRequest` distinguishes operation types:
- `"sign_message"`: Sign arbitrary message
- `"sign_transaction"`: Sign transaction (returns signature, does not broadcast)
- `"sign_all_transactions"`: Batch sign multiple transactions (e.g., Solana)
- `"send_transaction"`: Sign and broadcast transaction immediately (e.g., EVM)

### Payload Status Field

The `status` field in `SignResponse`:
- `"success"`: Operation completed successfully
- `"error"`: Operation failed or rejected

---

## Backend Responsibilities (Minimal)

```javascript
// Backend ONLY does:
1. Receive encrypted messages from room participants
2. Forward dapp:request → wallet:request
3. Forward wallet:response → dapp:response
4. Broadcast to other participants in the same room (uuid)
5. Handle disconnections (Socket.io auto-cleanup)

// Backend NEVER does:
❌ Decrypt messages
❌ Verify signatures
❌ Validate request/response content
❌ Store request state
❌ Check permissions
❌ Modify message content
❌ Understand chainType or chainId
```

---

## Error Handling

### SDK Error Handling

**dApp Side:**
- Request timeout (60s): Promise rejects with `Error('Request timeout')`
- Decryption failure: Emits `error` event, request times out
- Invalid response: Promise rejects with error from response

**Wallet Side:**
- Timestamp expired: `RequestHandler.validateRequest()` throws error, emits `error` event
- Chain type mismatch: `RequestHandler.validateRequest()` throws error, emits `error` event
- Signing failure: `RequestHandler.approveRequest()` creates error response automatically

### Error Response Format

```typescript
{
  id: string,
  type: SignRequestType,
  status: 'error',
  error: string, // Error message
  timestamp: number
}
```

### Common Error Scenarios

1. **Decryption Failure**: Message is ignored, no error sent (prevents information leakage), request times out on sender side
2. **Timestamp Expired**: Wallet rejects with error response, dApp can retry
3. **Invalid Request**: Wallet validates and sends error response, dApp displays error
4. **User Rejection**: Wallet sends explicit error response, dApp displays rejection message
5. **Chain Type Mismatch**: Wallet validates and sends error response, dApp can handle gracefully
6. **Request Timeout**: dApp SDK automatically rejects Promise after 60s

---

## WalletSigner Interface

The wallet must implement a `WalletSigner` interface that handles signing differently based on `chainType`:

```typescript
interface WalletSigner {
  address: string;
  chainType: ChainType; // "evm" | "solana"
  
  // Sign a message (payload is already decoded from JSON string)
  signMessage(payload: any): Promise<string>;
  
  // Sign a transaction (payload is already decoded from JSON string)
  signTransaction(payload: any): Promise<string>;
  
  // Optional: Batch sign multiple transactions (e.g., Solana)
  signAllTransactions?(transactions: any[]): Promise<string[]>;
  
  // Optional: Sign and broadcast transaction immediately (e.g., EVM)
  sendTransaction?(payload: any): Promise<string>;
}
```

**Implementation Notes:**
- The SDK's `RequestHandler` automatically decodes payload from JSON string before calling signer methods
- The signer implementation handles chain-specific signing logic (EVM vs Solana)
- For `sign_message`: Calls `signer.signMessage(decodedPayload)` → Returns signature string
- For `sign_transaction`: Calls `signer.signTransaction(decodedPayload)` → Returns signature string
- For `sign_all_transactions`: Calls `signer.signAllTransactions(decodedPayload.transactions)` → Returns array of signatures
- For `send_transaction`: Calls `signer.sendTransaction(decodedPayload)` or falls back to `signTransaction()` → Returns transaction hash
- The SDK wraps the result in the response payload structure

---

## SDK Implementation Details

### Request ID Format

The SDK's `RequestManager.generateRequestId()` creates IDs with the following format:

- `msg-{timestamp}-{random}`: For sign message requests (e.g., `msg-1699234567890-abc123`)
- `tx-{timestamp}-{random}`: For sign transaction requests (e.g., `tx-1699234567890-xyz789`)
- `txs-{timestamp}-{random}`: For batch sign all transactions (e.g., `txs-1699234567890-abc123`)
- `send-{timestamp}-{random}`: For send transaction requests (e.g., `send-1699234567890-xyz789`)

### Payload Encoding/Decoding

**Why JSON-encoded strings?**
- Supports multiple blockchain formats (EVM, Solana, etc.) without tight coupling
- Allows chain-specific transaction structures to be passed generically
- SDK handles encoding/decoding automatically via `encodePayload()` / `decodePayload()`

**Encoding (dApp SDK):**
```typescript
// SDK automatically encodes payloads
const payloadObject = { message: "Hello" };
const payloadString = encodePayload(payloadObject);
// payloadString: '{"message":"Hello"}'
```

**Decoding (Wallet SDK):**
```typescript
// SDK automatically decodes payloads before calling signer
const payloadString = request.payload; // '{"message":"Hello"}'
const decodedPayload = decodePayload(payloadString);
// decodedPayload: { message: "Hello" }
// signer.signMessage(decodedPayload) receives the object
```

**Chain-specific payloads:**
- EVM: `{ to, value, data, gasLimit, ... }`
- Solana: `{ instructions, recentBlockhash, ... }`
- All encoded as JSON strings in the protocol layer

### Timeout Configuration

- **Request Timeout**: 60 seconds (default) - Configurable via `RequestManager` constructor
- **Connection Timeout**: 30 seconds - Socket.io connection timeout
- **Max Request Age**: 5 minutes - Timestamp validation window

### Session Persistence

Both SDKs support session persistence:
- **dApp SDK**: Automatically saves/restores session on page reload
- **Wallet SDK**: Automatically saves/restores session on app restart
- Encryption keys are stored securely and restored on reconnect

---

## Chain Type Values

- `"evm"`: For Ethereum Virtual Machine chains
- `"solana"`: For Solana blockchain

## Chain ID Examples

- **EVM**: `"1"` (Ethereum), `"137"` (Polygon), `"56"` (BSC)
- **Solana**: `"mainnet-beta"` (mainnet), `"devnet"` (devnet), `"testnet"` (testnet)

---

## Benefits of SDK Approach

1. **Developer-Friendly**: Simple Promise-based API, no low-level encryption code
2. **Type Safety**: Full TypeScript support with type definitions
3. **Automatic Handling**: Encryption, decryption, timeouts, error handling all automatic
4. **Event-Driven**: EventEmitter3 for reactive UI updates
5. **Session Persistence**: Automatic session restore on reload/restart
6. **Request Tracking**: Automatic request/response matching with timeout handling
7. **Multi-Chain Ready**: Built-in support for multiple blockchains
8. **Extensible**: Easy to add new chain types or operations
9. **Maintainable**: Single codebase for all sign operations
10. **Production-Ready**: Comprehensive error handling and validation

---

## Comparison: Manual Implementation vs SDK

| Aspect | Manual Implementation | SDK Implementation |
|--------|----------------------|-------------------|
| Encryption | Manual nacl.box calls | Automatic via `EncryptionManager` |
| Request Tracking | Manual Map/Set tracking | Automatic via `RequestManager` |
| Timeout Handling | Manual setTimeout | Automatic 60s timeout |
| Payload Encoding | Manual JSON.stringify/parse | Automatic via `encodePayload`/`decodePayload` |
| Error Handling | Manual try/catch everywhere | Automatic error responses |
| Session Persistence | Manual localStorage | Automatic via `SessionStorage` |
| Event Handling | Manual socket.on() | EventEmitter3 events |
| Type Safety | Manual type checking | Full TypeScript support |
| Code Lines | ~800+ lines | ~300 lines (64% reduction) |

---

## Additional Resources

- **Phoenix DApp SDK README**: `packages/phoenix-dapp/README.md`
- **Phoenix Wallet SDK README**: `packages/phoenix-wallet/README.md`
- **Connection Flow**: `flow/SEQUENCE_DIAGRAMS_CONNECTION.md`
- **SDK Integration Guide**: `PHOENIX_SDK_INTEGRATION.md`
