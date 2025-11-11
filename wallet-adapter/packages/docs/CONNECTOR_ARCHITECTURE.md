# Connector Architecture Deep Dive

This document provides an in-depth explanation of the Phoenix Wallet connector architecture, event system, and lifecycle management.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Connector Lifecycle](#connector-lifecycle)
3. [Event System](#event-system)
4. [Connection State Management](#connection-state-management)
5. [Provider Detection Patterns](#provider-detection-patterns)
6. [Client Creation](#client-creation)

---

## Architecture Overview

### Layer Structure

```
┌─────────────────────────────────────────────────────────┐
│  Application Layer (React Components)                   │
│  - Uses hooks: useWalletBase, useWalletConnectors       │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│  Context Layer (WalletProvider)                         │
│  - Manages connector registration                       │
│  - Tracks connection statuses                           │
│  - Coordinates reconnection                             │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│  Connector Layer (IConnector implementations)           │
│  - EvmConnector, SolanaConnector, etc.                  │
│  - Connection management                                │
│  - Event handling                                       │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│  Provider Layer (Wallet Extensions)                     │
│  - window.ethereum, window.solana, etc.                 │
│  - Wallet-specific APIs                                 │
└─────────────────────────────────────────────────────────┘
```

### Core Components

#### 1. IConnector Interface

The contract that all connectors must fulfill:

```typescript
interface IConnector {
  // Identity & metadata
  id: string;
  name: string;
  logo: string;
  chainType: ChainType;
  installLink: string;

  // Connection lifecycle
  connect(): Promise<{ address: string; chainId: string }>;
  disconnect(): Promise<void>;
  isConnected(): Promise<boolean>;
  isInstalled(): Promise<boolean>;

  // State queries
  getConnectedAddresses(): Promise<string[]>;
  getChainId(): Promise<string>;

  // Chain management
  switchChainId(chainId: string): Promise<void>;
  addChain(chain: IChain<any>): Promise<void>;
  isSupportChain(chainId: string): boolean;

  // Client creation for transactions
  createWalletClient(chain: IChain<any>): any;
  createPublicClient(chain: IChain<any>): any;

  // Event handlers (internal)
  handleEventConnect(address: string, chainId?: string): Promise<void>;
  handleEventDisconnect(address: string): Promise<void>;
  handleEventChainChanged(chainId: string): Promise<void>;
  handleEventAccountChanged(addresses: string[]): Promise<void>;

  // Callback system
  registerConnectorCallback(callback: IConnectorCallback): void;
  unregisterConnectorCallback(callback: IConnectorCallback): void;
}
```

#### 2. Base Connector Class

Provides common functionality:

```typescript
abstract class Connector implements IConnector {
  protected callbackManager: CallbackManager;

  constructor(
    id: string,
    name: string,
    logo: string,
    dappMetadata: DappMetadata,
    supportedChains: string[]
  ) {
    this.callbackManager = new CallbackManager(id);
    // ... initialization
  }

  // Event handling delegates to CallbackManager
  async handleEventConnect(address: string, chainId?: string): Promise<void> {
    this.callbackManager.notifyConnect(address, chainId);
  }

  async handleEventDisconnect(address: string): Promise<void> {
    this.callbackManager.notifyDisconnect(address);
  }

  // ... other event handlers
}
```

#### 3. CallbackManager

Manages event subscriptions and notifications:

```typescript
class CallbackManager {
  private callbacks: Set<IConnectorCallback> = new Set();

  registerConnectorCallback(callback: IConnectorCallback): void {
    this.callbacks.add(callback);
  }

  unregisterConnectorCallback(callback: IConnectorCallback): void {
    this.callbacks.delete(callback);
  }

  notifyConnect(address: string, chainId?: string): void {
    this.callbacks.forEach(cb => {
      cb.onConnect(this.connectorId, address, chainId);
    });
  }

  // ... other notification methods
}
```

---

## Connector Lifecycle

### Initialization Flow

```
User loads app
     ↓
WalletProvider mounts
     ↓
Connector instances created
     ↓
WalletProvider.useEffect runs
     ↓
For each connector:
  - Set initial status: DISCONNECTED
  - Call connector.isConnected()
  - If connected: update status to CONNECTED
     ↓
Auto-reconnect logic (if enabled)
     ↓
Register global event listeners
     ↓
Ready for user interaction
```

### Connection Flow

```
User clicks "Connect Wallet"
     ↓
App calls connector.connect()
     ↓
Connector checks isInstalled()
  - If not installed: throw error / show install link
  - If installed: continue
     ↓
Connector initializes (if not already)
  - await connector.init()
  - Set up event listeners
  - Check stored connection
     ↓
Connector requests wallet connection
  - EVM: eth_requestAccounts
  - Solana: adapter.connect()
     ↓
Wallet shows permission popup
     ↓
User approves connection
     ↓
Connector receives address & chainId
     ↓
Connector fires connect event
  - handleEventConnect(address, chainId)
  - CallbackManager.notifyConnect()
     ↓
WalletProvider callback receives event
  - Updates connectorStatuses
  - Adds to activeConnectors
     ↓
UI re-renders with connected state
     ↓
App can now create wallet/public clients
```

### Disconnection Flow

```
User clicks "Disconnect"
     ↓
App calls connector.disconnect()
     ↓
Connector saves current address
     ↓
Connector clears internal state
  - activeAddress = undefined
  - activeChainId = undefined
     ↓
Connector removes localStorage data
  - Remove connection status
  - Remove stored address
     ↓
Connector calls wallet disconnect (if available)
  - EVM: may not have explicit disconnect
  - Solana: adapter.disconnect()
     ↓
Connector fires disconnect event
  - handleEventDisconnect(savedAddress)
  - CallbackManager.notifyDisconnect()
     ↓
WalletProvider callback receives event
  - Updates connectorStatuses
  - Removes from activeConnectors
     ↓
UI re-renders with disconnected state
```

### Reconnection Flow (Page Reload)

```
User reloads page / returns to app
     ↓
WalletProvider mounts
     ↓
Connector.init() is called
     ↓
Connector checks stored connection
  - Read localStorage for connection status
     ↓
If stored status = "connected":
  - Call getConnectedAddresses()
  - If addresses found:
    → Set activeAddress
    → Get chainId
    → Fire connect event
  - If no addresses:
    → Clear localStorage
    → Remain disconnected
     ↓
WalletProvider receives connect event
  - Updates connectorStatuses
  - Adds to activeConnectors
     ↓
Auto-reconnect logic (if enabled)
  - Attempts to call connect() if isConnected() is true
     ↓
UI shows connected state
```

---

## Event System

### Event Flow Diagram

```
Wallet Extension Event
     ↓
Provider Event Listener (in connector)
     ↓
Connector Event Handler
  - handleEventConnect()
  - handleEventDisconnect()
  - handleEventChainChanged()
  - handleEventAccountChanged()
     ↓
CallbackManager.notify*()
     ↓
Registered Callbacks (IConnectorCallback)
     ↓
WalletProvider Callback
     ↓
State Updates (React setState)
     ↓
UI Re-render
```

### Event Types

#### 1. Connect Event

**Triggered when:**
- User successfully connects wallet
- Reconnection succeeds after page reload
- Account changes to a different address

**Flow:**
```typescript
// In EvmConnector
const accounts = await this.provider.request({
  method: 'eth_requestAccounts'
});

this.activeAddress = accounts[0];
this.activeChainId = await this.getChainId();

// Fire event
this.handleEventConnect(this.activeAddress, this.activeChainId);

// CallbackManager notifies all registered callbacks
this.callbackManager.notifyConnect(address, chainId);

// WalletProvider callback updates state
onConnect(connectorId, address, chainId) {
  setConnectorStatuses(prev => ({
    ...prev,
    [connectorId]: ConnectorStatus.CONNECTED
  }));
  setActiveConnectors(prev => ({
    ...prev,
    [connectorId]: connector
  }));
}
```

#### 2. Disconnect Event

**Triggered when:**
- User explicitly disconnects
- Wallet extension disconnects
- All accounts are removed

**Flow:**
```typescript
// In EvmConnector event listener
this.provider.on('disconnect', async () => {
  const accounts = await this.provider.request({
    method: 'eth_accounts'
  });

  if (accounts.length === 0 && this.activeAddress) {
    this.handleEventDisconnect(this.activeAddress);
    this.activeAddress = undefined;
    this.activeChainId = undefined;
  }
});

// WalletProvider callback updates state
onDisconnect(connectorId, address) {
  setConnectorStatuses(prev => ({
    ...prev,
    [connectorId]: ConnectorStatus.DISCONNECTED
  }));
  setActiveConnectors(prev => {
    const newState = { ...prev };
    delete newState[connectorId];
    return newState;
  });
}
```

#### 3. Chain Changed Event

**Triggered when:**
- User switches network in wallet
- App calls switchChainId()

**Flow:**
```typescript
// In EvmConnector event listener
this.provider.on('chainChanged', (chainId: string) => {
  this.activeChainId = chainId;
  this.handleEventChainChanged(chainId);
});

// Base Connector handles formatting
async handleEventChainChanged(chainId: string): Promise<void> {
  // Convert hex to decimal if needed
  const formatted = chainId.startsWith('0x')
    ? parseInt(chainId, 16).toString()
    : chainId;

  this.callbackManager.notifyChainChanged(formatted);
}

// WalletProvider callback
onChainChanged(connectorId, chainId) {
  logger.info(`Chain changed for ${connectorId} to ${chainId}`);
  // Connection status unchanged
}
```

#### 4. Account Changed Event

**Triggered when:**
- User switches accounts in wallet
- User adds/removes accounts

**Flow:**
```typescript
// In EvmConnector event listener
this.provider.on('accountsChanged', (accounts: string[]) => {
  this.handleEventAccountChanged(accounts);
});

// Override to handle special cases
async handleEventAccountChanged(addresses: string[]): Promise<void> {
  if (addresses.length === 0) {
    // All accounts removed = disconnect
    if (this.activeAddress) {
      this.handleEventDisconnect(this.activeAddress);
      this.activeAddress = undefined;
      this.activeChainId = undefined;
    }
  } else {
    // Account switched = reconnect with new address
    if (this.activeAddress !== addresses[0]) {
      this.activeAddress = addresses[0];
      this.activeChainId = await this.getChainId();
      this.handleEventConnect(this.activeAddress, this.activeChainId);
    }
  }

  // Also notify account change
  super.handleEventAccountChanged(addresses);
}

// WalletProvider callback
onAccountChanged(connectorId, addresses) {
  logger.info(`Accounts changed for ${connectorId}`);
  // Connection status unchanged (unless handled above)
}
```

---

## Connection State Management

### State Storage

Connectors use localStorage for persistence:

```typescript
// Storage keys
protected get storageConnectionStatusKey(): string | null {
  return `phoenix_${this.id}_${this.chainType}_connection_status`;
}

protected get storageAddressKey(): string | null {
  return `phoenix_${this.id}_${this.chainType}_address`;
}

// Storing connection
async connect(): Promise<{ address: string; chainId: string }> {
  // ... connection logic ...

  if (typeof localStorage !== 'undefined' && this.storageConnectionStatusKey) {
    localStorage.setItem(this.storageConnectionStatusKey, 'connected');
  }

  return { address, chainId };
}

// Clearing connection
async disconnect(): Promise<void> {
  // ... disconnect logic ...

  if (typeof localStorage !== 'undefined' && this.storageConnectionStatusKey) {
    localStorage.removeItem(this.storageConnectionStatusKey);
  }
}
```

### State Checks

```typescript
async isConnected(): Promise<boolean> {
  try {
    // Check localStorage first
    if (this.storageConnectionStatusKey) {
      const storedStatus = localStorage.getItem(
        this.storageConnectionStatusKey
      );
      if (!storedStatus) return false;
    }

    // Check internal state
    if (this.activeAddress) return true;

    // Check wallet provider
    const addresses = await this.getConnectedAddresses()
      .catch(() => []);

    return addresses.length > 0;
  } catch (error) {
    logger.error(`Error checking connection:`, error);
    return false;
  }
}
```

---

## Provider Detection Patterns

### Pattern 1: Direct Window Property

```typescript
get provider(): any {
  if (typeof window !== 'undefined') {
    return window.myWallet?.ethereum;
  }
  return null;
}
```

**Used by:** Phantom, OKX

### Pattern 2: Ethereum with Identifier

```typescript
get provider(): any {
  if (typeof window !== 'undefined' && window.ethereum?.isMyWallet) {
    return window.ethereum;
  }
  return null;
}
```

**Used by:** MetaMask, Trust Wallet

### Pattern 3: Multiple Providers Array

```typescript
get provider(): any {
  if (typeof window === 'undefined') return null;

  // Check providers array
  if (window.ethereum?.providers) {
    return window.ethereum.providers.find(
      (p: any) => p.isMyWallet
    );
  }

  // Fallback to single provider
  if (window.ethereum?.isMyWallet) {
    return window.ethereum;
  }

  return null;
}
```

**Used by:** Coinbase, Rabby, Zerion

### Pattern 4: Priority-Based Detection

```typescript
private findProvider(): Provider | null {
  if (typeof window === 'undefined') return null;

  // Priority 1: Dedicated extension
  if (window.myWalletExtension) {
    return window.myWalletExtension;
  }

  // Priority 2: Specific ethereum property
  if (window.myWallet?.ethereum) {
    return window.myWallet.ethereum;
  }

  // Priority 3: Standard ethereum with flag
  if (window.ethereum?.isMyWallet) {
    return window.ethereum;
  }

  // Priority 4: Providers array
  if (window.ethereum?.providers) {
    return window.ethereum.providers.find(p => p.isMyWallet);
  }

  return null;
}
```

**Used by:** Coinbase (comprehensive detection)

---

## Client Creation

### EVM Wallet Client (viem)

```typescript
createWalletClient(chain: EvmChain): WalletClient {
  return createWalletClient({
    chain: {
      id: parseInt(this.activeChainId!),
      name: chain.chainName,
      nativeCurrency: {
        name: chain.nativeCurrency.name,
        symbol: chain.nativeCurrency.symbol,
        decimals: chain.nativeCurrency.decimals,
      },
      rpcUrls: {
        default: { http: [chain.publicRpcUrl] },
      },
      blockExplorers: {
        default: {
          name: chain.chainName,
          url: chain.explorerUrl,
        },
      },
    },
    transport: custom(this.provider), // Use wallet provider
  });
}
```

### EVM Public Client (viem)

```typescript
createPublicClient(chain: EvmChain): PublicClient {
  return createPublicClient({
    chain: {
      id: parseInt(this.activeChainId!),
      name: chain.chainName,
      nativeCurrency: chain.nativeCurrency,
      rpcUrls: {
        default: { http: [chain.privateRpcUrl] },
      },
      blockExplorers: {
        default: {
          name: chain.chainName,
          url: chain.explorerUrl,
        },
      },
    },
    transport: http(chain.privateRpcUrl), // Use public RPC
  });
}
```

### Solana Wallet Client

```typescript
createWalletClient(chain: IChain<any>) {
  // Validate adapter has required methods
  if (!('signTransaction' in this.adapter)) {
    throw new Error('Adapter missing signTransaction method');
  }

  return new SolanaWalletClient(
    this.adapter as BaseMessageSignerWalletAdapter
  );
}
```

### Solana Public Client

```typescript
createPublicClient(chain: IChain<any>) {
  return new Connection(chain.publicRpcUrl);
}
```

---

## Summary

The connector architecture provides:

1. **Abstraction** - Unified interface across different wallets
2. **Event-driven** - Reactive state management through callbacks
3. **Persistent** - Connection survives page reloads
4. **Extensible** - Easy to add new wallet support
5. **Type-safe** - Full TypeScript support

For implementation examples, see:
- `packages/core/src/interfaces/IConnector.ts` - Interface definitions
- `packages/evm/src/connectors/EvmConnector.ts` - EVM base implementation
- `packages/solana/src/connectors/SolanaConnector.ts` - Solana base implementation
