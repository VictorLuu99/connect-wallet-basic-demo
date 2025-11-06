# @phoenix/dapp

Phoenix WalletConnect protocol SDK for dApp developers.

## Features

- 🔐 **E2E Encryption** - TweetNaCl (Curve25519) encryption
- 🌐 **Multi-Chain Support** - EVM and Solana blockchains
- 📱 **QR Code Connection** - Simple wallet connection via QR
- ⚡ **Event-Driven API** - React-friendly event system
- 🔄 **Auto-Reconnection** - Configurable reconnection logic
- 📦 **TypeScript** - Full type safety

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

// Connect and show QR
const { qrCodeUrl, uri } = await client.connect();
// Display qrCodeUrl to user

// Sign a message
const response = await client.signMessage({
  message: 'Hello World',
  chainType: 'evm',
  chainId: '1' // Ethereum mainnet
});

console.log('Signature:', response.result.signature);

// Sign a transaction
const txResponse = await client.signTransaction({
  transaction: {
    to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
    value: '0.1',
    data: '0x',
  },
  chainType: 'evm',
  chainId: '1'
});

console.log('Transaction hash:', txResponse.result.txHash);

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
  const [qrCode, setQrCode] = useState('');
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    client.on('session_connected', () => setConnected(true));
    client.on('session_disconnected', () => setConnected(false));

    return () => client.disconnect();
  }, [client]);

  const handleConnect = async () => {
    const { qrCodeUrl } = await client.connect();
    setQrCode(qrCodeUrl);
  };

  const handleSignMessage = async () => {
    const response = await client.signMessage({
      message: 'Hello from dApp!',
      chainType: 'evm',
      chainId: '1'
    });
    console.log('Signature:', response.result);
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

#### Methods

##### `connect(): Promise<ConnectionResult>`

Generate QR code and wait for wallet connection.

**Returns:**
```typescript
{
  qrCodeUrl: string;  // Data URL for QR code image
  uri: string;        // Phoenix URI string
  uuid: string;       // Session UUID
}
```

##### `signMessage(params: SignMessageParams): Promise<SignResponse>`

Request wallet to sign a message.

**Parameters:**
```typescript
{
  message: string;
  chainType: 'evm' | 'solana';
  chainId: string;
}
```

##### `signTransaction(params: SignTransactionParams): Promise<SignResponse>`

Request wallet to sign and broadcast a transaction.

**Parameters:**
```typescript
{
  transaction: {
    to: string;
    value: string;
    data?: string;
    // ... chain-specific fields
  };
  chainType: 'evm' | 'solana';
  chainId: string;
}
```

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
