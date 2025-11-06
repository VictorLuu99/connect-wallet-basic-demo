# @phoenix/wallet

Phoenix WalletConnect protocol SDK for wallet developers.

## Features

- 🔐 **E2E Encryption** - TweetNaCl (Curve25519) encryption
- 🌐 **Multi-Chain Support** - EVM and Solana blockchains
- 📱 **QR Scanning** - Simple dApp connection via QR
- 🔌 **Pluggable Signer** - Bring your own signing logic
- ⚡ **Event-Driven API** - React Native friendly
- 📦 **TypeScript** - Full type safety

## Installation

```bash
npm install @phoenix/wallet
# or
yarn add @phoenix/wallet
```

## Quick Start

```typescript
import { PhoenixWalletClient, WalletSigner } from '@phoenix/wallet';

// Implement WalletSigner interface
class MyWalletSigner implements WalletSigner {
  address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0';
  chainType = 'evm' as const;

  async signMessage(params: { message: string }): Promise<string> {
    // Your signing logic here
    return await yourWallet.signMessage(params.message);
  }

  async signTransaction(params: any): Promise<string> {
    // Your signing logic here
    return await yourWallet.signAndSendTransaction(params);
  }
}

// Initialize client
const client = new PhoenixWalletClient();

// Setup event listeners
client.on('session_connected', (session) => {
  console.log('Connected to dApp!', session);
});

client.on('sign_request', async (request) => {
  // Show approval UI to user
  const approved = await showApprovalDialog(request);

  if (approved) {
    await client.approveRequest(request.id);
  } else {
    await client.rejectRequest(request.id);
  }
});

// Connect via QR scan
const qrData = await scanQRCode(); // Your QR scanner
const signer = new MyWalletSigner();

await client.connect(qrData, signer);

// SDK handles signing automatically when approved
```

## Integration with Existing Wallets

### Example: Integrating with xlab wallet-adapter

```typescript
import { PhoenixWalletClient, WalletSigner } from '@phoenix/wallet';
import { XLabWallet } from '@xlab/wallet'; // Your wallet

class XLabPhoenixAdapter {
  private phoenixClient: PhoenixWalletClient;
  private wallet: XLabWallet;

  constructor(wallet: XLabWallet) {
    this.wallet = wallet;
    this.phoenixClient = new PhoenixWalletClient();

    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.phoenixClient.on('sign_request', async (request) => {
      // Use your wallet's existing approval UI
      const approved = await this.wallet.showApprovalUI({
        type: request.type,
        message: request.type === 'sign_message'
          ? request.payload.message
          : 'Sign transaction',
        chain: request.chainType,
        chainId: request.chainId,
      });

      if (approved) {
        await this.phoenixClient.approveRequest(request.id);
      } else {
        await this.phoenixClient.rejectRequest(request.id);
      }
    });
  }

  async handleQRScan(qrData: string) {
    // Create signer from your wallet
    const signer: WalletSigner = {
      address: this.wallet.address,
      chainType: this.wallet.chainType,
      signMessage: (params) => this.wallet.signMessage(params.message),
      signTransaction: (params) => this.wallet.signAndSendTransaction(params),
    };

    await this.phoenixClient.connect(qrData, signer);
  }

  disconnect() {
    this.phoenixClient.disconnect();
  }
}

// Usage
const wallet = new XLabWallet();
const phoenixAdapter = new XLabPhoenixAdapter(wallet);

// When user scans QR code
await phoenixAdapter.handleQRScan(qrCodeData);
```

## React Native Example

```tsx
import { useState } from 'react';
import { PhoenixWalletClient, WalletSigner } from '@phoenix/wallet';
import { BarCodeScanner } from 'expo-barcode-scanner';

function WalletApp() {
  const [client] = useState(() => new PhoenixWalletClient());
  const [scanning, setScanning] = useState(false);
  const [pendingRequest, setPendingRequest] = useState(null);

  // Your wallet's signer
  const signer: WalletSigner = {
    address: myWallet.address,
    chainType: 'evm',
    signMessage: (params) => myWallet.signMessage(params.message),
    signTransaction: (params) => myWallet.signTransaction(params),
  };

  // Setup event listener
  useEffect(() => {
    client.on('sign_request', (request) => {
      setPendingRequest(request);
    });
  }, []);

  const handleScan = async ({ data }) => {
    setScanning(false);
    await client.connect(data, signer);
  };

  const handleApprove = async () => {
    await client.approveRequest(pendingRequest.id);
    setPendingRequest(null);
  };

  const handleReject = async () => {
    await client.rejectRequest(pendingRequest.id);
    setPendingRequest(null);
  };

  return (
    <View>
      {scanning ? (
        <BarCodeScanner onBarCodeScanned={handleScan} />
      ) : pendingRequest ? (
        <ApprovalDialog
          request={pendingRequest}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      ) : (
        <Button onPress={() => setScanning(true)}>
          Scan QR Code
        </Button>
      )}
    </View>
  );
}
```

## API Reference

### `PhoenixWalletClient`

#### Constructor

```typescript
new PhoenixWalletClient(config?: PhoenixWalletConfig)
```

**Config Options:**
- `reconnect?: boolean` - Enable auto-reconnection (default: true)
- `reconnectAttempts?: number` - Max reconnection attempts (default: 5)
- `reconnectDelay?: number` - Reconnection delay in ms (default: 2000)

#### Methods

##### `connect(qrData: string, signer: WalletSigner): Promise<void>`

Connect to dApp by scanning QR code.

**Parameters:**
- `qrData: string` - Phoenix URI from QR code
- `signer: WalletSigner` - Your wallet's signer implementation

##### `approveRequest(requestId: string): Promise<void>`

Approve pending sign request. SDK automatically calls signer methods.

##### `rejectRequest(requestId: string, reason?: string): Promise<void>`

Reject pending sign request.

##### `disconnect(): void`

Disconnect from dApp and cleanup.

##### `isConnected(): boolean`

Check if currently connected to a dApp.

##### `getSession(): Session | undefined`

Get current session information.

##### `getPendingRequest(): SignRequest | undefined`

Get current pending request.

#### Events

```typescript
client.on('session_connected', (session: Session) => void);
client.on('session_disconnected', () => void);
client.on('sign_request', (request: SignRequest) => void);
client.on('request_approved', (requestId: string) => void);
client.on('request_rejected', (requestId: string) => void);
client.on('error', (error: Error) => void);
```

### `WalletSigner` Interface

Wallets must implement this interface:

```typescript
interface WalletSigner {
  address: string;
  chainType: 'evm' | 'solana';

  signMessage(params: { message: string }): Promise<string>;

  signTransaction(params: {
    to: string;
    value: string;
    data?: string;
    [key: string]: any;
  }): Promise<string>;
}
```

### `MultiChainWalletSigner` Interface

For wallets supporting multiple chains:

```typescript
interface MultiChainWalletSigner {
  getSigner(chainType: ChainType): WalletSigner | undefined;
  getSupportedChains(): ChainType[];
}
```

## QR Code Parsing

```typescript
import { QRParser } from '@phoenix/wallet';

// Validate QR data
if (QRParser.isValidURI(qrData)) {
  const connectionData = QRParser.parseURI(qrData);
  console.log('Connecting to:', connectionData.serverUrl);
}
```

## Error Handling

```typescript
try {
  await client.connect(qrData, signer);
} catch (error) {
  console.error('Connection failed:', error);
}

client.on('error', (error) => {
  console.error('SDK error:', error);
});
```

## Security Notes

1. **Private Keys**: SDK never accesses private keys - you provide signing functions
2. **E2E Encryption**: All messages encrypted with TweetNaCl before sending
3. **Timestamp Validation**: Requests expire after 5 minutes
4. **User Approval**: Always show approval UI before calling `approveRequest()`

## License

MIT
