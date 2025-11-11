# Phoenix Wallet Connector Documentation

Comprehensive documentation for creating and understanding wallet connectors in the Phoenix Wallet system.

## 📚 Documentation Index

### Getting Started

**[IMPLEMENTATION_CHECKLIST.md](./IMPLEMENTATION_CHECKLIST.md)** ⭐ - Step-by-step checklist for connector development
- Pre-implementation checklist
- Required implementations
- Testing procedures
- Code review checklist
- Quick implementation template

**[CREATE_NEW_CONNECTOR.md](./CREATE_NEW_CONNECTOR.md)** - Complete guide to creating new wallet connectors
- Step-by-step implementation guide
- EVM and Solana connector patterns
- Testing and validation procedures
- Common patterns and best practices
- Implementation examples

### Architecture & Design

**[CONNECTOR_ARCHITECTURE.md](./CONNECTOR_ARCHITECTURE.md)** - Deep dive into connector architecture
- System architecture overview
- Connector lifecycle management
- Event system and callbacks
- Connection state management
- Provider detection patterns
- Client creation (viem, Solana)

### Examples & Patterns

**[CONNECTOR_EXAMPLES.md](./CONNECTOR_EXAMPLES.md)** - Real-world implementation examples
- Simple EVM connectors
- SDK-based connectors (MetaMask)
- Multi-provider connectors (Coinbase)
- Solana connectors
- Custom chain connectors (Aptos)
- Advanced patterns (polling, error recovery, multi-chain)

---

## Quick Links

### For New Contributors

Start here if you want to add a new wallet connector:

1. Read [CREATE_NEW_CONNECTOR.md](./CREATE_NEW_CONNECTOR.md) for implementation guide
2. Review [CONNECTOR_EXAMPLES.md](./CONNECTOR_EXAMPLES.md) for similar wallet examples
3. Check [CONNECTOR_ARCHITECTURE.md](./CONNECTOR_ARCHITECTURE.md) if you need deeper understanding

### For Maintainers

Reference documentation for architecture decisions and system design:

1. [CONNECTOR_ARCHITECTURE.md](./CONNECTOR_ARCHITECTURE.md) - System design and event flow
2. [CONNECTOR_EXAMPLES.md](./CONNECTOR_EXAMPLES.md) - Pattern library and best practices

---

## Connector Development Workflow

### 1. Planning Phase

- Identify wallet type (EVM, Solana, or custom chain)
- Research wallet's provider API and detection method
- Determine if SDK is required
- Check supported chains/networks

### 2. Implementation Phase

- Create connector file in appropriate package
- Extend base class (`EvmConnector`, `SolanaConnector`, or `Connector`)
- Implement required methods:
  - `provider` getter
  - `isInstalled()`
  - `installLink` getter
- Add optional overrides if needed:
  - `init()` for SDK setup
  - `disconnect()` for cleanup
  - `checkStoredConnection()` for custom reconnection
- Export from package index

### 3. Testing Phase

- Add to demo app configuration
- Test connection flow
- Test account switching
- Test network switching
- Test disconnection
- Test page reload reconnection
- Verify with debug logging

### 4. Documentation Phase

- Add connector to package README
- Document any special requirements
- Note supported chains
- Add troubleshooting tips if applicable

---

## Key Concepts

### Connector Types

| Type | Base Class | Used For | Examples |
|------|-----------|----------|----------|
| **EVM** | `EvmConnector` | Ethereum-compatible chains | MetaMask, Coinbase, Phantom |
| **Solana** | `SolanaConnector` | Solana blockchain | Phantom, Backpack, Solflare |
| **Custom** | `Connector` | Other blockchains | Aptos, Sui connectors |

### Provider Detection

Connectors detect wallets through browser injection:

```typescript
// Simple detection
get provider() {
  return window.myWallet?.ethereum;
}

// Multi-provider detection
get provider() {
  if (window.ethereum?.providers) {
    return window.ethereum.providers.find(p => p.isMyWallet);
  }
  return window.ethereum?.isMyWallet ? window.ethereum : null;
}
```

### Event System

Connectors emit events through callbacks:

- **onConnect** - Wallet connected successfully
- **onDisconnect** - Wallet disconnected
- **onChainChanged** - Network switched
- **onAccountChanged** - Account switched

### Connection Lifecycle

```
Disconnected → Connecting → Connected
     ↑                          ↓
     └──────── Disconnecting ←──┘
```

Each state transition fires events to update UI.

---

## Architecture Overview

```
┌─────────────────────────────────────┐
│  React Application                  │
│  - useWalletBase()                  │
│  - useWalletConnectors()            │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│  WalletProvider Context             │
│  - Manages connectors               │
│  - Tracks statuses                  │
│  - Handles callbacks                │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│  Connector Layer                    │
│  - EvmConnector                     │
│  - SolanaConnector                  │
│  - Custom Connectors                │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│  Wallet Provider                    │
│  - window.ethereum                  │
│  - window.solana                    │
│  - SDK providers                    │
└─────────────────────────────────────┘
```

---

## Common Patterns

### Pattern 1: Simple EVM Connector

```typescript
export class SimpleWalletConnector extends EvmConnector {
  constructor(dappMetadata: DappMetadata, supportedChains: string[]) {
    super('simplewallet', { name: 'SimpleWallet', logo: '...' }, dappMetadata, supportedChains);
  }

  get provider() {
    return window.simpleWallet?.ethereum;
  }

  async isInstalled() {
    return Boolean(window.simpleWallet);
  }

  get installLink() {
    return 'https://simplewallet.io/download';
  }
}
```

### Pattern 2: SDK-Based Connector

```typescript
export class SdkWalletConnector extends EvmConnector {
  private sdk: WalletSDK | null = null;

  async init() {
    if (this.sdk) return;
    this.sdk = new WalletSDK({ /* config */ });
    await this.sdk.init();
    await super.init();
  }

  get provider() {
    return this.sdk?.getProvider();
  }

  async disconnect() {
    await this.sdk?.terminate();
    await super.disconnect();
  }
}
```

### Pattern 3: Multi-Provider Connector

```typescript
export class MultiWalletConnector extends EvmConnector {
  private findProvider() {
    // Priority 1: Dedicated property
    if (window.multiWalletExtension) return window.multiWalletExtension;

    // Priority 2: Providers array
    if (window.ethereum?.providers) {
      return window.ethereum.providers.find(p => p.isMultiWallet);
    }

    // Priority 3: Standard ethereum
    if (window.ethereum?.isMultiWallet) return window.ethereum;

    return null;
  }

  get provider() {
    return this.findProvider();
  }
}
```

---

## Troubleshooting

### Common Issues

**Provider not detected:**
- Check if wallet is installed
- Verify provider injection timing
- Try initializing in `init()` method
- Check for naming conflicts with other wallets

**Events not firing:**
- Ensure `super.init()` is called after custom initialization
- Verify event listener setup in `setupEventListeners()`
- Check if provider supports events

**Reconnection not working:**
- Implement `checkStoredConnection()` if using custom logic
- Verify localStorage keys are correct
- Check `isConnected()` implementation

**Multiple connectors interfere:**
- Use unique connector IDs
- Implement specific provider detection
- Check provider priority in multi-provider scenarios

---

## Contributing

When adding new connectors:

1. Follow existing naming conventions
2. Add comprehensive TypeScript types
3. Include error handling
4. Test all connection scenarios
5. Document wallet-specific quirks
6. Update relevant README files

---

## Additional Resources

### Core Interfaces

- `packages/core/src/interfaces/IConnector.ts` - Connector interface
- `packages/core/src/interfaces/IWallet.ts` - Wallet interface
- `packages/core/src/interfaces/Chain.ts` - Chain interface

### Base Implementations

- `packages/evm/src/connectors/EvmConnector.ts` - EVM base class
- `packages/solana/src/connectors/SolanaConnector.ts` - Solana base class
- `packages/core/src/utils/CallbackManager.ts` - Event management

### Example Implementations

- `packages/evm/src/connectors/` - Various EVM wallet connectors
- `packages/solana/src/connectors/` - Solana wallet connectors
- `packages/aptos/src/connectors/` - Aptos wallet connectors

### Demo Application

- `src/app/wallet-config.ts` - Connector configuration
- `src/app/SimpleWalletConnect.tsx` - Connection UI component
- `src/app/ClientWalletProvider.tsx` - Provider setup

---

## Questions?

For additional help:

1. Review existing connector implementations
2. Check the main [CLAUDE.md](../../CLAUDE.md) for project overview
3. Enable debug logging: `LogLevel.DEBUG`
4. Open an issue with specific questions
