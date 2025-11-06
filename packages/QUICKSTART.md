# Quick Start Guide - Phoenix WalletConnect SDKs

Get started with Phoenix WalletConnect protocol SDKs in 5 minutes.

## 📋 Prerequisites

- Node.js >= 18.x
- npm or yarn

## 🚀 Installation & Build

### Option 1: Build Both SDKs

```bash
# From the packages directory
cd /path/to/demo-wallet-connect/packages

# Build DAPP SDK
cd phoenix-dapp
npm install
npm run build

# Build Wallet SDK
cd ../phoenix-wallet
npm install
npm run build
```

### Option 2: Development Mode (Watch)

```bash
# DAPP SDK - Terminal 1
cd phoenix-dapp
npm install
npm run dev

# Wallet SDK - Terminal 2
cd phoenix-wallet
npm install
npm run dev
```

## 🧪 Quick Test

### Test DAPP SDK

Create a test file `test-dapp.js`:

```javascript
const { PhoenixDappClient } = require('./phoenix-dapp/dist');

async function test() {
  const client = new PhoenixDappClient({
    serverUrl: 'ws://localhost:3001'
  });

  client.on('session_connected', (session) => {
    console.log('✅ Wallet connected:', session);
  });

  const { qrCodeUrl, uri } = await client.connect();
  console.log('📱 QR Code generated');
  console.log('URI:', uri);
  console.log('Scan with wallet to connect...');
}

test().catch(console.error);
```

Run:
```bash
node test-dapp.js
```

### Test Wallet SDK

Create a test file `test-wallet.js`:

```javascript
const { PhoenixWalletClient } = require('./phoenix-wallet/dist');

// Mock signer
const mockSigner = {
  address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
  chainType: 'evm',
  signMessage: async (params) => {
    console.log('Signing message:', params.message);
    return 'mock_signature_' + Date.now();
  },
  signTransaction: async (params) => {
    console.log('Signing transaction:', params);
    return 'mock_tx_hash_' + Date.now();
  }
};

async function test() {
  const client = new PhoenixWalletClient();

  client.on('session_connected', (session) => {
    console.log('✅ Connected to dApp:', session);
  });

  client.on('sign_request', async (request) => {
    console.log('📝 Sign request received:', request.type);

    // Auto-approve for testing
    await client.approveRequest(request.id);
    console.log('✅ Request approved');
  });

  // Use the URI from test-dapp.js
  const uri = 'phoenix:{...}'; // Paste from dApp test
  await client.connect(uri, mockSigner);
  console.log('🔗 Connected to dApp');
}

test().catch(console.error);
```

## 📦 Using in Your Project

### Install from Local

```bash
# In your dApp project
npm install /path/to/packages/phoenix-dapp

# In your wallet project
npm install /path/to/packages/phoenix-wallet
```

### TypeScript Support

Both SDKs include TypeScript definitions:

```typescript
import { PhoenixDappClient, SignResponse } from '@phoenix/dapp';
import { PhoenixWalletClient, WalletSigner } from '@phoenix/wallet';

// Full type safety!
```

## 🔧 Troubleshooting

### Build Errors

```bash
# Clean and rebuild
rm -rf dist node_modules
npm install
npm run build
```

### Missing Dependencies

```bash
# Install peer dependencies
npm install tweetnacl tweetnacl-util socket.io-client eventemitter3
```

### Import Errors

Make sure you're importing from the correct path:

```javascript
// CommonJS
const { PhoenixDappClient } = require('@phoenix/dapp');

// ES Module
import { PhoenixDappClient } from '@phoenix/dapp';
```

## 📖 Next Steps

- Read the [DAPP SDK Documentation](./phoenix-dapp/README.md)
- Read the [Wallet SDK Documentation](./phoenix-wallet/README.md)
- Check out the [React Example](./phoenix-dapp/examples/react-example.tsx)
- Check out the [React Native Example](./phoenix-wallet/examples/react-native-example.tsx)

## 🆘 Need Help?

- Check the README files in each package
- Review the examples folder
- Open an issue on GitHub
