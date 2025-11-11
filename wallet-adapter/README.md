# 🦅 Phoenix Wallet

A unified multi-chain wallet adapter for Web3 applications. Phoenix Wallet provides a consistent interface for connecting to wallets across different blockchain ecosystems.

## ✨ Features

- 🌐 **Universal Browser Support** - Dual ESM/CJS builds for maximum compatibility
- 🔗 **Multi-Chain** - Support for EVM, Solana, Aptos, Sui blockchains
- 📦 **Tree-Shakeable** - Optimized bundle sizes with zero side effects
- 🎯 **TypeScript First** - Full type safety and IntelliSense support
- ⚡ **Modern & Fast** - Built with ES2020, optimized for performance
- 🔌 **Framework Agnostic** - Works with Next.js, Vite, CRA, and more
- 📝 **Configurable Logger** - Built-in logging system with multiple log levels for debugging

## 📦 Packages

This monorepo contains the following packages:

- **[@phoenix-wallet/core](https://npmjs.com/package/@phoenix-wallet/core)** - Core interfaces and utilities
- **[@phoenix-wallet/evm](https://npmjs.com/package/@phoenix-wallet/evm)** - EVM chain support (Ethereum, BSC, Polygon, etc.)
- **[@phoenix-wallet/aptos](https://npmjs.com/package/@phoenix-wallet/aptos)** - Aptos blockchain support
- **[@phoenix-wallet/solana](https://npmjs.com/package/@phoenix-wallet/solana)** - Solana blockchain support
- **[@phoenix-wallet/sui](https://npmjs.com/package/@phoenix-wallet/sui)** - Sui blockchain support
- **[@phoenix-wallet/privy](https://npmjs.com/package/@phoenix-wallet/privy)** - Privy embedded wallet integration

## 🚀 Quick Start

### Installation

```bash
# Install core package
npm install @phoenix-wallet/core

# Install chain-specific packages
npm install @phoenix-wallet/evm
npm install @phoenix-wallet/aptos
npm install @phoenix-wallet/solana
npm install @phoenix-wallet/sui
```

### Usage

```typescript
import { useWallet } from '@phoenix-wallet/core';
import { EvmWallet } from '@phoenix-wallet/evm';

function MyComponent() {
  const { connect, disconnect, account } = useWallet();

  return (
    <div>
      {account ? (
        <button onClick={disconnect}>Disconnect</button>
      ) : (
        <button onClick={() => connect(EvmWallet)}>Connect Wallet</button>
      )}
    </div>
  );
}
```

## 🛠️ Development

### Setup

```bash
# Install dependencies
pnpm install

# Build all packages
npm run packages:build

# Run in development mode
npm run packages:dev
```

### Demo Application

This repo includes a Next.js demo application:

```bash
# Run demo app
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the demo.

## 📝 Logger

Phoenix Wallet includes a configurable logging system for debugging and monitoring:

```typescript
import { LogLevel } from '@phoenix-wallet/core';

<ClientWalletProvider
  appId={appId}
  loggerConfig={{
    enabled: true,
    level: LogLevel.INFO
  }}
>
  {children}
</ClientWalletProvider>
```

**Log Levels:** NONE, ERROR, WARN, INFO, DEBUG

**Documentation:**
- [Quick Start Guide](./QUICK_START_LOGGER.md) - Get started in 2 minutes
- [Usage Examples](./LOGGER_USAGE_EXAMPLE.md) - Comprehensive examples
- [Implementation Details](./LOGGER_IMPLEMENTATION_SUMMARY.md) - Technical overview
- [Core Logger Docs](./packages/core/LOGGER.md) - Full API reference

## 📚 Documentation

### Connector Development
- **[📖 Connector Documentation Hub](./packages/docs/)** - Complete guide to creating wallet connectors
  - [Create New Connector](./packages/docs/CREATE_NEW_CONNECTOR.md) - Step-by-step implementation guide
  - [Connector Architecture](./packages/docs/CONNECTOR_ARCHITECTURE.md) - Deep dive into system design
  - [Connector Examples](./packages/docs/CONNECTOR_EXAMPLES.md) - Real-world implementation patterns
  - [Quick Reference](./packages/docs/QUICK_REFERENCE.md) - Fast reference for common tasks

### General Documentation
- [Browser Support](./BROWSER_SUPPORT.md) - ESM/CJS dual build and browser compatibility
- [Hướng Dẫn Publish](./HUONG_DAN_PUBLISH.md) - Vietnamese publishing guide
- [Quick Publish Guide](./QUICK_PUBLISH.md) - Quick reference
- [Troubleshooting](./TROUBLESHOOTING.md) - Common issues and solutions

## 📤 Publishing

```bash
# 1. Check if ready
npm run publish:check

# 2. Bump version (optional)
npm run version:bump patch

# 3. Publish all packages
npm run publish:all
```

See [HUONG_DAN_PUBLISH.md](./HUONG_DAN_PUBLISH.md) for detailed guide.

## 🏗️ Project Structure

```
build-wallet/
├── packages/           # NPM packages
│   ├── core/          # Core package
│   ├── evm/           # EVM support
│   ├── aptos/         # Aptos support
│   ├── solana/        # Solana support
│   ├── sui/           # Sui support
│   └── privy/         # Privy integration
├── src/               # Demo application
│   ├── app/           # Next.js app
│   ├── contracts/     # Contract examples
│   └── hooks/         # React hooks
└── scripts/           # Publishing scripts
```

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

## 🔗 Links

- [NPM Organization](https://www.npmjs.com/org/phoenix-wallet)
- [Documentation](./packages/core/README.md)
- [Issues](https://github.com/your-org/phoenix-wallet/issues)
