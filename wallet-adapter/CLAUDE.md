# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Phoenix Wallet is a unified multi-chain wallet adapter library providing consistent interfaces for connecting to wallets across EVM, Solana, Aptos, and Sui blockchains. The project is structured as a **pnpm monorepo** managed with **Nx**, producing publishable npm packages with dual ESM/CJS builds.

## Development Commands

### Package Development
```bash
# Install dependencies
pnpm install

# Build all packages (required before running demo)
npm run packages:build

# Watch mode for package development
npm run packages:dev

# Clean all package builds
npm run packages:clean

# Type-check a specific package
cd packages/core && pnpm run lint
```

### Demo Application
```bash
# Run Next.js demo app (requires packages to be built first)
npm run dev

# Build demo app for production
npm run build

# Start production server
npm run start
```

### Code Quality
```bash
# Lint all code
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format code with Prettier
npm run format
```

### Publishing Workflow
```bash
# 1. Pre-publish validation
npm run publish:check

# 2. Bump versions (patch/minor/major)
npm run version:bump patch

# 3. Check package integrity
npm run publish:integrity

# 4. Publish all packages to npm
npm run publish:all
```

## Architecture

### Monorepo Structure

```
packages/
├── core/        - Base interfaces, types, context, hooks, and logger
├── evm/         - EVM chain implementations (Ethereum, BSC, Polygon)
├── solana/      - Solana blockchain support
├── aptos/       - Aptos blockchain support
├── sui/         - Sui blockchain support
└── privy/       - Privy embedded wallet integration
```

### Core Architecture Patterns

**1. Abstraction Layer Design**

All chain-specific packages extend core abstractions:
- `IWallet<T, K, Q, M>` - Generic wallet interface with chain-specific transaction types
- `IConnector` - Wallet connection lifecycle (connect, disconnect, events)
- `Chain<T>` - Blockchain configuration and RPC interface
- `IContract<T>` - Smart contract interaction interface

**2. Provider-Consumer Pattern**

The library uses React Context for state management:
- `WalletProvider` (from `@phoenix-wallet/core`) - Root provider managing connectors, chain configs, and connection statuses
- `useWalletBase()` - Base hook providing wallet connection interface
- `useWalletConnectors()` - Hook accessing available connectors and their statuses
- `useWalletConnectorEvent()` - Hook for subscribing to wallet events

**3. Event-Driven Architecture**

Connectors implement a callback system for wallet events:
- `onConnect(connectorId, address, chainId)` - Fired on successful connection
- `onDisconnect(connectorId, address)` - Fired on disconnection
- `onChainChanged(connectorId, chainId)` - Fired on network switch
- `onAccountChanged(connectorId, addresses)` - Fired on account switch

Connectors register/unregister callbacks via `registerConnectorCallback()` and `unregisterConnectorCallback()`.

**4. Logger System**

Centralized logging with configurable levels (NONE, ERROR, WARN, INFO, DEBUG):
```typescript
import { logger, LogLevel } from '@phoenix-wallet/core';

// Configure via provider
<WalletProvider loggerConfig={{ enabled: true, level: LogLevel.INFO }}>

// Use in code
logger.debug('Connection attempt', { connectorId });
logger.error('Connection failed', error);
```

### Build System

**Dual Build Strategy (ESM + CJS)**

Each package uses two TypeScript configs:
- `tsconfig.json` - ESM build (module: ES2020, outDir: ./dist/esm)
- `tsconfig.cjs.json` - CJS build (module: CommonJS, outDir: ./dist/cjs)

Package exports are configured for proper resolution:
```json
{
  "main": "./dist/cjs/src/index.js",
  "module": "./dist/esm/src/index.js",
  "exports": {
    ".": {
      "import": "./dist/esm/src/index.js",
      "require": "./dist/cjs/src/index.js"
    }
  }
}
```

**Workspace References**

- Development uses `workspace:*` dependencies for local linking
- Publishing scripts (`scripts/prepare-publish.js`) replace with actual versions
- After publishing, `scripts/restore-workspace.js` restores workspace references

### TypeScript Configuration

Base config (`tsconfig.base.json`) provides workspace path mappings:
```json
{
  "paths": {
    "@phoenix-wallet/core": ["packages/core/src/index.ts"],
    "@phoenix-wallet/evm": ["packages/evm/src/index.ts"]
    // ... etc
  }
}
```

All packages target ES2020 with strict mode enabled.

## Key Conventions

### Chain Implementation Pattern

When implementing a new chain package:

1. **Create chain config class** extending `Chain<TransactionType>`
2. **Implement wallet class** extending `Wallet<T, K, Q, M>` with:
   - `signMessage()` - Sign arbitrary messages
   - `signTransaction()` - Sign single transaction
   - `sendTransaction()` - Sign and send transaction
   - `signAllTransactions()` - Batch signing
   - `getBalance()` - Fetch native token balance
3. **Create connector classes** implementing `IConnector` for each wallet provider
4. **Export contract utilities** implementing `IContract` for smart contract interaction

### Connector Implementation Pattern

Connectors must:
- Implement `connect()`, `disconnect()`, `isConnected()`, `getChainId()`, `getAddress()`
- Use `CallbackManager` to manage event listeners
- Call `triggerCallback()` for connection lifecycle events
- Handle wallet-specific provider detection and initialization

### Package Development Workflow

1. Make changes in `packages/*/src/`
2. Build with `npm run packages:build` (or use watch mode)
3. Test in demo app at `src/app/`
4. Changes reflect immediately due to TypeScript path mappings

### Testing in Demo App

The Next.js demo (`src/app/`) demonstrates:
- Multi-chain wallet connection (`SimpleWalletConnect.tsx`)
- Wallet status management (`ConnectorItem.tsx`)
- Provider setup (`ClientWalletProvider.tsx`)
- Wallet configuration (`wallet-config.ts`)

Use this as reference for integration patterns.

## Important Notes

- **Always build packages** before running the demo app - the app imports from built dist files in production mode
- **Nx caching** is enabled - use `nx reset` if builds seem stale
- **Publishing is order-dependent** - core must publish before chain packages (handled by scripts)
- **Logger is opt-in** - enable via `loggerConfig` prop in `WalletProvider`
- **Auto-reconnect** is configurable via `reconnect` prop (`'none'` | `'auto'`)

## Connector Development

### Creating New Connectors

**Complete documentation available in [`packages/docs/`](./packages/docs/)**

Quick links:
- **[Create New Connector Guide](./packages/docs/CREATE_NEW_CONNECTOR.md)** - Step-by-step implementation
- **[Connector Architecture](./packages/docs/CONNECTOR_ARCHITECTURE.md)** - System design and event flow
- **[Connector Examples](./packages/docs/CONNECTOR_EXAMPLES.md)** - Real-world patterns
- **[Quick Reference](./packages/docs/QUICK_REFERENCE.md)** - Fast lookup for common tasks

### Quick Pattern Reference

#### Adding a New EVM Connector

```typescript
// packages/evm/src/connectors/MyWalletConnector.ts
export class MyWalletEvmConnector extends EvmConnector {
  constructor(dappMetadata: DappMetadata, supportedChains: string[]) {
    super('mywallet', { name: 'MyWallet', logo: '...' }, dappMetadata, supportedChains);
  }

  get provider() { return window.myWallet?.ethereum; }
  async isInstalled() { return Boolean(window.myWallet); }
  get installLink() { return 'https://mywallet.io/download'; }
}
```

Then export from `packages/evm/src/index.ts` and rebuild.

### Adding a New Chain

1. Create new package: `packages/new-chain/`
2. Copy structure from existing chain package
3. Implement core interfaces (IWallet, IConnector, Chain)
4. Add to workspace path mappings in `tsconfig.base.json`
5. Update root `package.json` dependencies

See [Connector Examples](./packages/docs/CONNECTOR_EXAMPLES.md#custom-chain-connector) for detailed custom chain implementation.

### Debugging Connection Issues

1. Enable debug logging: `loggerConfig={{ enabled: true, level: LogLevel.DEBUG }}`
2. Check connector registration in `WalletProvider`
3. Verify chain configs include correct RPC URLs
4. Use browser console to inspect wallet provider objects
5. Check connector status via `connectorStatuses` from `useWalletConnectors()`

See [Quick Reference](./packages/docs/QUICK_REFERENCE.md#debugging) for more debugging tips.
