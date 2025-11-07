# @phoenix/dapp

Phoenix WalletConnect protocol SDK for dApp developers.

## Features

- 🔐 **E2E Encryption** - TweetNaCl (Curve25519) encryption
- 🌐 **Multi-Chain Support** - EVM, Solana, and any blockchain
- 📱 **QR Code Connection** - Simple wallet connection via QR (URI-based)
- 💾 **Session Persistence** - Auto-restore sessions on reload
- ⚡ **Event-Driven API** - React-friendly event system
- 🔄 **Auto-Reconnection** - Configurable reconnection logic
- 📦 **TypeScript** - Full type safety
- 🔧 **Flexible Payloads** - Generic JSON-encoded payloads for any chain

## Installation

```bash
npm install @phoenix/dapp
# or
yarn add @phoenix/dapp
```

## Quick Start

```typescript
import { PhoenixDappClient } from '@phoenix/dapp';

// Initialize client
const client = new PhoenixDappClient({
  serverUrl: 'wss://your-relay-server.com'
});

// Setup event listeners
client.on('session_connected', (session) => {
  console.log('Wallet connected!', session);
});

client.on('request_response', (response) => {
  if (response.status === 'success') {
    console.log('Signature:', response.result);
  }
});

// Connect and get URI
const { uri } = await client.connect();
// Generate QR code from URI using your preferred library (e.g., qrcode.react, qrcode)
// Example with qrcode.react:
// import { QRCodeSVG } from 'qrcode.react';
// <QRCodeSVG value={uri} size={300} />

// Sign a message (string or chain-specific object)
const response = await client.signMessage({
  message: 'Hello World', // or { message: 'Hello', ... } for chain-specific format
  chainType: 'evm',
  chainId: '1' // Ethereum mainnet
});

console.log('Signature:', response.result.signature);

// Sign a transaction (generic object - works with any chain)
const txResponse = await client.signTransaction({
  transaction: {
    to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
    value: '0x0',
    data: '0x',
    // ... any chain-specific fields
  },
  chainType: 'evm',
  chainId: '1'
});

console.log('Transaction signature:', txResponse.result.signature);

// Sign all transactions (batch signing, e.g., Solana)
const batchResponse = await client.signAllTransactions({
  transactions: [tx1, tx2, tx3], // Array of transaction objects
  chainType: 'solana',
  chainId: 'mainnet-beta'
});

console.log('Signatures:', batchResponse.result.signatures);

// Send transaction (direct send, e.g., EVM)
const sendResponse = await client.sendTransaction({
  transaction: {
    to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
    value: '0x0',
    // ... transaction fields
  },
  chainType: 'evm',
  chainId: '1'
});

console.log('Transaction hash:', sendResponse.result.txHash);

// Disconnect
client.disconnect();
```

## React Example

```tsx
import { useState, useEffect } from 'react';
import { PhoenixDappClient } from '@phoenix/dapp';

function App() {
  const [client] = useState(() => new PhoenixDappClient({
    serverUrl: 'wss://relay.example.com'
  }));
  const [uri, setUri] = useState('');
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    client.on('session_connected', () => setConnected(true));
    client.on('session_disconnected', () => setConnected(false));

    return () => client.disconnect();
  }, [client]);

  const handleConnect = async () => {
    const { uri } = await client.connect();
    setUri(uri);
    // Generate QR code from URI using your preferred library
  };

  const handleSignMessage = async () => {
    const response = await client.signMessage({
      message: 'Hello from dApp!',
      chainType: 'evm',
      chainId: '1'
    });
    console.log('Signature:', response.result.signature);
  };

  return (
    <div>
      {!connected ? (
        <>
          <button onClick={handleConnect}>Connect Wallet</button>
          {qrCode && <img src={qrCode} alt="QR Code" />}
        </>
      ) : (
        <button onClick={handleSignMessage}>Sign Message</button>
      )}
    </div>
  );
}
```

## API Reference

### `PhoenixDappClient`

#### Constructor

```typescript
new PhoenixDappClient(config: PhoenixDappConfig)
```

**Config Options:**
- `serverUrl: string` - WebSocket relay server URL
- `reconnect?: boolean` - Enable auto-reconnection (default: true)
- `reconnectAttempts?: number` - Max reconnection attempts (default: 5)
- `reconnectDelay?: number` - Reconnection delay in ms (default: 2000)
- `storage?: StorageAdapter` - Custom storage adapter (default: localStorage)
- `enablePersistence?: boolean` - Enable session persistence (default: true)

#### Methods

##### `connect(): Promise<ConnectionResult>`

Generate connection URI and wait for wallet connection.
Note: QR code generation should be handled by the application layer.

**Returns:**
```typescript
{
  uri: string;        // Phoenix URI string (format: phoenix:{JSON})
  uuid: string;       // Session UUID
}
```

**Example:**
```typescript
const { uri } = await client.connect();
// Generate QR code from URI using your preferred library
// e.g., qrcode.react, qrcode, react-qr-code, etc.
```

##### `signMessage(params: SignMessageParams): Promise<SignResponse>`

Request wallet to sign a message.

**Parameters:**
```typescript
{
  message: string | any; // String or chain-specific message object
  chainType: 'evm' | 'solana' | string;
  chainId: string;
}
```

**Note:** Payload is automatically JSON-encoded for multi-chain support.

##### `signTransaction(params: SignTransactionParams): Promise<SignResponse>`

Request wallet to sign a transaction (returns signature, does not broadcast).

**Parameters:**
```typescript
{
  transaction: any; // Chain-specific transaction object (EVM, Solana, etc.)
  chainType: 'evm' | 'solana' | string;
  chainId: string;
}
```

**Note:** Transaction object can be any chain-specific format. SDK encodes it as JSON string.

##### `signAllTransactions(params: SignAllTransactionsParams): Promise<SignResponse>`

Request wallet to sign multiple transactions (batch signing, e.g., Solana).

**Parameters:**
```typescript
{
  transactions: any[]; // Array of chain-specific transaction objects
  chainType: 'evm' | 'solana' | string;
  chainId: string;
}
```

**Returns:** `SignResponse` with `result.signatures: string[]`

##### `sendTransaction(params: SendTransactionParams): Promise<SignResponse>`

Request wallet to sign and send a transaction (broadcasts immediately, e.g., EVM).

**Parameters:**
```typescript
{
  transaction: any; // Chain-specific transaction object
  chainType: 'evm' | 'solana' | string;
  chainId: string;
}
```

**Returns:** `SignResponse` with `result.txHash: string`

##### `disconnect(): void`

Disconnect from wallet and cleanup.

##### `isConnected(): boolean`

Check if currently connected to a wallet.

##### `getSession(): Session | undefined`

Get current session information.

#### Events

```typescript
client.on('session_connected', (session: Session) => void);
client.on('session_disconnected', () => void);
client.on('request_sent', (requestId: string) => void);
client.on('request_response', (response: SignResponse) => void);
client.on('error', (error: Error) => void);
```

## Chain Support

### EVM Chains

```typescript
import { EVM_CHAINS } from '@phoenix/dapp';

// Ethereum
chainId: EVM_CHAINS.ETHEREUM_MAINNET // '1'
chainId: EVM_CHAINS.ETHEREUM_SEPOLIA // '11155111'

// Polygon
chainId: EVM_CHAINS.POLYGON_MAINNET // '137'

// BSC
chainId: EVM_CHAINS.BSC_MAINNET // '56'
```

### Solana Chains

```typescript
import { SOLANA_CHAINS } from '@phoenix/dapp';

chainId: SOLANA_CHAINS.MAINNET // 'mainnet-beta'
chainId: SOLANA_CHAINS.DEVNET  // 'devnet'
```

## Payload Encoding

The SDK automatically encodes/decodes payloads as JSON strings for multi-chain support. You can use convenience types:

```typescript
import { encodePayload, decodePayload, EVMTransactionPayload, SolanaTransactionPayload } from '@phoenix/dapp';

// EVM transaction
const evmTx: EVMTransactionPayload = {
  to: '0x...',
  value: '0x0',
  data: '0x',
  gasLimit: '0x5208',
  // ... other EVM fields
};

// Solana transaction
const solanaTx: SolanaTransactionPayload = {
  instructions: [...],
  recentBlockhash: '...',
  // ... other Solana fields
};

// SDK handles encoding automatically
await client.signTransaction({
  transaction: evmTx, // or solanaTx
  chainType: 'evm',
  chainId: '1'
});
```

## Session Persistence

Sessions are automatically persisted and restored on page reload:

```typescript
const client = new PhoenixDappClient({
  serverUrl: 'wss://relay.example.com',
  enablePersistence: true, // Default: true
  storage: new LocalStorageAdapter(), // Default: auto-detect
});

// Session automatically restored on initialization
// Auto-reconnects if session was connected
```

## Error Handling

```typescript
try {
  const response = await client.signMessage({
    message: 'Hello',
    chainType: 'evm',
    chainId: '1'
  });

  if (response.status === 'error') {
    console.error('Signing failed:', response.error);
  }
} catch (error) {
  console.error('Request failed:', error);
}
```

## License

MIT
