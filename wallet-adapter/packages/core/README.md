# @phoenix-wallet/core

Core package for Phoenix Wallet - a unified multi-chain wallet adapter library.

## Overview

This package provides the foundational interfaces, types, contexts, and hooks that are shared across all blockchain implementations in the Phoenix Wallet ecosystem. It contains no blockchain-specific dependencies, making it lightweight and modular.

## Features

- 🔌 **Universal Interfaces**: Common interfaces for wallets, connectors, contracts, and chains
- 🎯 **Type Safety**: Comprehensive TypeScript types for all wallet operations
- 🪝 **React Hooks**: Base hooks for wallet connection and event handling
- 🔄 **Event System**: Unified event handling across all chains
- 📦 **Zero Blockchain Dependencies**: Pure abstractions with no chain-specific code
- 📝 **Configurable Logger**: Built-in logging system with multiple log levels for debugging and monitoring

## Installation

```bash
# Using pnpm
pnpm add @phoenix-wallet/core

# Using npm
npm install @phoenix-wallet/core

# Using yarn
yarn add @phoenix-wallet/core
```

## Core Concepts

### Chain Types

The package supports multiple blockchain types:

```typescript
enum ChainType {
  EVM = 'evm',
  SOLANA = 'solana',
  APTOS = 'aptos',
  SUI = 'sui'
}
```

### Interfaces

#### IConnector

Base interface for all wallet connectors:

```typescript
interface IConnector {
  id: string;
  name: string;
  logo: string;
  chainType: ChainType;
  status: ConnectorStatus;
  
  activate(): Promise<string[]>;
  deactivate(): Promise<void>;
  isInstalled(): boolean;
  switchChainId(chainId: string): Promise<void>;
}
```

#### IWallet

Base interface for wallet instances:

```typescript
interface IWallet<TAddress, TChain, TConnector, TClient> {
  address: TAddress;
  chain: TChain;
  connector: TConnector;
  walletClient: TClient;
  
  getBalance(): Promise<string>;
  signMessage(message: string | Uint8Array): Promise<string>;
  sendTransaction(transaction: any): Promise<string>;
}
```

#### Contract

Base class for smart contract interactions:

```typescript
abstract class Contract {
  address: string;
  abi?: any;
  
  abstract call(method: string, params: any[]): Promise<any>;
  abstract send(method: string, params: any[]): Promise<string>;
}
```

## React Hooks

### useWalletConnectors

Access all registered wallet connectors:

```typescript
import { useWalletConnectors } from '@phoenix-wallet/core';

function MyComponent() {
  const { connectors, chainConfigs } = useWalletConnectors();
  
  return (
    <div>
      {connectors.map(connector => (
        <div key={connector.id}>{connector.name}</div>
      ))}
    </div>
  );
}
```

### useWalletConnectorEvent

Listen to wallet connector events:

```typescript
import { useWalletConnectorEvent } from '@phoenix-wallet/core';

function MyComponent() {
  useWalletConnectorEvent('metamask-evm', {
    onAccountChanged: (connectorId, address) => {
      console.log('Account changed:', address);
    },
    onChainChanged: (connectorId, chainId) => {
      console.log('Chain changed:', chainId);
    },
    onDisconnect: (connectorId) => {
      console.log('Disconnected');
    }
  });
  
  return <div>Listening to wallet events...</div>;
}
```

### useWalletBase

Base hook for building custom wallet hooks:

```typescript
import { useWalletBase } from '@phoenix-wallet/core';

function useCustomWallet(connectorId: string) {
  return useWalletBase(
    connectorId,
    (connector, address, chainId, chainConfigs) => {
      // Create and return your wallet instance
      return createWalletInstance(connector, address, chainId);
    },
    {
      onAccountChanged: (connectorId, address, wallet) => {
        console.log('Account changed');
      },
      onChainChanged: (connectorId, chainId, wallet) => {
        console.log('Chain changed');
      }
    }
  );
}
```

## Context Provider

### WalletProvider

Wrap your app with the WalletProvider to enable wallet functionality:

```typescript
import { WalletProvider, LogLevel } from '@phoenix-wallet/core';

function App() {
  return (
    <WalletProvider
      connectors={[/* your connectors */]}
      chainConfigs={[/* your chain configs */]}
      loggerConfig={{
        enabled: true,
        level: LogLevel.INFO
      }}
    >
      <YourApp />
    </WalletProvider>
  );
}
```

## Logger

Phoenix Wallet includes a configurable logging system that allows you to control the verbosity of library logs. This is useful for debugging, monitoring, and troubleshooting.

### Quick Start

Enable logging by passing `loggerConfig` to the `WalletProvider`:

```typescript
import { WalletProvider, LogLevel } from '@phoenix-wallet/core';

<WalletProvider
  connectors={connectors}
  chainConfigs={chainConfigs}
  loggerConfig={{
    enabled: true,
    level: LogLevel.INFO,
    prefix: '[Phoenix Wallet]'
  }}
>
  {children}
</WalletProvider>
```

### Log Levels

```typescript
enum LogLevel {
  NONE = 0,    // No logs
  ERROR = 1,   // Only errors
  WARN = 2,    // Warnings and errors
  INFO = 3,    // Info, warnings, and errors (default)
  DEBUG = 4,   // All logs including debug messages
}
```

### Examples

**Development Mode (All Logs):**
```typescript
loggerConfig={{ enabled: true, level: LogLevel.DEBUG }}
```

**Production Mode (Errors Only):**
```typescript
loggerConfig={{ enabled: true, level: LogLevel.ERROR }}
```

**Disabled (Default):**
```typescript
// Simply omit loggerConfig or set enabled: false
loggerConfig={{ enabled: false }}
```

### Using Logger Directly

You can also use the logger in your own code:

```typescript
import { logger, LogLevel } from '@phoenix-wallet/core';

// Configure
logger.configure({ enabled: true, level: LogLevel.DEBUG });

// Use
logger.debug('Debug message');
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message', error);
```

For detailed documentation, see [LOGGER.md](./LOGGER.md).

## Types

### ConnectorStatus

```typescript
enum ConnectorStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  UNAVAILABLE = 'unavailable'
}
```

### IChainConfig

```typescript
interface IChainConfig {
  id: string;
  name: string;
  chainId?: number | string;
  rpcUrl?: string;
  nativeCurrency?: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorerUrl?: string;
}
```

## Creating Your Universal useWallet Hook

The `useWalletBase` hook is designed to be wrapped in your application to create a universal wallet hook that works across all chains. Here's how to create your own `useWallet` hook:

### Step 1: Create `src/hooks/useWallet.ts`

```typescript
import { 
  useWalletBase, 
  ChainType, 
  type UseWalletCallbacks, 
  type WalletState,
  type IConnector,
  type IChainConfig
} from '@phoenix-wallet/core';
import { EvmWallet, EvmChain, EvmConnector } from '@phoenix-wallet/evm';
import { SolanaWallet, SolanaChain, SolanaConnector } from '@phoenix-wallet/solana';
import { AptosWallet, AptosChain, AptosConnector } from '@phoenix-wallet/aptos';
import { SuiWallet, SuiChain, SuiConnector } from '@phoenix-wallet/sui';

/**
 * Universal wallet hook - works with any chain
 * Just pass the connectorId and it automatically handles the rest!
 * 
 * @example
 * ```tsx
 * // Works for any chain!
 * const { wallet, connect, disconnect, isConnected } = useWallet('metamask-evm');
 * const { wallet, connect, disconnect, isConnected } = useWallet('phantom-solana');
 * const { wallet, connect, disconnect, isConnected } = useWallet('petra-aptos');
 * const { wallet, connect, disconnect, isConnected } = useWallet('phantom-sui');
 * ```
 */
export function useWallet<W = any>(
  connectorId: string,
  callbacks?: UseWalletCallbacks<any>
): WalletState<W> {
  return useWalletBase<any>(
    connectorId,
    (connector: IConnector, address: string, chainId: string, chainConfigs: IChainConfig[]) => {
      try {
        // Find the chain config from the provided chainConfigs
        const chainConfig = chainConfigs.find(
          (c) => c.id === chainId || c.chainId?.toString() === chainId
        );

        if (!chainConfig) {
          console.warn(`Chain with ID ${chainId} not found in chainConfigs`);
          return null;
        }

        // Create the appropriate wallet based on chain type
        switch (connector.chainType) {
          case ChainType.EVM: {
            const evmConnector = connector as EvmConnector;
            const evmChain = new EvmChain(chainConfig.name, chainConfig as any);
            const walletClient = (evmConnector as any).createWalletClient(evmChain);
            return new EvmWallet(address, evmChain, evmConnector, walletClient) as any;
          }

          case ChainType.SOLANA: {
            const solanaConnector = connector as SolanaConnector;
            const solanaChain = new SolanaChain(chainConfig.name, chainConfig as any);
            const walletClient = (solanaConnector as any).createWalletClient(solanaChain);
            return new SolanaWallet(address, solanaChain, solanaConnector, walletClient) as any;
          }

          case ChainType.APTOS: {
            const aptosConnector = connector as AptosConnector;
            const aptosChain = new AptosChain(chainConfig.name, chainConfig as any);
            const walletClient = (aptosConnector as any).createWalletClient(aptosChain);
            return new AptosWallet(address, aptosChain, aptosConnector, walletClient) as any;
          }

          case ChainType.SUI: {
            const suiConnector = connector as SuiConnector;
            const suiChain = new SuiChain(chainConfig.name, chainConfig as any);
            const walletClient = (suiConnector as any).createWalletClient(suiChain);
            return new SuiWallet(address, suiChain, suiConnector, walletClient) as any;
          }

          default:
            console.warn(`Unsupported chain type: ${connector.chainType}`);
            return null;
        }
      } catch (error) {
        console.error('Failed to create wallet:', error);
        return null;
      }
    },
    callbacks
  );
}
```

### Step 2: Use Your Universal Hook

Now you can use the same hook for all chains:

```typescript
import { useWallet } from '@/hooks/useWallet';

function MyComponent() {
  // EVM wallet (MetaMask, Coinbase, etc.)
  const { 
    wallet: evmWallet, 
    isConnected: evmConnected,
    connect: connectEvm,
    disconnect: disconnectEvm 
  } = useWallet('metamask-evm');

  // Solana wallet (Phantom, Solflare, etc.)
  const { 
    wallet: solWallet, 
    isConnected: solConnected,
    connect: connectSol 
  } = useWallet('phantom-solana');

  // Aptos wallet (Petra, Pontem, etc.)
  const { 
    wallet: aptWallet, 
    isConnected: aptConnected,
    connect: connectApt 
  } = useWallet('petra-aptos');

  // Sui wallet (Phantom, Suiet, etc.)
  const { 
    wallet: suiWallet, 
    isConnected: suiConnected,
    connect: connectSui 
  } = useWallet('phantom-sui');

  return (
    <div>
      {/* All wallets use the same interface! */}
      <button onClick={connectEvm}>Connect MetaMask</button>
      <button onClick={connectSol}>Connect Phantom (Solana)</button>
      <button onClick={connectApt}>Connect Petra</button>
      <button onClick={connectSui}>Connect Phantom (Sui)</button>
    </div>
  );
}
```

### Step 3: Use Wallet Methods

All wallets share the same interface:

```typescript
const { wallet, isConnected } = useWallet('metamask-evm');

if (isConnected && wallet) {
  // Get balance (works for all chains)
  const balance = await wallet.getBalance();
  
  // Sign message (works for all chains)
  const signature = await wallet.signMessage('Hello, World!');
  
  // Send transaction (works for all chains)
  const txHash = await wallet.sendTransaction(transaction);
}
```

### Why Create Your Own Hook?

1. **Flexibility**: You control the wallet creation logic
2. **Customization**: Add your own error handling, logging, or analytics
3. **Type Safety**: Customize types for your specific needs
4. **Chain Support**: Only include chains you actually use
5. **Bundle Size**: Tree-shaking removes unused chain packages

### Alternative: Chain-Specific Hooks

If you only need one chain, you can create a simpler hook:

```typescript
// src/hooks/useEvmWallet.ts
import { useWalletBase, type UseWalletCallbacks } from '@phoenix-wallet/core';
import { EvmWallet, EvmChain, EvmConnector } from '@phoenix-wallet/evm';

export function useEvmWallet(
  connectorId: string,
  callbacks?: UseWalletCallbacks<EvmWallet>
) {
  return useWalletBase<EvmWallet>(
    connectorId,
    (connector, address, chainId, chainConfigs) => {
      const chainConfig = chainConfigs.find(c => c.id === chainId);
      if (!chainConfig) return null;
      
      const evmConnector = connector as EvmConnector;
      const evmChain = new EvmChain(chainConfig.name, chainConfig as any);
      const walletClient = (evmConnector as any).createWalletClient(evmChain);
      return new EvmWallet(address, evmChain, evmConnector, walletClient);
    },
    callbacks
  );
}
```

## Usage with Chain-Specific Packages

This core package is designed to be used alongside chain-specific packages:

```typescript
import { WalletProvider, ChainType } from '@phoenix-wallet/core';
import { MetamaskEvmConnector } from '@phoenix-wallet/evm';
import { SolanaConnector } from '@phoenix-wallet/solana';
import { PetraAptosConnector } from '@phoenix-wallet/aptos';
import { SuiStandardConnnector } from '@phoenix-wallet/sui';

const connectors = [
  new MetamaskEvmConnector(/* config */),
  new SolanaConnector(/* config */),
  new PetraAptosConnector(/* config */),
  new SuiStandardConnnector(/* config */)
];

function App() {
  return (
    <WalletProvider connectors={connectors} chainConfigs={chainConfigs}>
      <YourApp />
    </WalletProvider>
  );
}
```

## Related Packages

- [@phoenix-wallet/evm](../evm) - EVM blockchain support (Ethereum, BSC, Polygon, etc.)
- [@phoenix-wallet/solana](../solana) - Solana blockchain support
- [@phoenix-wallet/aptos](../aptos) - Aptos blockchain support
- [@phoenix-wallet/sui](../sui) - Sui blockchain support
- [@phoenix-wallet/privy](../privy) - Privy authentication integration

## License

MIT

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a PR.
