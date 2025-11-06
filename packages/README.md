# Phoenix WalletConnect Protocol SDKs

E2E encrypted WalletConnect-style protocol for connecting dApps with wallets. Supports EVM and Solana blockchains with zero-trust relay backend.

## 🎯 Architecture

```
┌─────────────┐          ┌─────────────┐          ┌─────────────┐
│    dApp     │◄────────►│   Backend   │◄────────►│   Wallet    │
│ (@phoenix/  │   E2E    │  (Relay)    │   E2E    │ (@phoenix/  │
│   dapp)     │ Encrypted│   Server    │ Encrypted│   wallet)   │
└─────────────┘          └─────────────┘          └─────────────┘
       │                                                  │
       │ 1. Generate QR                                   │
       │ 2. Wait for connection              3. Scan QR  │
       │                                      4. Connect  │
       │ 5. Send sign request ─────────────────────────► │
       │                                      6. User     │
       │                                         approves │
       │ ◄──────────────────── 7. Send response          │
```

## 📦 Packages

### [@phoenix/dapp](./phoenix-dapp)

Protocol SDK for **dApp developers**.

```bash
npm install @phoenix/dapp
```

**Features:**
- Generate QR codes for wallet connection
- Send sign message/transaction requests
- Receive signed responses
- E2E encryption built-in

[Full Documentation →](./phoenix-dapp/README.md)

---

### [@phoenix/wallet](./phoenix-wallet)

Protocol SDK for **wallet developers**.

```bash
npm install @phoenix/wallet
```

**Features:**
- Parse QR codes and connect to dApps
- Handle sign requests
- Pluggable signer interface (bring your own signing logic)
- E2E encryption built-in

[Full Documentation →](./phoenix-wallet/README.md)

---

## 🚀 Quick Start

### For dApp Developers

```typescript
import { PhoenixDappClient } from '@phoenix/dapp';

const client = new PhoenixDappClient({
  serverUrl: 'wss://relay.phoenix.io'
});

// Generate QR code
const { qrCodeUrl } = await client.connect();

// Sign message
const response = await client.signMessage({
  message: 'Hello',
  chainType: 'evm',
  chainId: '1'
});
```

### For Wallet Developers

```typescript
import { PhoenixWalletClient, WalletSigner } from '@phoenix/wallet';

const client = new PhoenixWalletClient();

// Implement signer
const signer: WalletSigner = {
  address: '0x...',
  chainType: 'evm',
  signMessage: (params) => wallet.signMessage(params.message),
  signTransaction: (params) => wallet.signTransaction(params)
};

// Connect via QR
const qrData = await scanQRCode();
await client.connect(qrData, signer);
```

---

## 🔐 Security Features

- **TweetNaCl (Curve25519)** - Industry-standard encryption
- **Zero-trust backend** - Relay server cannot decrypt messages
- **Timestamp validation** - Requests expire after 5 minutes
- **Replay protection** - Request IDs prevent duplicates

---

## 🏗️ Development

```bash
# Build both SDKs
cd phoenix-dapp && npm install && npm run build
cd ../phoenix-wallet && npm install && npm run build
```

---

## 📄 License

MIT
