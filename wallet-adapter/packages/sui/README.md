# @phoenix-wallet/sui

Sui blockchain support for Phoenix Wallet - comprehensive wallet adapter for Sui ecosystem.

## Overview

This package provides full support for Sui blockchain, including wallet connectors compatible with Sui's wallet-standard and popular Sui wallets.

## Features

- 🔌 **Wallet-Standard Compatible**: Full support for Sui wallet-standard
- 🦊 **Popular Wallets**: Phantom, Suiet, Ethos, Martian, and more via wallet-standard
- 🌐 **Network Support**: Mainnet, Testnet, Devnet, Localnet, and custom networks
- 📝 **Transaction Blocks**: Full support for Sui's programmable transaction blocks
- 🔐 **Signing**: Message and transaction signing support
- 💰 **Coin Operations**: Native SUI and custom coin transfers
- ⚡ **Fast**: Optimized for Sui's high-performance blockchain
- 🎁 **Re-exports**: Convenient re-exports of common Sui types

## Installation

```bash
# Using pnpm (recommended)
pnpm add @phoenix-wallet/core @phoenix-wallet/sui @mysten/sui

# Using npm
npm install @phoenix-wallet/core @phoenix-wallet/sui @mysten/sui

# Using yarn
yarn add @phoenix-wallet/core @phoenix-wallet/sui @mysten/sui
```

## Quick Start

### Basic Setup

```typescript
import { WalletProvider } from '@phoenix-wallet/core';
import { 
  SuiStandardConnnector,
  SUI_DEVNET_CHAIN,
  SUI_MAINNET_CHAIN 
} from '@phoenix-wallet/sui';
import { getWallets } from '@wallet-standard/core';

const suiChainConfigs = [
  {
    id: 'sui:mainnet',
    name: 'Sui Mainnet',
    chainId: 'sui:mainnet',
    rpcUrl: 'https://fullnode.mainnet.sui.io:443',
    nativeCurrency: {
      name: 'SUI',
      symbol: 'SUI',
      decimals: 9
    },
    blockExplorerUrl: 'https://suiscan.xyz/mainnet'
  },
  {
    id: 'sui:devnet',
    name: 'Sui Devnet',
    chainId: 'sui:devnet',
    rpcUrl: 'https://fullnode.devnet.sui.io:443',
    nativeCurrency: {
      name: 'SUI',
      symbol: 'SUI',
      decimals: 9
    },
    blockExplorerUrl: 'https://suiscan.xyz/devnet'
  }
];

// Automatically detect all installed Sui wallets
const wallets = getWallets();
const connectors = wallets.get().map(wallet => {
  return new SuiStandardConnnector({
    id: `${wallet.name.toLowerCase()}-sui`,
    name: wallet.name,
    logo: wallet.icon,
    adapter: wallet,
    dappMetadata: {
      name: 'My DApp',
      url: 'https://mydapp.com',
      icon: 'https://mydapp.com/icon.png'
    }
  });
});

function App() {
  return (
    <WalletProvider connectors={connectors} chainConfigs={suiChainConfigs}>
      <YourApp />
    </WalletProvider>
  );
}
```

### Using the Wallet

```typescript
import { useWallet } from '@/hooks/useWallet';
import { Transaction } from '@mysten/sui/transactions';

function WalletComponent() {
  const { 
    wallet, 
    isConnected, 
    address, 
    connect, 
    disconnect 
  } = useWallet('phantom-sui');

  const handleConnect = async () => {
    await connect();
  };

  const handleSignMessage = async () => {
    if (!wallet) return;
    const message = new TextEncoder().encode('Hello, Sui!');
    const signature = await wallet.signMessage(message);
    console.log('Signature:', signature);
  };

  const handleTransferSUI = async () => {
    if (!wallet) return;
    
    const tx = new Transaction();
    const [coin] = tx.splitCoins(tx.gas, [1000000000]); // 1 SUI
    tx.transferObjects([coin], 'recipient_address');
    
    const result = await wallet.sendTransaction({
      transaction: tx,
      account: wallet.walletClient.getAccounts()[0],
      chain: wallet.chain.id
    });
    
    console.log('Transaction result:', result);
  };

  return (
    <div>
      {!isConnected ? (
        <button onClick={handleConnect}>Connect Phantom</button>
      ) : (
        <div>
          <p>Connected: {address}</p>
          <button onClick={handleSignMessage}>Sign Message</button>
          <button onClick={handleTransferSUI}>Transfer SUI</button>
          <button onClick={disconnect}>Disconnect</button>
        </div>
      )}
    </div>
  );
}
```

## Supported Wallets

The package supports all wallets that implement Sui's wallet-standard:

- **Phantom** - Multi-chain wallet with Sui support
- **Suiet** - Sui-native wallet
- **Ethos** - User-friendly Sui wallet
- **Martian** - Multi-chain wallet
- **Sui Wallet** - Official Sui wallet
- **Glass Wallet** - Sui wallet with DeFi focus
- And any other wallet-standard compatible wallet

### Manual Wallet Configuration

```typescript
import { PhantomSuiConnector } from '@phoenix-wallet/sui';

const phantom = new PhantomSuiConnector({
  id: 'phantom-sui',
  name: 'Phantom',
  logo: 'https://phantom.app/img/logo.png',
  dappMetadata: {
    name: 'My DApp',
    url: 'https://mydapp.com'
  }
});
```

## Re-exported Types

For convenience, commonly used Sui types are re-exported:

```typescript
import { 
  SUI_DEVNET_CHAIN,
  SUI_TESTNET_CHAIN,
  SUI_MAINNET_CHAIN,
  SUI_LOCALNET_CHAIN,
  SUI_CHAINS,
  type Wallet,
  type WalletAccount
} from '@phoenix-wallet/sui';
```

## Network Configuration

### Pre-configured Networks

```typescript
import { 
  SUI_MAINNET_CHAIN,
  SUI_TESTNET_CHAIN,
  SUI_DEVNET_CHAIN,
  SUI_LOCALNET_CHAIN 
} from '@phoenix-wallet/sui';

// Use pre-configured chain constants
const connector = new SuiStandardConnnector({
  id: 'phantom-sui',
  name: 'Phantom',
  logo: 'https://phantom.app/img/logo.png',
  adapter: phantomWallet,
  dappMetadata: { /* ... */ }
});
```

### Custom Network

```typescript
const customChainConfig = {
  id: 'sui:custom',
  name: 'Custom Sui Network',
  chainId: 'sui:custom',
  rpcUrl: 'https://your-custom-node.com:443',
  nativeCurrency: {
    name: 'SUI',
    symbol: 'SUI',
    decimals: 9
  },
  blockExplorerUrl: 'https://your-explorer.com'
};
```

## Transaction Operations

### Simple Transfer

```typescript
import { Transaction } from '@mysten/sui/transactions';

const tx = new Transaction();
const [coin] = tx.splitCoins(tx.gas, [1000000000]); // 1 SUI (9 decimals)
tx.transferObjects([coin], recipientAddress);

const result = await wallet.sendTransaction({
  transaction: tx,
  account: wallet.walletClient.getAccounts()[0],
  chain: wallet.chain.id
});
```

### Transfer Custom Coin

```typescript
import { Transaction } from '@mysten/sui/transactions';

const tx = new Transaction();
const coinType = '0x2::sui::SUI';
const [coin] = tx.splitCoins(tx.object(coinObjectId), [amount]);
tx.transferObjects([coin], recipientAddress);

const result = await wallet.sendTransaction({
  transaction: tx,
  account: wallet.walletClient.getAccounts()[0],
  chain: wallet.chain.id
});
```

### Move Call

```typescript
import { Transaction } from '@mysten/sui/transactions';

const tx = new Transaction();
tx.moveCall({
  target: `${packageId}::${moduleName}::${functionName}`,
  arguments: [
    tx.pure.address(arg1),
    tx.pure.u64(arg2),
    tx.object(objectId)
  ],
  typeArguments: ['0x2::sui::SUI']
});

const result = await wallet.sendTransaction({
  transaction: tx,
  account: wallet.walletClient.getAccounts()[0],
  chain: wallet.chain.id
});
```

### Sign Transaction

```typescript
const tx = new Transaction();
// ... build transaction

const signedTx = await wallet.signTransaction({
  transaction: tx,
  account: wallet.walletClient.getAccounts()[0],
  chain: wallet.chain.id
});

// Later, submit the signed transaction
const result = await wallet.sendRawTransaction({
  transaction: signedTx.transaction,
  signature: signedTx.signature
});
```

## Contract Interactions

### Using SuiContract

```typescript
import { SuiContract } from '@phoenix-wallet/sui';

const contract = new SuiContract(
  packageId,
  wallet
);

// View function (read-only)
const result = await contract.call(`${moduleName}::${functionName}`, [
  arg1,
  arg2
]);

// Entry function (write)
const txDigest = await contract.send(`${moduleName}::${functionName}`, [
  arg1,
  arg2
]);
```

### Query Objects

```typescript
import { SuiClient } from '@mysten/sui/client';

const client = new SuiClient({ url: 'https://fullnode.mainnet.sui.io:443' });

// Get objects owned by address
const objects = await client.getOwnedObjects({
  owner: wallet.address,
  options: {
    showType: true,
    showContent: true,
    showDisplay: true
  }
});

// Get specific object
const object = await client.getObject({
  id: objectId,
  options: {
    showContent: true,
    showType: true
  }
});
```

## Message Signing

### Sign Personal Message

```typescript
const message = new TextEncoder().encode('Hello, Sui!');
const account = wallet.walletClient.getAccounts()[0];

const signedMessage = await wallet.signMessage({
  message: message,
  account: account
});

console.log('Signature:', signedMessage.signature);
console.log('Message bytes:', signedMessage.messageBytes);
```

### Verify Signature

```typescript
import { verifyPersonalMessage } from '@mysten/sui/verify';

const isValid = await verifyPersonalMessage(
  signedMessage.messageBytes,
  signedMessage.signature,
  wallet.address
);
```

## Coin Operations

### Get Balance

```typescript
// Get SUI balance
const balance = await wallet.getBalance();
console.log(`Balance: ${balance} SUI`);

// Get all coin balances
import { SuiClient } from '@mysten/sui/client';

const client = new SuiClient({ url: 'https://fullnode.mainnet.sui.io:443' });
const balances = await client.getAllBalances({
  owner: wallet.address
});
```

### Merge Coins

```typescript
import { Transaction } from '@mysten/sui/transactions';

const tx = new Transaction();
tx.mergeCoins(destinationCoinId, [sourceCoinId1, sourceCoinId2]);

const result = await wallet.sendTransaction({
  transaction: tx,
  account: wallet.walletClient.getAccounts()[0],
  chain: wallet.chain.id
});
```

## API Reference

### SuiWallet

```typescript
class SuiWallet {
  address: string;
  chain: SuiChain;
  connector: SuiConnector;
  walletClient: SuiWalletClient;
  
  // Get SUI balance
  getBalance(): Promise<string>;
  
  // Sign message
  signMessage(params: { message: Uint8Array; account: WalletAccount }): Promise<SignedMessage>;
  
  // Sign transaction
  signTransaction(params: { 
    transaction: Transaction; 
    account: WalletAccount; 
    chain: string 
  }): Promise<SignedTransaction>;
  
  // Send transaction
  sendTransaction(params: { 
    transaction: Transaction; 
    account: WalletAccount; 
    chain: string 
  }): Promise<TransactionResult>;
  
  // Send raw transaction
  sendRawTransaction(params: { 
    transaction: string; 
    signature: string 
  }): Promise<string>;
}
```

### SuiChain

```typescript
class SuiChain {
  id: string;
  name: string;
  rpcUrl: string;
  provider: SuiClient;
  
  getBalance(address: string): Promise<string>;
  getObject(objectId: string): Promise<any>;
  getOwnedObjects(address: string): Promise<any>;
}
```

## Error Handling

```typescript
try {
  await wallet.sendTransaction(params);
} catch (error) {
  if (error.code === 4001) {
    console.log('User rejected the transaction');
  } else if (error.message.includes('Insufficient gas')) {
    console.log('Insufficient gas to execute transaction');
  } else if (error.message.includes('Object not found')) {
    console.log('Object does not exist');
  } else {
    console.error('Transaction failed:', error);
  }
}
```

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import type { 
  SuiWallet, 
  SuiChain, 
  SuiConnector,
  SuiWalletClient,
  Wallet,
  WalletAccount
} from '@phoenix-wallet/sui';
```

## Related Packages

- [@phoenix-wallet/core](../core) - Core interfaces and types
- [@phoenix-wallet/evm](../evm) - EVM blockchain support
- [@phoenix-wallet/solana](../solana) - Solana blockchain support
- [@phoenix-wallet/aptos](../aptos) - Aptos blockchain support
- [@phoenix-wallet/privy](../privy) - Privy authentication integration

## Resources

- [Sui Documentation](https://docs.sui.io/)
- [Sui TypeScript SDK](https://sdk.mystenlabs.com/typescript)
- [Move Language](https://move-language.github.io/move/)
- [Sui Explorer](https://suiscan.xyz/)
- [Wallet-Standard](https://github.com/wallet-standard/wallet-standard)

## License

MIT

## Support

For issues and questions, please visit our [GitHub repository](https://github.com/your-org/phoenix-wallet).

