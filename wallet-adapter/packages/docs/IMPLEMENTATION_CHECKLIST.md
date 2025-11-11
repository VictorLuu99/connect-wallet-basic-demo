# Connector Implementation Checklist

Use this checklist when implementing a new wallet connector for Phoenix Wallet.

## Pre-Implementation

- [ ] Research wallet documentation
- [ ] Identify wallet type (EVM, Solana, or custom chain)
- [ ] Check if wallet uses SDK or direct browser injection
- [ ] Determine supported chains/networks
- [ ] Find wallet logo URL or base64 data URI
- [ ] Get wallet installation/download link

## File Creation

- [ ] Create connector file: `packages/{chain}/src/connectors/{WalletName}Connector.ts`
- [ ] Choose appropriate base class:
  - [ ] `EvmConnector` for Ethereum-compatible wallets
  - [ ] `SolanaConnector` for Solana wallets
  - [ ] `Connector` for custom blockchains

## Required Implementations

### Constructor
- [ ] Define unique connector ID (lowercase, no spaces)
- [ ] Set wallet display name
- [ ] Set wallet logo URL
- [ ] Pass dapp metadata
- [ ] Pass supported chain IDs array

### Provider Detection
- [ ] Implement `get provider()` method
- [ ] Handle multiple provider injection scenarios
- [ ] Add TypeScript window interface extensions if needed
- [ ] Test provider detection in browser

### Installation Check
- [ ] Implement `async isInstalled()` method
- [ ] Return `true` if wallet is installed
- [ ] Return `false` if wallet is not installed
- [ ] Handle browser environment check (`typeof window !== 'undefined'`)

### Installation Link
- [ ] Implement `get installLink()` property
- [ ] Return valid URL to wallet download page

## Optional Implementations

### SDK Integration
- [ ] Override `init()` method if SDK required
- [ ] Initialize SDK in `init()`
- [ ] Call `await super.init()` after SDK setup
- [ ] Override `disconnect()` for SDK cleanup if needed

### Custom Reconnection
- [ ] Override `checkStoredConnection()` if needed
- [ ] Implement custom localStorage handling
- [ ] Handle edge cases (stored but not actually connected)

### Event Handling
- [ ] Override `handleEventChainChanged()` if needed
- [ ] Override `handleEventAccountChanged()` if needed
- [ ] Store additional state in localStorage if required

## Code Quality

- [ ] Add proper TypeScript types
- [ ] Add JSDoc comments for public methods
- [ ] Handle error cases gracefully
- [ ] Add defensive null checks
- [ ] Use logger for debugging information

## Export & Build

- [ ] Export connector from package index file
  - [ ] Add export line to `packages/{chain}/src/index.ts`
- [ ] Build package: `npm run packages:build`
- [ ] Verify no TypeScript errors
- [ ] Verify no build errors

## Testing - Demo App Configuration

- [ ] Import connector in `src/app/wallet-config.ts`
- [ ] Create connector instance with:
  - [ ] Dapp metadata
  - [ ] Supported chain IDs array
- [ ] Add to appropriate connectors array (`evmConnectors`, etc.)

## Testing - Connection Flow

- [ ] Start demo app: `npm run dev`
- [ ] Open http://localhost:3000
- [ ] Enable debug logging if needed
- [ ] Click connector button
- [ ] Verify wallet popup appears
- [ ] Approve connection in wallet
- [ ] Verify address displays correctly in UI
- [ ] Verify connection status updates correctly

## Testing - Disconnection

- [ ] Click disconnect button
- [ ] Verify UI updates to disconnected state
- [ ] Verify localStorage cleared
- [ ] Verify wallet disconnects (if applicable)
- [ ] Verify no console errors

## Testing - Account Switching

- [ ] Switch account in wallet
- [ ] Verify UI updates with new address
- [ ] Verify connect event fires
- [ ] Check console logs for event handling

## Testing - Network Switching

- [ ] Switch network/chain in wallet
- [ ] Verify chain changed event fires
- [ ] Verify UI updates if needed
- [ ] Check console logs for event handling

## Testing - Page Reload

- [ ] Keep wallet connected
- [ ] Reload page
- [ ] Verify auto-reconnection works
- [ ] Verify correct address displays
- [ ] Verify correct connection status
- [ ] Check stored connection in localStorage

## Testing - Installation Detection

- [ ] Test with wallet installed
  - [ ] Verify `isInstalled()` returns `true`
  - [ ] Verify connector button shows as available
- [ ] Test with wallet not installed (if possible)
  - [ ] Verify `isInstalled()` returns `false`
  - [ ] Verify install link works when clicked

## Testing - Error Scenarios

- [ ] Test with wallet locked
- [ ] Test connection rejection
- [ ] Test with no accounts
- [ ] Test network not supported by wallet
- [ ] Verify error messages are clear
- [ ] Verify no crashes or undefined errors

## Documentation

- [ ] Add connector to package README if needed
- [ ] Document any special requirements
- [ ] Document supported chains
- [ ] Note any known limitations
- [ ] Add troubleshooting tips if applicable

## Code Review Checklist

- [ ] Code follows existing patterns
- [ ] No hardcoded values (use configuration)
- [ ] Proper error handling
- [ ] TypeScript types are accurate
- [ ] No console.log statements (use logger)
- [ ] No security vulnerabilities
- [ ] Follows wallet adapter best practices

## Final Verification

- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] No console errors in demo app
- [ ] Package builds successfully
- [ ] Connection flow works end-to-end
- [ ] Reconnection works after reload
- [ ] Events fire correctly
- [ ] UI updates properly

## Submission Checklist

- [ ] Create feature branch
- [ ] Commit connector implementation
- [ ] Update package version if needed
- [ ] Create pull request
- [ ] Add description of connector
- [ ] Note tested chains/networks
- [ ] Tag reviewers

---

## Quick Implementation Template

Copy this template for quick implementation:

```typescript
import { DappMetadata } from '@phoenix-wallet/core';
import { EvmConnector } from './EvmConnector';

// TypeScript declarations
declare global {
  interface Window {
    myWallet?: {
      ethereum?: any;
    };
  }
}

export class MyWalletEvmConnector extends EvmConnector {
  constructor(dappMetadata: DappMetadata, supportedChains: string[]) {
    super(
      'mywalletevm',              // TODO: Unique ID
      {
        name: 'MyWallet',         // TODO: Display name
        logo: 'https://...',      // TODO: Logo URL
      },
      dappMetadata,
      supportedChains
    );
  }

  get provider(): any {
    // TODO: Implement provider detection
    if (typeof window !== 'undefined') {
      return window.myWallet?.ethereum;
    }
    return null;
  }

  async isInstalled(): Promise<boolean> {
    // TODO: Implement installation check
    return typeof window !== 'undefined' &&
           Boolean(window.myWallet?.ethereum);
  }

  get installLink(): string {
    // TODO: Add download link
    return 'https://mywallet.io/download';
  }
}
```

Then:
1. Replace `myWallet` with actual wallet property
2. Export from `packages/evm/src/index.ts`
3. Build and test

---

## Need Help?

Refer to:
- **[CREATE_NEW_CONNECTOR.md](./CREATE_NEW_CONNECTOR.md)** - Full implementation guide
- **[CONNECTOR_EXAMPLES.md](./CONNECTOR_EXAMPLES.md)** - Real examples
- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Quick lookup
- **[CONNECTOR_ARCHITECTURE.md](./CONNECTOR_ARCHITECTURE.md)** - Deep dive

Good luck! 🚀
