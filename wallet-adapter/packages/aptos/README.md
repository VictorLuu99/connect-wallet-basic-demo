# @phoenix-wallet/aptos

Aptos blockchain support for Phoenix Wallet - comprehensive wallet adapter for Aptos ecosystem.

## Overview

This package provides full support for Aptos blockchain, including wallet connectors for popular Aptos wallets like Petra, Pontem, Nightly, and OKX.

## Features

- 🔌 **Multiple Wallet Support**: Petra, Pontem, Nightly, OKX, and more
- 🌐 **Network Support**: Mainnet, Testnet, Devnet, and custom networks
- 📝 **Move Contracts**: Easy interaction with Move smart contracts
- 🔐 **Signing**: Message and transaction signing support
- 💰 **Coin Operations**: Native APT and custom coin transfers
- ⚡ **Type Safety**: Full TypeScript support with Aptos SDK v4

## Installation

```bash
# Using pnpm (recommended)
pnpm add @phoenix-wallet/core @phoenix-wallet/aptos @aptos-labs/ts-sdk

# Using npm
npm install @phoenix-wallet/core @phoenix-wallet/aptos @aptos-labs/ts-sdk

# Using yarn
yarn add @phoenix-wallet/core @phoenix-wallet/aptos @aptos-labs/ts-sdk
```

## Quick Start

### Basic Setup

```typescript
import { WalletProvider } from '@phoenix-wallet/core';
import { 
  PetraAptosConnector, 
  OKXAptosConnector,
  AptosNetwork 
} from '@phoenix-wallet/aptos';

const aptosChainConfigs = [
  {
    id: 'aptos_mainnet',
    name: 'Aptos Mainnet',
    chainId: 'mainnet',
    rpcUrl: 'https://fullnode.mainnet.aptoslabs.com/v1',
    nativeCurrency: {
      name: 'Aptos Coin',
      symbol: 'APT',
      decimals: 8
    },
    blockExplorerUrl: 'https://explorer.aptoslabs.com'
  },
  {
    id: 'aptos_testnet',
    name: 'Aptos Testnet',
    chainId: 'testnet',
    rpcUrl: 'https://fullnode.testnet.aptoslabs.com/v1',
    nativeCurrency: {
      name: 'Aptos Coin',
      symbol: 'APT',
      decimals: 8
    },
    blockExplorerUrl: 'https://explorer.aptoslabs.com?network=testnet'
  }
];

const connectors = [
  new PetraAptosConnector({
    id: 'petra-aptos',
    name: 'Petra',
    logo: 'https://petra.app/logo.png',
    network: AptosNetwork.MAINNET,
    dappMetadata: {
      name: 'My DApp',
      url: 'https://mydapp.com',
      icon: 'https://mydapp.com/icon.png'
    }
  }),
  new OKXAptosConnector({
    id: 'okx-aptos',
    name: 'OKX Wallet',
    logo: 'https://okx.com/logo.png',
    network: AptosNetwork.MAINNET,
    dappMetadata: {
      name: 'My DApp',
      url: 'https://mydapp.com',
      icon: 'https://mydapp.com/icon.png'
    }
  })
];

function App() {
  return (
    <WalletProvider connectors={connectors} chainConfigs={aptosChainConfigs}>
      <YourApp />
    </WalletProvider>
  );
}
```

### Using the Wallet

```typescript
import { useWallet } from '@/hooks/useWallet';
import { APTOS_COIN } from '@aptos-labs/ts-sdk';

function WalletComponent() {
  const { 
    wallet, 
    isConnected, 
    address, 
    connect, 
    disconnect 
  } = useWallet('petra-aptos');

  const handleConnect = async () => {
    await connect();
  };

  const handleSignMessage = async () => {
    if (!wallet) return;
    const signature = await wallet.signMessage('Hello, Aptos!');
    console.log('Signature:', signature);
  };

  const handleTransferAPT = async () => {
    if (!wallet) return;
    
    const txHash = await wallet.sendTransaction({
      payload: {
        function: '0x1::coin::transfer',
        typeArguments: [APTOS_COIN],
        functionArguments: [
          'recipient_address',
          100000000 // 1 APT (8 decimals)
        ]
      }
    });
    
    console.log('Transaction hash:', txHash);
  };

  return (
    <div>
      {!isConnected ? (
        <button onClick={handleConnect}>Connect Petra</button>
      ) : (
        <div>
          <p>Connected: {address}</p>
          <button onClick={handleSignMessage}>Sign Message</button>
          <button onClick={handleTransferAPT}>Transfer APT</button>
          <button onClick={disconnect}>Disconnect</button>
        </div>
      )}
    </div>
  );
}
```

## Available Connectors

### Petra Wallet
```typescript
import { PetraAptosConnector, AptosNetwork } from '@phoenix-wallet/aptos';

const petra = new PetraAptosConnector({
  id: 'petra-aptos',
  name: 'Petra',
  logo: 'https://petra.app/logo.png',
  network: AptosNetwork.MAINNET,
  dappMetadata: {
    name: 'My DApp',
    url: 'https://mydapp.com',
    icon: 'https://mydapp.com/icon.png'
  }
});
```

### OKX Wallet
```typescript
import { OKXAptosConnector, AptosNetwork } from '@phoenix-wallet/aptos';

const okx = new OKXAptosConnector({
  id: 'okx-aptos',
  name: 'OKX Wallet',
  logo: 'https://okx.com/logo.png',
  network: AptosNetwork.MAINNET,
  dappMetadata: {
    name: 'My DApp',
    url: 'https://mydapp.com'
  }
});
```

### Pontem Wallet
```typescript
import { PontemAptosConnector, AptosNetwork } from '@phoenix-wallet/aptos';

const pontem = new PontemAptosConnector({
  id: 'pontem-aptos',
  name: 'Pontem',
  logo: 'https://pontem.network/logo.png',
  network: AptosNetwork.MAINNET,
  dappMetadata: {
    name: 'My DApp',
    url: 'https://mydapp.com'
  }
});
```

### Nightly Wallet
```typescript
import { NightlyAptosConnector, AptosNetwork } from '@phoenix-wallet/aptos';

const nightly = new NightlyAptosConnector({
  id: 'nightly-aptos',
  name: 'Nightly',
  logo: 'https://nightly.app/logo.png',
  network: AptosNetwork.MAINNET,
  dappMetadata: {
    name: 'My DApp',
    url: 'https://mydapp.com'
  }
});
```

## Network Configuration

### Available Networks

```typescript
enum AptosNetwork {
  MAINNET = 'mainnet',
  TESTNET = 'testnet',
  DEVNET = 'devnet',
  CUSTOM = 'custom'
}
```

### Custom Network Configuration

```typescript
const connector = new PetraAptosConnector({
  id: 'petra-aptos',
  name: 'Petra',
  logo: 'https://petra.app/logo.png',
  network: AptosNetwork.CUSTOM,
  customNodeUrl: 'https://your-custom-node.com/v1',
  dappMetadata: { /* ... */ }
});
```

## Transaction Operations

### Simple Transfer

```typescript
import { APTOS_COIN } from '@aptos-labs/ts-sdk';

const txHash = await wallet.sendTransaction({
  payload: {
    function: '0x1::coin::transfer',
    typeArguments: [APTOS_COIN],
    functionArguments: [
      recipientAddress,
      amount // in Octas (1 APT = 100,000,000 Octas)
    ]
  }
});
```

### Sign and Submit Transaction

```typescript
const transaction = await wallet.chain.provider.transaction.build.simple({
  sender: wallet.address,
  data: {
    function: '0x1::coin::transfer',
    typeArguments: [APTOS_COIN],
    functionArguments: [recipientAddress, amount]
  }
});

// Sign only
const signedTx = await wallet.signTransaction(transaction);

// Or sign and submit
const txHash = await wallet.sendTransaction({ payload: transaction.data });
```

### Multi-Agent Transactions

```typescript
const transaction = await wallet.chain.provider.transaction.build.multiAgent({
  sender: wallet.address,
  secondarySignerAddresses: [secondaryAddress],
  data: {
    function: '0x1::your_module::multi_agent_function',
    typeArguments: [],
    functionArguments: [/* ... */]
  }
});

const signedTx = await wallet.signTransaction(transaction);
```

## Move Contract Interactions

### Using AptosContract

```typescript
import { AptosContract } from '@phoenix-wallet/aptos';

const contract = new AptosContract(
  '0x1::coin', // Module address
  wallet
);

// View function (read-only)
const balance = await contract.call('balance', [
  { type: 'address', value: wallet.address }
]);

// Entry function (write)
const txHash = await contract.send('transfer', [
  { type: 'address', value: recipientAddress },
  { type: 'u64', value: amount }
]);
```

### Custom Module Interaction

```typescript
const moduleAddress = '0x123...abc';
const moduleName = 'my_module';

const result = await wallet.sendTransaction({
  payload: {
    function: `${moduleAddress}::${moduleName}::my_function`,
    typeArguments: ['0x1::aptos_coin::AptosCoin'],
    functionArguments: [arg1, arg2, arg3]
  }
});
```

## Coin Operations

### Get Balance

```typescript
// Get APT balance
const balance = await wallet.getBalance();
console.log(`Balance: ${balance} APT`);

// Get custom coin balance
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';

const aptos = new Aptos(new AptosConfig({ network: Network.MAINNET }));
const coinType = '0x1::aptos_coin::AptosCoin';
const resources = await aptos.getAccountResources({ accountAddress: wallet.address });
const coinResource = resources.find(r => r.type === `0x1::coin::CoinStore<${coinType}>`);
const balance = coinResource?.data?.coin?.value;
```

### Register Coin

```typescript
const txHash = await wallet.sendTransaction({
  payload: {
    function: '0x1::managed_coin::register',
    typeArguments: [coinType],
    functionArguments: []
  }
});
```

## Message Signing

### Sign Text Message

```typescript
const message = 'Hello, Aptos!';
const signature = await wallet.signMessage(message);

// Signature format
console.log(signature.signature); // hex string
console.log(signature.fullMessage); // full message with nonce
```

### Verify Signature

```typescript
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';

const aptos = new Aptos(new AptosConfig({ network: Network.MAINNET }));
const isValid = await aptos.verifyMessageSignature({
  message: originalMessage,
  signature: signature.signature,
  signer: wallet.address
});
```

## API Reference

### AptosWallet

```typescript
class AptosWallet {
  address: string;
  chain: AptosChain;
  connector: AptosConnector;
  walletClient: AptosWalletClient;
  
  // Get APT balance
  getBalance(): Promise<string>;
  
  // Sign message
  signMessage(message: string): Promise<{ signature: string; fullMessage: string }>;
  
  // Sign transaction
  signTransaction(transaction: any): Promise<any>;
  
  // Send transaction
  sendTransaction(transaction: any): Promise<string>;
  
  // Send raw transaction
  sendRawTransaction(signedTx: string): Promise<string>;
}
```

### AptosChain

```typescript
class AptosChain {
  id: string;
  name: string;
  network: AptosNetwork;
  nodeUrl: string;
  provider: Aptos;
  
  getBalance(address: string): Promise<string>;
  getAccountInfo(address: string): Promise<any>;
}
```

## Error Handling

```typescript
try {
  await wallet.sendTransaction(transaction);
} catch (error) {
  if (error.code === 4001) {
    console.log('User rejected the transaction');
  } else if (error.message.includes('INSUFFICIENT_BALANCE')) {
    console.log('Insufficient balance');
  } else if (error.message.includes('SEQUENCE_NUMBER_TOO_OLD')) {
    console.log('Transaction sequence number is outdated');
  } else {
    console.error('Transaction failed:', error);
  }
}
```

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import type { 
  AptosWallet, 
  AptosChain, 
  AptosConnector,
  AptosWalletClient,
  AptosNetwork 
} from '@phoenix-wallet/aptos';
```

## Related Packages

- [@phoenix-wallet/core](../core) - Core interfaces and types
- [@phoenix-wallet/evm](../evm) - EVM blockchain support
- [@phoenix-wallet/solana](../solana) - Solana blockchain support
- [@phoenix-wallet/sui](../sui) - Sui blockchain support
- [@phoenix-wallet/privy](../privy) - Privy authentication integration

## Resources

- [Aptos Documentation](https://aptos.dev/)
- [Aptos TypeScript SDK](https://github.com/aptos-labs/aptos-ts-sdk)
- [Move Language](https://move-language.github.io/move/)
- [Aptos Explorer](https://explorer.aptoslabs.com/)

## License

MIT

## Support

For issues and questions, please visit our [GitHub repository](https://github.com/your-org/phoenix-wallet).

