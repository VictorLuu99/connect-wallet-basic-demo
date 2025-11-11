# Creating a New Connector for Phoenix Wallet

This guide explains how to create a new wallet connector for the Phoenix Wallet multi-chain adapter system. Connectors are the bridge between wallet providers (like MetaMask, Phantom, Coinbase) and the Phoenix Wallet abstraction layer.

## Table of Contents

1. [Overview](#overview)
2. [Connector Architecture](#connector-architecture)
3. [EVM Connector Implementation](#evm-connector-implementation)
4. [Solana Connector Implementation](#solana-connector-implementation)
5. [Complete Implementation Checklist](#complete-implementation-checklist)
6. [Testing Your Connector](#testing-your-connector)
7. [Common Patterns & Best Practices](#common-patterns--best-practices)

---

## Overview

### What is a Connector?

A connector implements the `IConnector` interface from `@phoenix-wallet/core` and provides:

- **Connection management** - Connect/disconnect wallet
- **Address retrieval** - Get connected wallet addresses
- **Event handling** - Listen to wallet events (account/chain changes)
- **Provider detection** - Detect if wallet is installed
- **Client creation** - Create wallet and public clients for transactions

### Connector Types

Phoenix Wallet supports two primary connector types:

- **EVM Connectors** - For Ethereum-compatible chains (extends `EvmConnector`)
- **Solana Connectors** - For Solana blockchain (extends `SolanaConnector`)
- **Custom Chain Connectors** - For other blockchains (extends base `Connector`)

---

## Connector Architecture

### Core Interfaces

All connectors must implement the `IConnector` interface:

```typescript
interface IConnector {
  // Identity
  id: string;                    // Unique connector identifier
  name: string;                  // Display name
  logo: string;                  // Logo URL or base64
  chainType: ChainType;          // EVM | SOLANA | APTOS | SUI

  // Connection lifecycle
  connect(): Promise<{ address: string; chainId: string }>;
  disconnect(): Promise<void>;
  isConnected(): Promise<boolean>;
  isInstalled(): Promise<boolean>;

  // Address & chain management
  getConnectedAddresses(): Promise<string[]>;
  getChainId(): Promise<string>;
  switchChainId(chainId: string): Promise<void>;
  addChain(chain: IChain<any>): Promise<void>;

  // Client creation
  createWalletClient(chain: IChain<any>): any;
  createPublicClient(chain: IChain<any>): any;

  // Event handling (internal)
  handleEventConnect(address: string, chainId: string): Promise<void>;
  handleEventDisconnect(address: string): Promise<void>;
  handleEventChainChanged(chainId: string): Promise<void>;
  handleEventAccountChanged(addresses: string[]): Promise<void>;

  // Callback management
  registerConnectorCallback(callback: IConnectorCallback): void;
  unregisterConnectorCallback(callback: IConnectorCallback): void;

  // Utility
  get installLink(): string;
  isSupportChain(chainId: string): boolean;
}
```

### Base Connector Class

The abstract `Connector` class provides:

- **CallbackManager** - Event system for notifying connection changes
- **Base event handlers** - Default implementations of event methods
- **Callback registration** - Methods to register/unregister callbacks

---

## EVM Connector Implementation

### Step 1: Create Connector File

Create a new file in `packages/evm/src/connectors/`:

```typescript
// packages/evm/src/connectors/MyWalletEvmConnector.ts
import { DappMetadata } from '@phoenix-wallet/core';
import { EvmConnector } from './EvmConnector';

export class MyWalletEvmConnector extends EvmConnector {
  constructor(dappMetadata: DappMetadata, supportedChains: string[]) {
    super(
      'mywalletev',              // Unique ID (lowercase, no spaces)
      {
        name: 'MyWallet',        // Display name
        logo: 'https://...',     // Logo URL or base64 data URI
      },
      dappMetadata,
      supportedChains            // Array of supported chain IDs
    );
  }

  // Implement required abstract methods
  get provider(): any {
    // Return wallet provider object
  }

  async isInstalled(): Promise<boolean> {
    // Check if wallet is installed
  }

  get installLink(): string {
    // Return URL to install wallet
  }
}
```

### Step 2: Implement Provider Detection

The `provider` getter must return the wallet's Ethereum provider object. Common patterns:

#### Pattern A: Window Object Detection

```typescript
get provider(): any {
  if (typeof window !== 'undefined') {
    return window.myWallet?.ethereum;
  }
  return null;
}
```

#### Pattern B: Ethereum Providers Array

```typescript
get provider(): any {
  if (typeof window === 'undefined') return null;

  // Check for multiple providers
  if (window.ethereum?.providers) {
    return window.ethereum.providers.find(
      (p: any) => p.isMyWallet
    );
  }

  // Check single provider
  if (window.ethereum?.isMyWallet) {
    return window.ethereum;
  }

  return null;
}
```

#### Pattern C: Dedicated Extension Property

```typescript
get provider(): any {
  if (typeof window !== 'undefined') {
    // First check dedicated extension
    if (window.myWalletExtension) {
      return window.myWalletExtension;
    }

    // Fallback to standard ethereum
    if (window.ethereum?.isMyWallet) {
      return window.ethereum;
    }
  }
  return null;
}
```

### Step 3: Implement Installation Detection

```typescript
async isInstalled(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  // Check if provider exists
  return Boolean(this.provider);

  // Or more specific checks:
  return Boolean(
    window.myWallet?.ethereum ||
    window.ethereum?.isMyWallet
  );
}
```

### Step 4: Provide Installation Link

```typescript
get installLink(): string {
  return 'https://mywallet.io/download';
}
```

### Step 5: (Optional) Override Initialization

If your wallet requires special initialization (SDK setup, custom configuration):

```typescript
private sdk: MyWalletSDK | null = null;

async init(): Promise<void> {
  if (this.sdk) return;

  // Initialize wallet SDK
  this.sdk = new MyWalletSDK({
    dappMetadata: {
      name: this.dappMetadata.name,
      url: this.dappMetadata.url,
    },
  });

  await this.sdk.init();

  // Call parent init to set up event listeners
  await super.init();
}

get provider(): any {
  return this.sdk?.getProvider();
}
```

### Step 6: (Optional) Custom Disconnect Logic

Override if your wallet needs special cleanup:

```typescript
async disconnect(): Promise<void> {
  // Custom cleanup
  await this.sdk?.terminate();

  // Call parent disconnect
  await super.disconnect();
}
```

### Step 7: Export Connector

Add to `packages/evm/src/index.ts`:

```typescript
export * from './connectors/MyWalletEvmConnector';
```

---

## Solana Connector Implementation

### Step 1: Create Connector with Adapter

Solana connectors use the `@solana/wallet-adapter-base` system:

```typescript
// packages/solana/src/connectors/MyWalletSolanaConnector.ts
import { BaseWalletAdapter } from '@solana/wallet-adapter-base';
import { DappMetadata } from '@phoenix-wallet/core';
import { SolanaConnector, SolanaCluster } from './SolanaConnector';

export function createMyWalletConnector(
  dappMetadata: DappMetadata,
  supportedChains: string[],
  defaultCluster: SolanaCluster = SolanaCluster.MAINNET
): SolanaConnector {
  // Import wallet adapter
  const { MyWalletAdapter } = await import('@my-wallet/wallet-adapter');

  const adapter = new MyWalletAdapter();

  return new SolanaConnector(
    dappMetadata,
    adapter,
    defaultCluster,
    supportedChains
  );
}
```

### Step 2: Handle Wallet Standard

If your wallet implements the Wallet Standard:

```typescript
export class MyWalletSolanaConnector extends SolanaConnector {
  async connect(): Promise<{ address: string; chainId: string }> {
    await super.connect();

    // Custom wallet standard setup
    if ('wallet' in this.adapter) {
      const wallet = this.adapter.wallet;

      // Configure wallet-specific features
      if ('updateSession' in wallet) {
        // Custom session configuration
      }
    }

    return {
      address: this.adapter.publicKey?.toBase58() ?? '',
      chainId: this._chainId,
    };
  }
}
```

---

## Complete Implementation Checklist

### Required Implementations

- [ ] Extend appropriate base class (`EvmConnector` or `SolanaConnector`)
- [ ] Implement `provider` getter
- [ ] Implement `isInstalled()` method
- [ ] Implement `installLink` getter
- [ ] Add unique connector ID (lowercase, no spaces)
- [ ] Provide wallet name and logo
- [ ] Export connector from package index

### Optional Implementations

- [ ] Override `init()` for SDK initialization
- [ ] Override `disconnect()` for custom cleanup
- [ ] Override `checkStoredConnection()` for custom reconnection logic
- [ ] Override `handleEventChainChanged()` for custom chain change handling
- [ ] Add TypeScript window interface extensions

### Testing Requirements

- [ ] Wallet detection works correctly
- [ ] Connection flow succeeds
- [ ] Disconnection clears state properly
- [ ] Account change events trigger correctly
- [ ] Chain switch events trigger correctly
- [ ] Reconnection after page reload works
- [ ] Install link opens correct URL

---

## Testing Your Connector

### 1. Add to Demo App Configuration

Edit `src/app/wallet-config.ts`:

```typescript
import { MyWalletEvmConnector } from '@phoenix-wallet/evm';

// Add to connectors array
const myWalletConnector = new MyWalletEvmConnector(
  dappMetadata,
  ['1', '56', '137'] // Supported chain IDs
);

export const evmConnectors = [
  // ... existing connectors
  myWalletConnector,
];
```

### 2. Build and Test

```bash
# Build packages
npm run packages:build

# Run demo app
npm run dev
```

### 3. Test Connection Flow

1. Open http://localhost:3000
2. Click your wallet connector
3. Verify wallet popup appears
4. Approve connection
5. Verify address displays correctly
6. Test account switching
7. Test network switching
8. Test disconnection
9. Reload page and verify auto-reconnection

### 4. Debug with Logger

Enable debug logging in `ClientWalletProvider`:

```typescript
<ClientWalletProvider
  loggerConfig={{
    enabled: true,
    level: LogLevel.DEBUG
  }}
>
```

Check console for:
- Connection events
- Event handler calls
- Error messages

---

## Common Patterns & Best Practices

### 1. TypeScript Window Extensions

Extend Window interface for type safety:

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

### 2. Provider Detection Priority

Recommended detection order:

1. Dedicated wallet extension property
2. Wallet-specific ethereum provider
3. Standard ethereum with identifier flag
4. Providers array with wallet detection

### 3. Connection Status Persistence

Use localStorage keys for persistence:

```typescript
protected get storageConnectionStatusKey(): string | null {
  return `phoenix_${this.id}_evm_connection_status`;
}
```

### 4. Event Listener Setup

Always call `super.init()` after custom initialization:

```typescript
async init(): Promise<void> {
  // Custom initialization
  await this.customSetup();

  // Parent init sets up event listeners
  await super.init();
}
```

### 5. Error Handling

Wrap provider calls in try-catch:

```typescript
async isInstalled(): Promise<boolean> {
  try {
    return Boolean(this.provider);
  } catch (error) {
    logger.error(`Error checking ${this.name} installation:`, error);
    return false;
  }
}
```

### 6. Unique Connector IDs

Follow naming convention: `{walletname}{chaintype}`

Examples:
- `metamaskevm` - MetaMask for EVM
- `phantomevm` - Phantom for EVM
- `phantom_solana` - Phantom for Solana (generated from adapter name)

### 7. Logo Assets

Prefer:
1. Base64 data URIs for small icons (better for bundling)
2. CDN URLs for larger logos
3. Public URLs from official wallet sources

### 8. Chain ID Formatting

EVM chains use decimal strings, not hex:

```typescript
async getChainId(): Promise<string> {
  const chainIdHex = await this.provider?.request({
    method: 'eth_chainId'
  });
  // Convert 0x1 → "1"
  return chainIdHex ? parseInt(chainIdHex, 16).toString() : '0';
}
```

### 9. Multiple Provider Handling

Handle wallets that inject multiple providers:

```typescript
get provider(): any {
  if (window.ethereum?.providers) {
    // Find specific provider in array
    return window.ethereum.providers.find(p => p.isMyWallet);
  }
  return window.ethereum?.isMyWallet ? window.ethereum : null;
}
```

### 10. SDK Initialization

Initialize SDKs lazily in `init()` method:

```typescript
private sdk: WalletSDK | null = null;

async init(): Promise<void> {
  if (this.sdk) return; // Already initialized

  this.sdk = new WalletSDK({ /* config */ });
  await this.sdk.init();
  await super.init();
}
```

---

## Example: Complete EVM Connector

Here's a complete example implementing all patterns:

```typescript
import { DappMetadata } from '@phoenix-wallet/core';
import { EvmConnector } from './EvmConnector';

// TypeScript declarations
declare global {
  interface Window {
    exampleWallet?: {
      ethereum?: any;
    };
  }
}

interface ExampleProvider {
  isExampleWallet?: boolean;
}

interface WindowWithExample extends Window {
  exampleWallet?: ExampleProvider;
  ethereum?: ExampleProvider & {
    providers?: ExampleProvider[];
  };
}

export class ExampleWalletEvmConnector extends EvmConnector {
  constructor(dappMetadata: DappMetadata, supportedChains: string[]) {
    super(
      'examplewalletev',
      {
        name: 'Example Wallet',
        logo: 'data:image/svg+xml;base64,...',
      },
      dappMetadata,
      supportedChains
    );
  }

  private get windowWithExample(): WindowWithExample | undefined {
    return typeof window !== 'undefined'
      ? (window as WindowWithExample)
      : undefined;
  }

  private findExampleProvider(): ExampleProvider | null {
    const win = this.windowWithExample;
    if (!win) return null;

    // Priority 1: Dedicated extension
    if (win.exampleWallet) {
      return win.exampleWallet;
    }

    // Priority 2: Providers array
    if (win.ethereum?.providers) {
      const found = win.ethereum.providers.find(
        p => p.isExampleWallet
      );
      if (found) return found;
    }

    // Priority 3: Main ethereum object
    if (win.ethereum?.isExampleWallet) {
      return win.ethereum;
    }

    return null;
  }

  get provider(): ExampleProvider | null {
    return this.findExampleProvider();
  }

  async isInstalled(): Promise<boolean> {
    return this.findExampleProvider() !== null;
  }

  get installLink(): string {
    return 'https://example-wallet.io/download';
  }
}
```

---

## Next Steps

1. **Implement your connector** following this guide
2. **Test thoroughly** in the demo app
3. **Submit PR** with your new connector
4. **Update documentation** with wallet-specific notes

For questions or issues, refer to existing connector implementations in:
- `packages/evm/src/connectors/` - EVM examples
- `packages/solana/src/connectors/` - Solana examples
