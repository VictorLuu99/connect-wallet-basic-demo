# @phoenix-wallet/evm

EVM blockchain support for Phoenix Wallet - supporting Ethereum, BSC, Polygon, and all EVM-compatible chains.

## Overview

This package provides comprehensive support for EVM-compatible blockchains, including wallet connectors for popular wallets like MetaMask, Coinbase Wallet, Rainbow, and more.

## Features

- 🦊 **Multiple Wallet Support**: MetaMask, Coinbase, Phantom, Rainbow, Trust Wallet, OKX, Rabby, Zerion, Binance, MagicEden
- ⛓️ **Multi-Chain**: Support for Ethereum, BSC, Polygon, Arbitrum, Optimism, and any EVM chain
- 🔄 **Chain Switching**: Easy chain switching within wallets
- 📝 **Contract Interactions**: Built-in contract interaction utilities
- 🔐 **Signing**: Message and transaction signing support
- 💰 **Balance Queries**: Native and token balance queries

## Installation

```bash
# Using pnpm (recommended)
pnpm add @phoenix-wallet/core @phoenix-wallet/evm ethers viem

# Using npm
npm install @phoenix-wallet/core @phoenix-wallet/evm ethers viem

# Using yarn
yarn add @phoenix-wallet/core @phoenix-wallet/evm ethers viem
```

## Quick Start

### Basic Setup

```typescript
import { WalletProvider } from '@phoenix-wallet/core';
import { 
  MetamaskEvmConnector,
  CoinbaseEvmConnector,
  PhantomEvmConnector
} from '@phoenix-wallet/evm';

const evmChainConfigs = [
  {
    id: '1',
    name: 'Ethereum Mainnet',
    chainId: 1,
    rpcUrl: 'https://eth.llamarpc.com',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    blockExplorerUrl: 'https://etherscan.io'
  },
  {
    id: '56',
    name: 'BNB Smart Chain',
    chainId: 56,
    rpcUrl: 'https://bsc-dataseed.binance.org',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18
    },
    blockExplorerUrl: 'https://bscscan.com'
  }
];

const connectors = [
  new MetamaskEvmConnector({
    id: 'metamask-evm',
    name: 'MetaMask',
    logo: 'https://metamask.io/images/metamask-logo.png',
    chains: evmChainConfigs,
    dappMetadata: {
      name: 'My DApp',
      url: 'https://mydapp.com',
      icon: 'https://mydapp.com/icon.png'
    }
  }),
  new CoinbaseEvmConnector({
    id: 'coinbase-evm',
    name: 'Coinbase Wallet',
    logo: 'https://coinbase.com/wallet-logo.png',
    chains: evmChainConfigs,
    dappMetadata: {
      name: 'My DApp',
      url: 'https://mydapp.com',
      icon: 'https://mydapp.com/icon.png'
    }
  })
];

function App() {
  return (
    <WalletProvider connectors={connectors} chainConfigs={evmChainConfigs}>
      <YourApp />
    </WalletProvider>
  );
}
```

### Using the Wallet

```typescript
import { useWallet } from '@/hooks/useWallet'; // Your universal wallet hook

function WalletComponent() {
  const { 
    wallet, 
    isConnected, 
    address, 
    connect, 
    disconnect,
    switchChain 
  } = useWallet('metamask-evm');

  const handleConnect = async () => {
    await connect();
  };

  const handleSwitchChain = async () => {
    await switchChain('56'); // Switch to BSC
  };

  const handleSignMessage = async () => {
    if (!wallet) return;
    const signature = await wallet.signMessage('Hello, Web3!');
    console.log('Signature:', signature);
  };

  const handleSendTransaction = async () => {
    if (!wallet) return;
    const txHash = await wallet.sendTransaction({
      to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      value: '0.01', // in ETH
      data: '0x'
    });
    console.log('Transaction hash:', txHash);
  };

  return (
    <div>
      {!isConnected ? (
        <button onClick={handleConnect}>Connect MetaMask</button>
      ) : (
        <div>
          <p>Connected: {address}</p>
          <button onClick={handleSwitchChain}>Switch to BSC</button>
          <button onClick={handleSignMessage}>Sign Message</button>
          <button onClick={handleSendTransaction}>Send Transaction</button>
          <button onClick={disconnect}>Disconnect</button>
        </div>
      )}
    </div>
  );
}
```

## Available Connectors

### MetaMask
```typescript
import { MetamaskEvmConnector } from '@phoenix-wallet/evm';

const metamask = new MetamaskEvmConnector({
  id: 'metamask-evm',
  name: 'MetaMask',
  logo: 'https://metamask.io/images/metamask-logo.png',
  chains: evmChainConfigs,
  dappMetadata: { /* ... */ }
});
```

### Coinbase Wallet
```typescript
import { CoinbaseEvmConnector } from '@phoenix-wallet/evm';

const coinbase = new CoinbaseEvmConnector({
  id: 'coinbase-evm',
  name: 'Coinbase Wallet',
  logo: 'https://coinbase.com/wallet-logo.png',
  chains: evmChainConfigs,
  dappMetadata: { /* ... */ }
});
```

### Phantom
```typescript
import { PhantomEvmConnector } from '@phoenix-wallet/evm';

const phantom = new PhantomEvmConnector({
  id: 'phantom-evm',
  name: 'Phantom',
  logo: 'https://phantom.app/logo.png',
  chains: evmChainConfigs,
  dappMetadata: { /* ... */ }
});
```

### Other Supported Wallets

- **RainbowEvmConnector** - Rainbow Wallet
- **TrustWalletEvmConnector** - Trust Wallet
- **OkxEvmConnector** - OKX Wallet
- **RabbyEvmConnector** - Rabby Wallet
- **ZerionEvmConnector** - Zerion Wallet
- **BinanceEvmConnector** - Binance Wallet
- **MagicEdenEvmConnector** - MagicEden Wallet
- **BitgetEvmConnector** - Bitget Wallet

## Contract Interactions

### Using EvmContract

```typescript
import { EvmContract } from '@phoenix-wallet/evm';

const contract = new EvmContract(
  '0x...', // Contract address
  abi,     // Contract ABI
  wallet   // Your wallet instance
);

// Read from contract
const balance = await contract.call('balanceOf', [address]);

// Write to contract
const txHash = await contract.send('transfer', [
  recipientAddress,
  amount
]);
```

### ERC-20 Token Example

```typescript
const erc20Abi = [
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)'
];

const tokenContract = new EvmContract(
  '0x...', // Token address
  erc20Abi,
  wallet
);

// Get balance
const balance = await tokenContract.call('balanceOf', [userAddress]);

// Transfer tokens
const txHash = await tokenContract.send('transfer', [
  recipientAddress,
  ethers.parseUnits('100', 18) // 100 tokens with 18 decimals
]);
```

## Chain Configuration

### Popular EVM Chains

```typescript
const chains = [
  // Ethereum Mainnet
  {
    id: '1',
    name: 'Ethereum',
    chainId: 1,
    rpcUrl: 'https://eth.llamarpc.com',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorerUrl: 'https://etherscan.io'
  },
  // Polygon
  {
    id: '137',
    name: 'Polygon',
    chainId: 137,
    rpcUrl: 'https://polygon-rpc.com',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    blockExplorerUrl: 'https://polygonscan.com'
  },
  // Arbitrum
  {
    id: '42161',
    name: 'Arbitrum One',
    chainId: 42161,
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorerUrl: 'https://arbiscan.io'
  },
  // Optimism
  {
    id: '10',
    name: 'Optimism',
    chainId: 10,
    rpcUrl: 'https://mainnet.optimism.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorerUrl: 'https://optimistic.etherscan.io'
  }
];
```

## API Reference

### EvmWallet

```typescript
class EvmWallet {
  address: string;
  chain: EvmChain;
  connector: EvmConnector;
  walletClient: WalletClient;
  
  // Get native balance
  getBalance(): Promise<string>;
  
  // Sign message
  signMessage(message: string): Promise<string>;
  
  // Sign transaction
  signTransaction(transaction: EvmTransaction): Promise<string>;
  
  // Send transaction
  sendTransaction(transaction: EvmTransaction): Promise<string>;
  
  // Send raw transaction
  sendRawTransaction(signedTx: string): Promise<string>;
}
```

### EvmTransaction

```typescript
interface EvmTransaction {
  to: string;
  value?: string;      // in ETH
  data?: string;       // hex encoded
  gasLimit?: string;
  gasPrice?: string;
  nonce?: number;
}
```

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import type { 
  EvmWallet, 
  EvmChain, 
  EvmConnector,
  EvmTransaction 
} from '@phoenix-wallet/evm';
```

## Related Packages

- [@phoenix-wallet/core](../core) - Core interfaces and types
- [@phoenix-wallet/solana](../solana) - Solana blockchain support
- [@phoenix-wallet/aptos](../aptos) - Aptos blockchain support
- [@phoenix-wallet/sui](../sui) - Sui blockchain support
- [@phoenix-wallet/privy](../privy) - Privy authentication integration

## License

MIT

## Support

For issues and questions, please visit our [GitHub repository](https://github.com/your-org/phoenix-wallet).

