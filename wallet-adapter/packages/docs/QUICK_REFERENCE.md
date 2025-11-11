# Connector Quick Reference

Fast reference for common connector implementation tasks.

## Quick Start Checklist

```bash
# 1. Choose base class
EvmConnector     # For Ethereum-compatible wallets
SolanaConnector  # For Solana wallets
Connector        # For other blockchains

# 2. Create connector file
packages/{chain}/src/connectors/MyWalletConnector.ts

# 3. Implement required methods
✓ constructor(dappMetadata, supportedChains)
✓ get provider()
✓ async isInstalled()
✓ get installLink()

# 4. Export from package
packages/{chain}/src/index.ts

# 5. Build and test
npm run packages:build
npm run dev
```

---

## EVM Connector Template

```typescript
import { DappMetadata } from '@phoenix-wallet/core';
import { EvmConnector } from './EvmConnector';

export class MyWalletEvmConnector extends EvmConnector {
  constructor(dappMetadata: DappMetadata, supportedChains: string[]) {
    super(
      'mywalletevm',              // Unique ID
      {
        name: 'MyWallet',         // Display name
        logo: 'https://...',      // Logo URL
      },
      dappMetadata,
      supportedChains
    );
  }

  get provider(): any {
    return window.myWallet?.ethereum;
  }

  async isInstalled(): Promise<boolean> {
    return Boolean(window.myWallet);
  }

  get installLink(): string {
    return 'https://mywallet.io/download';
  }
}
```

---

## Common Code Snippets

### Provider Detection Patterns

```typescript
// Pattern 1: Simple window property
get provider() {
  return window.myWallet?.ethereum;
}

// Pattern 2: Ethereum with identifier
get provider() {
  return window.ethereum?.isMyWallet ? window.ethereum : null;
}

// Pattern 3: Multiple providers
get provider() {
  if (window.ethereum?.providers) {
    return window.ethereum.providers.find(p => p.isMyWallet);
  }
  return window.ethereum?.isMyWallet ? window.ethereum : null;
}

// Pattern 4: Priority-based
get provider() {
  // 1. Dedicated extension
  if (window.myWalletExtension) return window.myWalletExtension;

  // 2. Specific property
  if (window.myWallet?.ethereum) return window.myWallet.ethereum;

  // 3. Standard ethereum
  if (window.ethereum?.isMyWallet) return window.ethereum;

  return null;
}
```

### TypeScript Window Extensions

```typescript
declare global {
  interface Window {
    myWallet?: {
      ethereum?: any;
    };
    ethereum?: {
      isMyWallet?: boolean;
      providers?: any[];
    };
  }
}
```

### Installation Check

```typescript
// Simple check
async isInstalled(): Promise<boolean> {
  return Boolean(this.provider);
}

// Specific flags
async isInstalled(): Promise<boolean> {
  return typeof window !== 'undefined' &&
         Boolean(window.myWallet?.ethereum);
}

// Multiple locations
async isInstalled(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  return Boolean(
    window.myWalletExtension ||
    window.myWallet?.ethereum ||
    window.ethereum?.isMyWallet
  );
}
```

### SDK Initialization

```typescript
private sdk: WalletSDK | null = null;

async init(): Promise<void> {
  if (this.sdk) return;

  this.sdk = new WalletSDK({
    dappMetadata: {
      name: this.dappMetadata.name,
      url: this.dappMetadata.url,
    },
  });

  await this.sdk.init();
  await super.init(); // Important!
}

get provider() {
  return this.sdk?.getProvider();
}

async disconnect(): Promise<void> {
  await this.sdk?.terminate();
  await super.disconnect();
}
```

### Custom Reconnection

```typescript
protected checkStoredConnection(): void {
  if (typeof localStorage !== 'undefined' && this.storageConnectionStatusKey) {
    const stored = localStorage.getItem(this.storageConnectionStatusKey);

    if (stored === 'connected') {
      this.getConnectedAddresses()
        .then(addresses => {
          if (addresses.length > 0) {
            this.activeAddress = addresses[0];
            this.getChainId().then(chainId => {
              this.activeChainId = chainId;
              this.handleEventConnect(this.activeAddress!, this.activeChainId);
            });
          } else {
            localStorage.removeItem(this.storageConnectionStatusKey!);
          }
        })
        .catch(() => {
          localStorage.removeItem(this.storageConnectionStatusKey!);
        });
    }
  }
}
```

---

## Connector Configuration

### Adding to Demo App

```typescript
// src/app/wallet-config.ts
import { MyWalletEvmConnector } from '@phoenix-wallet/evm';

const myWalletConnector = new MyWalletEvmConnector(
  dappMetadata,
  ['1', '56', '137'] // Ethereum, BSC, Polygon
);

export const evmConnectors = [
  // ... existing connectors
  myWalletConnector,
];
```

### Supported Chain IDs

```typescript
// Common EVM chains
'1'     // Ethereum Mainnet
'5'     // Goerli Testnet
'56'    // BSC Mainnet
'97'    // BSC Testnet
'137'   // Polygon Mainnet
'80001' // Polygon Mumbai
'42161' // Arbitrum One
'10'    // Optimism
'43114' // Avalanche C-Chain

// Solana clusters
'solana_mainnet_beta'
'solana_devnet'
'solana_testnet'

// Aptos networks
'aptos-mainnet'
'aptos-testnet'
'aptos-devnet'
```

---

## Testing Commands

```bash
# Build all packages
npm run packages:build

# Build specific package
cd packages/evm && pnpm run build

# Watch mode for development
npm run packages:dev

# Run demo app
npm run dev

# Check types
cd packages/evm && pnpm run lint
```

---

## Debugging

### Enable Debug Logging

```typescript
<ClientWalletProvider
  loggerConfig={{
    enabled: true,
    level: LogLevel.DEBUG
  }}
>
```

### Log Levels

```typescript
LogLevel.NONE   // No logging
LogLevel.ERROR  // Errors only
LogLevel.WARN   // Warnings and errors
LogLevel.INFO   // Info, warnings, errors
LogLevel.DEBUG  // All logs (verbose)
```

### Common Debug Points

```typescript
// In connector
logger.debug('Provider detected:', this.provider);
logger.info('Connecting to wallet...');
logger.error('Connection failed:', error);

// Check connection state
console.log('Active address:', this.activeAddress);
console.log('Active chain:', this.activeChainId);
console.log('Is connected:', await this.isConnected());

// Check localStorage
console.log('Stored status:',
  localStorage.getItem(this.storageConnectionStatusKey)
);
```

---

## Common Issues & Fixes

### Provider Not Found

```typescript
// Add initialization check
async init(): Promise<void> {
  if (!this.provider) {
    throw new Error(`${this.name} provider not found. Is the wallet installed?`);
  }
  await super.init();
}
```

### Events Not Firing

```typescript
// Ensure super.init() is called AFTER custom setup
async init(): Promise<void> {
  await this.customSetup();
  await super.init(); // Sets up event listeners
}
```

### Reconnection Fails

```typescript
// Implement proper stored connection check
protected checkStoredConnection(): void {
  // 1. Check localStorage
  // 2. Verify wallet is still connected
  // 3. Fire connect event if valid
  // 4. Clean up if invalid
}
```

### Multiple Wallets Conflict

```typescript
// Use specific provider detection
get provider() {
  // Don't just return window.ethereum
  // Check for wallet-specific identifier
  return window.ethereum?.isMyWallet ? window.ethereum : null;
}
```

---

## Method Override Decision Tree

```
Do you need SDK initialization?
├─ YES → Override init()
└─ NO → Continue

Do you need custom cleanup?
├─ YES → Override disconnect()
└─ NO → Continue

Do you need special reconnection?
├─ YES → Override checkStoredConnection()
└─ NO → Continue

Do you need to track extra state?
├─ YES → Override handleEventChainChanged() or handleEventAccountChanged()
└─ NO → Done!
```

---

## File Locations

```
packages/
├── core/
│   ├── src/
│   │   ├── interfaces/
│   │   │   └── IConnector.ts        # Interface definition
│   │   └── utils/
│   │       └── CallbackManager.ts   # Event system
│   └── package.json
│
├── evm/
│   ├── src/
│   │   ├── connectors/
│   │   │   ├── EvmConnector.ts      # Base class
│   │   │   └── MyWalletEvmConnector.ts  # Your connector
│   │   └── index.ts                 # Export here
│   └── package.json
│
├── solana/
│   ├── src/
│   │   ├── connectors/
│   │   │   ├── SolanaConnector.ts   # Base class
│   │   │   └── MyWalletSolanaConnector.ts
│   │   └── index.ts
│   └── package.json
│
└── docs/
    ├── CREATE_NEW_CONNECTOR.md      # Full guide
    ├── CONNECTOR_ARCHITECTURE.md    # Architecture details
    ├── CONNECTOR_EXAMPLES.md        # Code examples
    └── QUICK_REFERENCE.md           # This file
```

---

## Export Checklist

After creating connector:

```typescript
// ✓ Add to package index
// packages/evm/src/index.ts
export * from './connectors/MyWalletEvmConnector';

// ✓ Rebuild package
// npm run packages:build

// ✓ Add to demo app
// src/app/wallet-config.ts
import { MyWalletEvmConnector } from '@phoenix-wallet/evm';

// ✓ Test in browser
// npm run dev
```

---

## Useful Links

- **Full Guide**: [CREATE_NEW_CONNECTOR.md](./CREATE_NEW_CONNECTOR.md)
- **Architecture**: [CONNECTOR_ARCHITECTURE.md](./CONNECTOR_ARCHITECTURE.md)
- **Examples**: [CONNECTOR_EXAMPLES.md](./CONNECTOR_EXAMPLES.md)
- **Project Overview**: [../../CLAUDE.md](../../CLAUDE.md)
