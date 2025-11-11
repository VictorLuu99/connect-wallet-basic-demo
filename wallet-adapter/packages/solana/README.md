# @phoenix-wallet/solana

Solana blockchain support for Phoenix Wallet - comprehensive wallet adapter for Solana ecosystem.

## Overview

This package provides full support for Solana blockchain, including wallet connectors compatible with Solana's wallet-standard and popular Solana wallets.

## Features

- 🔌 **Wallet-Standard Compatible**: Full support for Solana wallet-standard
- 🦊 **Popular Wallets**: Phantom, Solflare, Backpack, and more via wallet-standard
- 🔄 **Cluster Support**: Mainnet, Devnet, Testnet, and custom clusters
- 📝 **Transaction Support**: Legacy and Versioned transactions
- 🔐 **Signing**: Message and transaction signing
- 💰 **SPL Tokens**: Built-in SPL token support
- ⚡ **Fast**: Optimized for Solana's high-speed transactions

## Installation

```bash
# Using pnpm (recommended)
pnpm add @phoenix-wallet/core @phoenix-wallet/solana @solana/web3.js @solana/spl-token

# Using npm
npm install @phoenix-wallet/core @phoenix-wallet/solana @solana/web3.js @solana/spl-token

# Using yarn
yarn add @phoenix-wallet/core @phoenix-wallet/solana @solana/web3.js @solana/spl-token
```

## Quick Start

### Basic Setup

```typescript
import { WalletProvider } from '@phoenix-wallet/core';
import { SolanaConnector, SolanaCluster } from '@phoenix-wallet/solana';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';

const solanaChainConfigs = [
  {
    id: 'solana_mainnet',
    name: 'Solana Mainnet',
    chainId: 'mainnet-beta',
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    nativeCurrency: {
      name: 'SOL',
      symbol: 'SOL',
      decimals: 9
    },
    blockExplorerUrl: 'https://explorer.solana.com'
  },
  {
    id: 'solana_devnet',
    name: 'Solana Devnet',
    chainId: 'devnet',
    rpcUrl: 'https://api.devnet.solana.com',
    nativeCurrency: {
      name: 'SOL',
      symbol: 'SOL',
      decimals: 9
    },
    blockExplorerUrl: 'https://explorer.solana.com?cluster=devnet'
  }
];

const connectors = [
  new SolanaConnector({
    id: 'phantom-solana',
    name: 'Phantom',
    logo: 'https://phantom.app/img/logo.png',
    adapter: new PhantomWalletAdapter(),
    cluster: SolanaCluster.MAINNET,
    dappMetadata: {
      name: 'My DApp',
      url: 'https://mydapp.com',
      icon: 'https://mydapp.com/icon.png'
    }
  })
];

function App() {
  return (
    <WalletProvider connectors={connectors} chainConfigs={solanaChainConfigs}>
      <YourApp />
    </WalletProvider>
  );
}
```

### Using the Wallet

```typescript
import { useWallet } from '@/hooks/useWallet';
import { 
  SystemProgram, 
  Transaction, 
  PublicKey,
  LAMPORTS_PER_SOL 
} from '@solana/web3.js';

function WalletComponent() {
  const { 
    wallet, 
    isConnected, 
    address, 
    connect, 
    disconnect 
  } = useWallet('phantom-solana');

  const handleConnect = async () => {
    await connect();
  };

  const handleSignMessage = async () => {
    if (!wallet) return;
    const message = new TextEncoder().encode('Hello, Solana!');
    const signature = await wallet.signMessage(message);
    console.log('Signature:', signature);
  };

  const handleSendSOL = async () => {
    if (!wallet) return;
    
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(address),
        toPubkey: new PublicKey('recipient_address'),
        lamports: 0.1 * LAMPORTS_PER_SOL // 0.1 SOL
      })
    );
    
    const txHash = await wallet.sendTransaction(transaction);
    console.log('Transaction hash:', txHash);
  };

  return (
    <div>
      {!isConnected ? (
        <button onClick={handleConnect}>Connect Phantom</button>
      ) : (
        <div>
          <p>Connected: {address}</p>
          <button onClick={handleSignMessage}>Sign Message</button>
          <button onClick={handleSendSOL}>Send SOL</button>
          <button onClick={disconnect}>Disconnect</button>
        </div>
      )}
    </div>
  );
}
```

## Supported Wallets

The package supports all wallets that implement Solana's wallet-standard:

- **Phantom** - Most popular Solana wallet
- **Solflare** - Feature-rich Solana wallet
- **Backpack** - Multi-chain wallet with Solana support
- **Glow** - Solana wallet with staking
- **Slope** - Mobile-first Solana wallet
- **Coin98** - Multi-chain wallet
- And any other wallet-standard compatible wallet

### Using Wallet-Standard

```typescript
import { getWallets } from '@wallet-standard/core';
import { isWalletAdapterCompatibleWallet, StandardWalletAdapter } from '@solana/wallet-standard-wallet-adapter-base';
import { SolanaConnector, SolanaCluster } from '@phoenix-wallet/solana';

// Automatically detect all installed wallets
const wallets = getWallets();
const solanaConnectors = wallets
  .get()
  .filter(isWalletAdapterCompatibleWallet)
  .map(wallet => {
    const adapter = new StandardWalletAdapter({ wallet });
    return new SolanaConnector({
      id: `${wallet.name.toLowerCase()}-solana`,
      name: wallet.name,
      logo: wallet.icon,
      adapter: adapter,
      cluster: SolanaCluster.MAINNET,
      dappMetadata: {
        name: 'My DApp',
        url: 'https://mydapp.com'
      }
    });
  });
```

## Cluster Configuration

### Available Clusters

```typescript
enum SolanaCluster {
  MAINNET = 'mainnet-beta',
  DEVNET = 'devnet',
  TESTNET = 'testnet',
  CUSTOM = 'custom'
}
```

### Custom RPC Configuration

```typescript
const connector = new SolanaConnector({
  id: 'phantom-solana',
  name: 'Phantom',
  logo: 'https://phantom.app/img/logo.png',
  adapter: new PhantomWalletAdapter(),
  cluster: SolanaCluster.CUSTOM,
  customRpcUrl: 'https://your-custom-rpc.com',
  dappMetadata: { /* ... */ }
});
```

## Transaction Types

### Legacy Transactions

```typescript
import { Transaction, SystemProgram, PublicKey } from '@solana/web3.js';

const transaction = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: new PublicKey(fromAddress),
    toPubkey: new PublicKey(toAddress),
    lamports: amount
  })
);

const signature = await wallet.sendTransaction(transaction);
```

### Versioned Transactions

```typescript
import { 
  VersionedTransaction, 
  TransactionMessage,
  PublicKey 
} from '@solana/web3.js';

const message = new TransactionMessage({
  payerKey: new PublicKey(address),
  recentBlockhash: blockhash,
  instructions: [/* your instructions */]
}).compileToV0Message();

const transaction = new VersionedTransaction(message);
const signature = await wallet.sendTransaction(transaction);
```

### Sign Multiple Transactions

```typescript
const transactions = [transaction1, transaction2, transaction3];
const signedTransactions = await wallet.signAllTransactions(transactions);
```

## SPL Token Operations

### Transfer SPL Tokens

```typescript
import { 
  getAssociatedTokenAddress,
  createTransferInstruction 
} from '@solana/spl-token';
import { Transaction, PublicKey } from '@solana/web3.js';

async function transferToken(
  wallet: SolanaWallet,
  mintAddress: string,
  toAddress: string,
  amount: number
) {
  const fromTokenAccount = await getAssociatedTokenAddress(
    new PublicKey(mintAddress),
    new PublicKey(wallet.address)
  );
  
  const toTokenAccount = await getAssociatedTokenAddress(
    new PublicKey(mintAddress),
    new PublicKey(toAddress)
  );
  
  const transaction = new Transaction().add(
    createTransferInstruction(
      fromTokenAccount,
      toTokenAccount,
      new PublicKey(wallet.address),
      amount
    )
  );
  
  return await wallet.sendTransaction(transaction);
}
```

## Contract Interactions

### Using SolanaContract

```typescript
import { SolanaContract } from '@phoenix-wallet/solana';

const contract = new SolanaContract(
  programId,
  wallet
);

// Call program
const result = await contract.call('methodName', [param1, param2]);

// Send transaction to program
const txHash = await contract.send('methodName', [param1, param2]);
```

## API Reference

### SolanaWallet

```typescript
class SolanaWallet {
  address: string;
  chain: SolanaChain;
  connector: SolanaConnector;
  walletClient: SolanaWalletClient;
  
  // Get SOL balance
  getBalance(): Promise<string>;
  
  // Sign message
  signMessage(message: Uint8Array): Promise<Uint8Array>;
  
  // Sign transaction
  signTransaction(transaction: Transaction | VersionedTransaction): Promise<Transaction | VersionedTransaction>;
  
  // Sign multiple transactions
  signAllTransactions(transactions: (Transaction | VersionedTransaction)[]): Promise<(Transaction | VersionedTransaction)[]>;
  
  // Send transaction
  sendTransaction(transaction: Transaction | VersionedTransaction): Promise<string>;
  
  // Send raw transaction
  sendRawTransaction(signedTx: string): Promise<string>;
}
```

### SolanaChain

```typescript
class SolanaChain {
  id: string;
  name: string;
  cluster: SolanaCluster;
  rpcUrl: string;
  provider: Connection;
  
  getBalance(address: string): Promise<string>;
  getLatestBlockhash(): Promise<{ blockhash: string; lastValidBlockHeight: number }>;
}
```

## Error Handling

```typescript
try {
  await wallet.sendTransaction(transaction);
} catch (error) {
  if (error.code === 4001) {
    console.log('User rejected the transaction');
  } else if (error.code === -32603) {
    console.log('Transaction simulation failed');
  } else {
    console.error('Transaction failed:', error);
  }
}
```

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import type { 
  SolanaWallet, 
  SolanaChain, 
  SolanaConnector,
  SolanaWalletClient 
} from '@phoenix-wallet/solana';
```

## Related Packages

- [@phoenix-wallet/core](../core) - Core interfaces and types
- [@phoenix-wallet/evm](../evm) - EVM blockchain support
- [@phoenix-wallet/aptos](../aptos) - Aptos blockchain support
- [@phoenix-wallet/sui](../sui) - Sui blockchain support
- [@phoenix-wallet/privy](../privy) - Privy authentication integration

## Resources

- [Solana Documentation](https://docs.solana.com/)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)
- [SPL Token Documentation](https://spl.solana.com/token)
- [Wallet-Standard](https://github.com/wallet-standard/wallet-standard)

## License

MIT

## Support

For issues and questions, please visit our [GitHub repository](https://github.com/your-org/phoenix-wallet).

