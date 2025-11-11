# @phoenix-wallet/connect-wallet

QR-code based wallet connector for Phoenix Wallet Adapter using phoenix-dapp and phoenix-wallet SDKs.

## 🚧 Work in Progress

This package is currently under development. The implementation uses placeholder phoenix-dapp client until the actual SDK integration is complete.

## Features

- 🔐 **E2E Encryption** - Secure QR-based wallet connection
- 📱 **Multi-Chain Support** - EVM and Solana (planned)
- 💾 **Session Persistence** - Auto-restore connections on page reload
- 🔌 **Wallet-Adapter Integration** - Seamless integration with existing wallet-adapter ecosystem
- 🌉 **WalletSigner Bridge** - Adapts IWallet to phoenix-wallet SDK's WalletSigner interface

## Installation

```bash
# Using pnpm (recommended for monorepo)
pnpm add @phoenix-wallet/connect-wallet

# Using npm
npm install @phoenix-wallet/connect-wallet
```

## Quick Start

### dApp Integration (EVM)

```typescript
import { PhoenixQREvmConnector } from '@phoenix-wallet/connect-wallet';
import { dappMetadata } from './config';

// Create connector instance
const phoenixConnector = new PhoenixQREvmConnector(
  {
    name: 'Phoenix QR',
    logo: 'https://your-logo-url.com/logo.png',
  },
  {
    serverUrl: 'wss://your-relay-server.com',
    enablePersistence: true,
    qrOptions: {
      size: 300,
      level: 'M',
    },
  },
  dappMetadata,
  ['1', '56', '137'] // Supported chain IDs
);

// Add to wallet-adapter configuration
export const evmConnectors = [
  // ... other connectors
  phoenixConnector,
];

// Connect with QR code
const { address, chainId } = await phoenixConnector.connect();

// Listen for QR code generation
phoenixConnector.getEventBridge().on('qr_generated', (uri) => {
  console.log('Show QR code with this URI:', uri);
  // Display QR code in your UI
});

// Listen for wallet connection
phoenixConnector.getEventBridge().on('session_connected', (session) => {
  console.log('Wallet connected:', session);
});
```

### Wallet App Integration

```typescript
import { WalletSignerAdapter } from '@phoenix-wallet/connect-wallet';
import { myWallet } from './wallet'; // Your IWallet implementation

// Create WalletSigner from existing wallet-adapter wallet
const signer = new WalletSignerAdapter(myWallet);

// Use with phoenix-wallet SDK (when available)
// const phoenixWalletClient = new PhoenixWalletClient();
// await phoenixWalletClient.connect(qrData, signer);
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  dApp (Phoenix Wallet Adapter)                          │
│  - PhoenixQREvmConnector                                │
│  - Uses existing useWalletBase, useWalletConnectors     │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│  Phoenix QR Connector Bridge                            │
│  - PhoenixDappClientWrapper (phoenix-dapp SDK wrapper)  │
│  - EventBridge (phoenix events ↔ adapter events)        │
│  - SessionPersistence (auto-restore sessions)           │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│  QR Code Connection                                     │
│  - E2E Encrypted WebSocket                              │
│  - Relay Server                                         │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│  Wallet App                                             │
│  - WalletSignerAdapter (IWallet → WalletSigner)         │
│  - Phoenix Wallet SDK (handles QR scan & signing)       │
└─────────────────────────────────────────────────────────┘
```

## API Reference

### PhoenixQREvmConnector

Extends `EvmConnector` from `@phoenix-wallet/evm`.

```typescript
class PhoenixQREvmConnector extends EvmConnector {
  constructor(
    connectorConfig: ConnectorConfig,
    phoenixConfig: PhoenixConnectorConfig,
    dappMetadata: DappMetadata,
    supportedChains: string[]
  );

  // Get current session
  getSession(): PhoenixSession | undefined;

  // Get phoenix client for advanced usage
  getPhoenixClient(): PhoenixDappClientWrapper;

  // Get event bridge for subscribing to events
  getEventBridge(): EventBridge;

  // Inherited from EvmConnector
  connect(): Promise<{ address: string; chainId: string }>;
  disconnect(): Promise<void>;
  isConnected(): Promise<boolean>;
}
```

### WalletSignerAdapter

Adapts wallet-adapter's `IWallet` to phoenix-wallet SDK's `WalletSigner`.

```typescript
class WalletSignerAdapter implements WalletSigner {
  constructor(wallet: IWallet<any, any, any, any>);

  // WalletSigner interface
  address: string;
  chainType: ChainType;
  signMessage(params: any): Promise<string>;
  signTransaction(params: any): Promise<string>;
  signAllTransactions(transactions: any[]): Promise<string[]>;
  sendTransaction(params: any): Promise<string>;
}
```

### Configuration

```typescript
interface PhoenixConnectorConfig {
  serverUrl: string; // WebSocket relay server
  reconnect?: boolean; // Enable auto-reconnection (default: true)
  reconnectAttempts?: number; // Max attempts (default: 5)
  reconnectDelay?: number; // Delay in ms (default: 2000)
  enablePersistence?: boolean; // Session persistence (default: true)
  storage?: StorageAdapter; // Custom storage (default: localStorage)
  qrOptions?: QRCodeOptions; // QR code display options
}
```

## Events

```typescript
const eventBridge = phoenixConnector.getEventBridge();

// QR code generated
eventBridge.on('qr_generated', (uri: string) => {
  // Display QR code
});

// Wallet scanned QR
eventBridge.on('qr_scanned', () => {
  // QR code was scanned
});

// Session connected
eventBridge.on('session_connected', (session: PhoenixSession) => {
  // Wallet connected
});

// Session disconnected
eventBridge.on('session_disconnected', () => {
  // Wallet disconnected
});

// Session restored from storage
eventBridge.on('session_restored', (session: PhoenixSession) => {
  // Auto-reconnected from saved session
});

// Error occurred
eventBridge.on('error', (error: Error) => {
  // Handle error
});
```

## Session Persistence

Sessions are automatically saved and restored on page reload:

```typescript
const phoenixConnector = new PhoenixQREvmConnector(
  config,
  {
    serverUrl: 'wss://relay.example.com',
    enablePersistence: true, // Enable session restore
  },
  dappMetadata,
  supportedChains
);

// First connection
await phoenixConnector.connect(); // Shows QR code

// Page reload
// Session automatically restored
const session = phoenixConnector.getSession();
if (session?.connected) {
  console.log('Auto-reconnected to:', session.address);
}
```

## Storage Adapters

### Browser (localStorage)

```typescript
import { LocalStorageAdapter } from '@phoenix-wallet/connect-wallet';

const storage = new LocalStorageAdapter();
```

### React Native (AsyncStorage)

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AsyncStorageAdapter } from '@phoenix-wallet/connect-wallet';

const storage = new AsyncStorageAdapter(AsyncStorage);
```

### Memory (fallback)

```typescript
import { MemoryStorageAdapter } from '@phoenix-wallet/connect-wallet';

const storage = new MemoryStorageAdapter();
```

## Development Status

### ✅ Completed
- Package structure and build configuration
- TypeScript types and interfaces
- WalletSigner adapter implementation
- Session persistence utilities
- Event bridge system
- PhoenixQREvmConnector implementation

### 🚧 In Progress
- Phoenix-dApp SDK integration (using placeholder)
- UI components (QR modal, approval dialog)
- Solana connector implementation

### 📋 Planned
- Production-ready phoenix-dapp SDK integration
- QR modal React component
- Approval dialog React Native component
- Comprehensive testing suite
- Usage examples and demos

## Contributing

This package is part of the Phoenix Wallet Adapter monorepo. See the main [CLAUDE.md](../../CLAUDE.md) for contribution guidelines.

## License

MIT
