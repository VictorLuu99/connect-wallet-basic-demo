# Connector Implementation Examples

This document provides real-world examples of connector implementations for various wallet types and use cases.

## Table of Contents

1. [Simple EVM Connector](#simple-evm-connector)
2. [EVM Connector with SDK](#evm-connector-with-sdk)
3. [Multi-Provider EVM Connector](#multi-provider-evm-connector)
4. [Solana Connector](#solana-connector)
5. [Custom Chain Connector](#custom-chain-connector)
6. [Advanced Patterns](#advanced-patterns)

---

## Simple EVM Connector

Basic connector for wallets injecting directly into `window.ethereum`:

```typescript
// packages/evm/src/connectors/TrustWalletEvmConnector.ts
import { DappMetadata } from '@phoenix-wallet/core';
import { EvmConnector } from './EvmConnector';

export class TrustWalletEvmConnector extends EvmConnector {
  constructor(dappMetadata: DappMetadata, supportedChains: string[]) {
    super(
      'trustwalletevm',                    // Unique ID
      {
        name: 'Trust Wallet',              // Display name
        logo: 'https://trustwallet.com/logo.svg', // Logo URL
      },
      dappMetadata,
      supportedChains                      // ['1', '56', '137']
    );
  }

  // Detect wallet by checking window property
  get provider(): any {
    if (typeof window !== 'undefined' && window.ethereum?.isTrust) {
      return window.ethereum;
    }
    return null;
  }

  // Check if wallet is installed
  async isInstalled(): Promise<boolean> {
    return typeof window !== 'undefined' && Boolean(window.ethereum?.isTrust);
  }

  // Provide download link
  get installLink(): string {
    return 'https://trustwallet.com/download';
  }
}
```

**Key Points:**
- Minimal implementation - only 3 methods required
- Uses wallet-specific identifier (`isTrust`)
- No SDK required

---

## EVM Connector with SDK

For wallets requiring SDK initialization (like MetaMask):

```typescript
// packages/evm/src/connectors/MetamaskEvmConnector.ts
import { MetaMaskSDK } from '@metamask/sdk';
import { DappMetadata } from '@phoenix-wallet/core';
import { EvmConnector } from './EvmConnector';

export class MetamaskEvmConnector extends EvmConnector {
  private sdk: MetaMaskSDK | null = null;

  constructor(dappMetadata: DappMetadata, supportedChains: string[]) {
    super(
      'metamaskevm',
      {
        name: 'MetaMask',
        logo: 'https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg',
      },
      dappMetadata,
      supportedChains
    );
  }

  // Provider comes from SDK
  get provider(): any {
    return this.sdk?.getProvider();
  }

  // Override init to set up SDK
  async init(): Promise<void> {
    // Skip if already initialized
    if (this.sdk) return;

    // Initialize SDK with dapp metadata
    this.sdk = new MetaMaskSDK({
      dappMetadata: {
        name: this.dappMetadata.name,
        url: this.dappMetadata.url,
      },
    });

    await this.sdk.init();

    // Call parent init to set up event listeners
    await super.init();
  }

  async isInstalled(): Promise<boolean> {
    await this.init();
    return this.provider !== null;
  }

  // Override disconnect to clean up SDK
  async disconnect(): Promise<void> {
    await this.sdk?.terminate();
    await super.disconnect();
  }

  get installLink(): string {
    return 'https://metamask.io/download/';
  }
}
```

**Key Points:**
- SDK initialized lazily in `init()`
- Provider accessed through SDK
- Custom disconnect cleanup
- Calls `super.init()` after SDK setup

---

## Multi-Provider EVM Connector

For wallets that may appear in multiple locations:

```typescript
// packages/evm/src/connectors/CoinbaseEvmConnector.ts
import { DappMetadata } from '@phoenix-wallet/core';
import { EvmConnector } from './EvmConnector';

// TypeScript interfaces for type safety
interface CoinbaseProvider {
  isCoinbaseWallet?: boolean;
  isCoinbaseBrowser?: boolean;
}

interface WindowWithCoinbase extends Window {
  coinbaseWalletExtension?: CoinbaseProvider;
  ethereum?: CoinbaseProvider & {
    providers?: CoinbaseProvider[];
  };
}

export class CoinbaseEvmConnector extends EvmConnector {
  constructor(dappMetadata: DappMetadata, supportedChains: string[]) {
    super(
      'coinbaseevm',
      {
        name: 'Coinbase',
        logo: 'https://images.ctfassets.net/.../Consumer_Wordmark.svg',
      },
      dappMetadata,
      supportedChains
    );
  }

  // Helper for typed window access
  private get windowWithCoinbase(): WindowWithCoinbase | undefined {
    return typeof window !== 'undefined'
      ? (window as WindowWithCoinbase)
      : undefined;
  }

  // Priority-based provider detection
  private findCoinbaseProvider(): CoinbaseProvider | null {
    const win = this.windowWithCoinbase;
    if (!win) return null;

    // Priority 1: Dedicated extension property
    if (win.coinbaseWalletExtension) {
      return win.coinbaseWalletExtension;
    }

    // Priority 2: Main ethereum object with identifier
    if (win.ethereum?.isCoinbaseWallet) {
      return win.ethereum;
    }

    // Priority 3: Browser integration
    const ethereumProvider = win.ethereum ?? (win.top as WindowWithCoinbase)?.ethereum;
    if (ethereumProvider?.isCoinbaseBrowser) {
      return ethereumProvider;
    }

    return null;
  }

  get provider(): CoinbaseProvider | null {
    return this.findCoinbaseProvider();
  }

  async isInstalled(): Promise<boolean> {
    return this.findCoinbaseProvider() !== null;
  }

  get installLink(): string {
    return 'https://www.coinbase.com/wallet';
  }
}
```

**Key Points:**
- Type-safe window access with interfaces
- Priority-based detection (dedicated → standard → browser)
- Handles multiple injection points
- Defensive null checking

---

## Solana Connector

Using Solana Wallet Adapter:

```typescript
// packages/solana/src/connectors/PhantomSolanaConnector.ts
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { DappMetadata } from '@phoenix-wallet/core';
import { SolanaConnector, SolanaCluster } from './SolanaConnector';

export function createPhantomSolanaConnector(
  dappMetadata: DappMetadata,
  supportedChains: string[],
  defaultCluster: SolanaCluster = SolanaCluster.MAINNET
): SolanaConnector {
  // Create wallet adapter
  const adapter = new PhantomWalletAdapter();

  // Return configured connector
  return new SolanaConnector(
    dappMetadata,
    adapter,
    defaultCluster,
    supportedChains
  );
}
```

**Base SolanaConnector handles:**
- Adapter event listening
- Connection management
- Address formatting
- Cluster switching

**For custom Solana wallets:**

```typescript
export class CustomSolanaConnector extends SolanaConnector {
  async connect(): Promise<{ address: string; chainId: string }> {
    // Call parent connect
    await super.connect();

    // Custom wallet-specific logic
    if ('wallet' in this.adapter) {
      const wallet = this.adapter.wallet;

      // Configure wallet standard features
      if ('updateSession' in wallet) {
        // Custom session setup for devnet
        if (this.cluster === SolanaCluster.DEVNET) {
          const session = await (wallet as any).client.getSession();
          // Remove mainnet config
          delete session.sessionScopes['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'];
          await (wallet as any).updateSession(session);
        }
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

## Custom Chain Connector

For blockchains not covered by existing base classes:

```typescript
// packages/aptos/src/connectors/AptosConnector.ts
import { Connector, DappMetadata, ChainType, IChain } from '@phoenix-wallet/core';
import { AptosClient } from 'aptos';

export abstract class AptosConnector extends Connector {
  protected activeAddress: string | undefined = undefined;
  protected isInitialized: boolean = false;

  abstract get provider(): any;

  constructor(
    id: string,
    name: string,
    logo: string,
    dappMetadata: DappMetadata,
    supportedChains: string[]
  ) {
    super(id, name, logo, dappMetadata, supportedChains);
  }

  get chainType(): ChainType {
    return ChainType.APTOS;
  }

  async init(): Promise<void> {
    if (!this.provider) {
      throw new Error(`${this.name} provider not found`);
    }

    if (this.isInitialized) return;

    this.isInitialized = true;
    await this.setupEventListeners();
    this.checkStoredConnection();
  }

  async setupEventListeners(): Promise<void> {
    if (!this.provider) return;

    // Aptos-specific events
    this.provider.onAccountChange((account: any) => {
      if (account) {
        const newAddress = account.address;
        if (this.activeAddress !== newAddress) {
          this.activeAddress = newAddress;
          this.handleEventConnect(newAddress, 'aptos-mainnet');
        }
      } else {
        if (this.activeAddress) {
          this.handleEventDisconnect(this.activeAddress);
          this.activeAddress = undefined;
        }
      }
    });

    this.provider.onNetworkChange((network: any) => {
      this.handleEventChainChanged(network.name);
    });

    this.provider.onDisconnect(() => {
      if (this.activeAddress) {
        this.handleEventDisconnect(this.activeAddress);
        this.activeAddress = undefined;
      }
    });
  }

  async connect(): Promise<{ address: string; chainId: string }> {
    await this.init();

    const response = await this.provider.connect();

    this.activeAddress = response.address;

    // Store connection
    if (typeof localStorage !== 'undefined' && this.storageConnectionStatusKey) {
      localStorage.setItem(this.storageConnectionStatusKey, 'connected');
    }

    this.handleEventConnect(this.activeAddress, 'aptos-mainnet');

    return {
      address: this.activeAddress,
      chainId: 'aptos-mainnet',
    };
  }

  async disconnect(): Promise<void> {
    const currentAddress = this.activeAddress;

    await this.provider?.disconnect();

    this.activeAddress = undefined;

    if (typeof localStorage !== 'undefined' && this.storageConnectionStatusKey) {
      localStorage.removeItem(this.storageConnectionStatusKey);
    }

    if (currentAddress) {
      this.handleEventDisconnect(currentAddress);
    }
  }

  async getConnectedAddresses(): Promise<string[]> {
    await this.init();

    const account = await this.provider?.account();
    return account ? [account.address] : [];
  }

  async getChainId(): Promise<string> {
    const network = await this.provider?.network();
    return network?.name ?? 'aptos-mainnet';
  }

  async isConnected(): Promise<boolean> {
    try {
      if (this.storageConnectionStatusKey) {
        const stored = localStorage.getItem(this.storageConnectionStatusKey);
        if (!stored) return false;
      }

      if (this.activeAddress) return true;

      const addresses = await this.getConnectedAddresses().catch(() => []);
      return addresses.length > 0;
    } catch (error) {
      return false;
    }
  }

  createWalletClient(chain: IChain<any>) {
    // Return Aptos-specific wallet client
    return {
      provider: this.provider,
      address: this.activeAddress,
    };
  }

  createPublicClient(chain: IChain<any>) {
    return new AptosClient(chain.publicRpcUrl);
  }

  async switchChainId(chainId: string): Promise<void> {
    await this.provider?.changeNetwork({
      network: chainId,
    });
  }

  async addChain(chain: IChain<any>): Promise<void> {
    throw new Error('addChain not supported for Aptos');
  }

  protected get storageConnectionStatusKey(): string | null {
    return `phoenix_${this.id}_aptos_connection_status`;
  }

  protected checkStoredConnection(): void {
    if (typeof localStorage !== 'undefined' && this.storageConnectionStatusKey) {
      const stored = localStorage.getItem(this.storageConnectionStatusKey);
      if (stored === 'connected') {
        this.getConnectedAddresses()
          .then(addresses => {
            if (addresses.length > 0) {
              this.activeAddress = addresses[0];
              this.handleEventConnect(this.activeAddress, 'aptos-mainnet');
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
}
```

**Concrete implementation:**

```typescript
// packages/aptos/src/connectors/PetraAptosConnector.ts
import { DappMetadata } from '@phoenix-wallet/core';
import { AptosConnector } from './AptosConnector';

export class PetraAptosConnector extends AptosConnector {
  constructor(dappMetadata: DappMetadata, supportedChains: string[]) {
    super(
      'petraaptos',
      'Petra',
      'https://petra.app/logo.svg',
      dappMetadata,
      supportedChains
    );
  }

  get provider(): any {
    if (typeof window !== 'undefined') {
      return (window as any).petra;
    }
    return null;
  }

  async isInstalled(): Promise<boolean> {
    return typeof window !== 'undefined' && Boolean((window as any).petra);
  }

  get installLink(): string {
    return 'https://petra.app/';
  }
}
```

---

## Advanced Patterns

### 1. Custom Reconnection Logic

Override `checkStoredConnection()` for special reconnection handling:

```typescript
export class PhantomEvmConnector extends EvmConnector {
  protected checkStoredConnection(): void {
    if (typeof localStorage !== 'undefined' && this.storageConnectionStatusKey) {
      const storedStatus = localStorage.getItem(this.storageConnectionStatusKey);

      if (storedStatus === 'connected') {
        this.getConnectedAddresses()
          .then(addresses => {
            if (addresses.length > 0) {
              this.activeAddress = addresses[0];

              // Also restore chainId from storage
              const storedChainId = localStorage.getItem(
                this.storageConnectionStatusKey + '_chainId'
              );

              if (storedChainId) {
                this.activeChainId = storedChainId;
                this.handleEventConnect(this.activeAddress!, this.activeChainId);
              } else {
                this.getChainId().then(chainId => {
                  this.activeChainId = chainId;
                  this.handleEventConnect(this.activeAddress!, this.activeChainId);
                });
              }
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

  // Also save chainId on change
  async handleEventChainChanged(chainId: string): Promise<void> {
    await super.handleEventChainChanged(chainId);

    const formatted = chainId.startsWith('0x')
      ? parseInt(chainId, 16).toString()
      : chainId;

    localStorage.setItem(
      this.storageConnectionStatusKey + '_chainId',
      formatted
    );
  }
}
```

### 2. Provider Polling

For wallets without reliable event listeners:

```typescript
export class UnreliableWalletConnector extends EvmConnector {
  private pollInterval: NodeJS.Timeout | null = null;

  async init(): Promise<void> {
    await super.init();

    // Start polling for changes
    this.startPolling();
  }

  private startPolling(): void {
    if (this.pollInterval) return;

    this.pollInterval = setInterval(async () => {
      try {
        const addresses = await this.getConnectedAddresses();
        const chainId = await this.getChainId();

        // Check for address change
        if (addresses.length > 0 && this.activeAddress !== addresses[0]) {
          this.activeAddress = addresses[0];
          this.handleEventConnect(this.activeAddress, chainId);
        }

        // Check for chain change
        if (this.activeChainId !== chainId) {
          this.activeChainId = chainId;
          this.handleEventChainChanged(chainId);
        }

        // Check for disconnect
        if (addresses.length === 0 && this.activeAddress) {
          const oldAddress = this.activeAddress;
          this.activeAddress = undefined;
          this.handleEventDisconnect(oldAddress);
        }
      } catch (error) {
        // Ignore polling errors
      }
    }, 1000); // Poll every second
  }

  async disconnect(): Promise<void> {
    // Stop polling
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    await super.disconnect();
  }
}
```

### 3. Multi-Chain Support

Connector supporting multiple blockchains:

```typescript
export class MultiChainConnector extends Connector {
  private currentChainType: ChainType = ChainType.EVM;

  get chainType(): ChainType {
    return this.currentChainType;
  }

  async switchChainType(chainType: ChainType): Promise<void> {
    // Disconnect from current chain
    await this.disconnect();

    // Update chain type
    this.currentChainType = chainType;

    // Reconnect to new chain
    await this.connect();
  }

  get provider(): any {
    switch (this.currentChainType) {
      case ChainType.EVM:
        return window.multiWallet?.ethereum;
      case ChainType.SOLANA:
        return window.multiWallet?.solana;
      default:
        return null;
    }
  }
}
```

### 4. Error Recovery

Robust error handling:

```typescript
export class ResilientConnector extends EvmConnector {
  private connectionAttempts: number = 0;
  private maxRetries: number = 3;

  async connect(): Promise<{ address: string; chainId: string }> {
    try {
      const result = await super.connect();
      this.connectionAttempts = 0; // Reset on success
      return result;
    } catch (error) {
      this.connectionAttempts++;

      if (this.connectionAttempts < this.maxRetries) {
        // Retry with exponential backoff
        const delay = Math.pow(2, this.connectionAttempts) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.connect();
      }

      // Max retries exceeded
      this.connectionAttempts = 0;
      throw new Error(`Failed to connect after ${this.maxRetries} attempts`);
    }
  }

  async isInstalled(): Promise<boolean> {
    try {
      return await super.isInstalled();
    } catch (error) {
      logger.error('Error checking installation:', error);
      return false; // Assume not installed on error
    }
  }
}
```

---

## Summary

These examples demonstrate:

1. **Simple connectors** - Minimal implementation for basic wallets
2. **SDK integration** - Handling external wallet SDKs
3. **Multi-provider detection** - Priority-based provider finding
4. **Custom chains** - Implementing new blockchain support
5. **Advanced patterns** - Polling, error recovery, multi-chain

Choose the pattern that best fits your wallet's architecture and capabilities.
