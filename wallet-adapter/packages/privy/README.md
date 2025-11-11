# @phoenix-wallet/privy

Privy authentication integration for Phoenix Wallet - seamless embedded wallet and social login support.

## Overview

This package provides integration between Phoenix Wallet and Privy, enabling embedded wallets, social logins, and email authentication across multiple blockchains (EVM and Solana).

## Features

- 🔐 **Embedded Wallets**: Create wallets for users automatically
- 🌐 **Social Login**: Google, Twitter, Discord, GitHub, and more
- 📧 **Email Authentication**: Passwordless email login
- ⛓️ **Multi-Chain**: Support for both EVM and Solana
- 🔄 **Seamless Integration**: Works with Phoenix Wallet's universal interface
- 🎨 **Customizable UI**: Full control over appearance and branding
- 🔒 **Secure**: Industry-standard security with Privy's infrastructure

## Installation

```bash
# Using pnpm (recommended)
pnpm add @phoenix-wallet/core @phoenix-wallet/privy @privy-io/react-auth

# Using npm
npm install @phoenix-wallet/core @phoenix-wallet/privy @privy-io/react-auth

# Using yarn
yarn add @phoenix-wallet/core @phoenix-wallet/privy @privy-io/react-auth
```

## Quick Start

### Basic Setup

```typescript
import { PhoenixPrivyProvider } from '@phoenix-wallet/privy';

function App() {
  return (
    <PhoenixPrivyProvider
      appId="your-privy-app-id"
      enableEvm={true}
      enableSolana={true}
      privyConfig={{
        appearance: {
          theme: 'light',
          accentColor: '#3a86ff',
          logo: 'https://your-app.com/logo.png'
        },
        loginMethods: ['email', 'wallet', 'google', 'twitter'],
        embeddedWallets: {
          createOnLogin: 'users-without-wallets'
        }
      }}
      evmPrivyConnectorConfig={{
        id: 'privy-evm',
        name: 'Phoenix Auth (EVM)',
        logo: 'https://your-app.com/logo.png',
        dappMetadata: {
          name: 'My DApp',
          url: 'https://your-app.com',
          icon: 'https://your-app.com/icon.png'
        }
      }}
      solanaPrivyConnectorConfig={{
        id: 'privy-solana',
        name: 'Phoenix Auth (Solana)',
        logo: 'https://your-app.com/logo.png',
        dappMetadata: {
          name: 'My DApp - Solana',
          url: 'https://your-app.com',
          icon: 'https://your-app.com/icon.png'
        },
        chainId: 'solana_mainnet'
      }}
    >
      <YourApp />
    </PhoenixPrivyProvider>
  );
}
```

### Using Privy Wallets

```typescript
import { useWallet } from '@/hooks/useWallet';

function WalletComponent() {
  const { 
    wallet, 
    isConnected, 
    address, 
    connect, 
    disconnect 
  } = useWallet('privy-evm'); // or 'privy-solana'

  const handleConnect = async () => {
    await connect();
  };

  return (
    <div>
      {!isConnected ? (
        <button onClick={handleConnect}>
          Login with Email or Social
        </button>
      ) : (
        <div>
          <p>Connected: {address}</p>
          <button onClick={disconnect}>Logout</button>
        </div>
      )}
    </div>
  );
}
```

## Configuration

### Privy App Setup

1. Create a Privy account at [privy.io](https://privy.io)
2. Create a new app in the Privy dashboard
3. Copy your App ID
4. Configure allowed domains and redirect URIs

### Provider Configuration

#### Basic Configuration

```typescript
<PhoenixPrivyProvider
  appId="your-privy-app-id"
  enableEvm={true}
  enableSolana={false}
  privyConfig={{
    appearance: {
      theme: 'light',
      accentColor: '#3a86ff'
    }
  }}
/>
```

#### Advanced Configuration

```typescript
<PhoenixPrivyProvider
  appId="your-privy-app-id"
  enableEvm={true}
  enableSolana={true}
  privyConfig={{
    appearance: {
      theme: 'dark',
      accentColor: '#3a86ff',
      logo: 'https://your-app.com/logo.png',
      landingHeader: 'Welcome to My DApp',
      loginMessage: 'Sign in to continue',
      showWalletLoginFirst: false
    },
    loginMethods: [
      'email',
      'wallet',
      'google',
      'twitter',
      'discord',
      'github',
      'linkedin',
      'apple'
    ],
    embeddedWallets: {
      createOnLogin: 'users-without-wallets',
      requireUserPasswordOnCreate: false,
      noPromptOnSignature: false
    },
    mfa: {
      noPromptOnMfaRequired: false
    }
  }}
  evmPrivyConnectorConfig={{
    id: 'privy-evm',
    name: 'Phoenix Auth',
    logo: 'https://your-app.com/logo.png',
    dappMetadata: {
      name: 'My DApp',
      url: 'https://your-app.com',
      icon: 'https://your-app.com/icon.png'
    }
  }}
  solanaPrivyConnectorConfig={{
    id: 'privy-solana',
    name: 'Phoenix Auth (Solana)',
    logo: 'https://your-app.com/logo.png',
    dappMetadata: {
      name: 'My DApp - Solana',
      url: 'https://your-app.com',
      icon: 'https://your-app.com/icon.png'
    },
    chainId: 'solana_mainnet'
  }}
/>
```

## Login Methods

### Email Authentication

```typescript
privyConfig={{
  loginMethods: ['email'],
  embeddedWallets: {
    createOnLogin: 'all-users'
  }
}}
```

### Social Logins

```typescript
privyConfig={{
  loginMethods: [
    'google',
    'twitter',
    'discord',
    'github',
    'linkedin',
    'apple'
  ]
}}
```

### Wallet Connect

```typescript
privyConfig={{
  loginMethods: ['wallet'],
  appearance: {
    showWalletLoginFirst: true
  }
}}
```

### Combined Methods

```typescript
privyConfig={{
  loginMethods: [
    'email',
    'wallet',
    'google',
    'twitter'
  ]
}}
```

## Embedded Wallets

### Auto-Create Wallets

```typescript
privyConfig={{
  embeddedWallets: {
    createOnLogin: 'all-users', // Create for all users
    // or 'users-without-wallets' // Only for users without external wallets
    // or 'off' // Don't auto-create
  }
}}
```

### Password Protection

```typescript
privyConfig={{
  embeddedWallets: {
    createOnLogin: 'all-users',
    requireUserPasswordOnCreate: true // Require password for wallet
  }
}}
```

### Signature Prompts

```typescript
privyConfig={{
  embeddedWallets: {
    noPromptOnSignature: true // Don't prompt for each signature
  }
}}
```

## Multi-Chain Support

### EVM Chains

```typescript
<PhoenixPrivyProvider
  appId="your-privy-app-id"
  enableEvm={true}
  evmPrivyConnectorConfig={{
    id: 'privy-evm',
    name: 'Phoenix Auth (EVM)',
    logo: 'https://your-app.com/logo.png',
    dappMetadata: {
      name: 'My DApp',
      url: 'https://your-app.com'
    }
  }}
/>
```

### Solana

```typescript
<PhoenixPrivyProvider
  appId="your-privy-app-id"
  enableSolana={true}
  solanaPrivyConnectorConfig={{
    id: 'privy-solana',
    name: 'Phoenix Auth (Solana)',
    logo: 'https://your-app.com/logo.png',
    dappMetadata: {
      name: 'My DApp - Solana',
      url: 'https://your-app.com'
    },
    chainId: 'solana_mainnet' // or 'solana_devnet', 'solana_testnet'
  }}
/>
```

### Both EVM and Solana

```typescript
<PhoenixPrivyProvider
  appId="your-privy-app-id"
  enableEvm={true}
  enableSolana={true}
  evmPrivyConnectorConfig={{ /* ... */ }}
  solanaPrivyConnectorConfig={{ /* ... */ }}
/>
```

## Using with Phoenix Wallet

### Universal Wallet Hook

```typescript
import { useWallet } from '@/hooks/useWallet';

function MyComponent() {
  // Use Privy EVM wallet
  const evmWallet = useWallet('privy-evm');
  
  // Use Privy Solana wallet
  const solanaWallet = useWallet('privy-solana');
  
  return (
    <div>
      <button onClick={() => evmWallet.connect()}>
        Connect EVM
      </button>
      <button onClick={() => solanaWallet.connect()}>
        Connect Solana
      </button>
    </div>
  );
}
```

### Transaction Signing

```typescript
// EVM transaction
const evmWallet = useWallet('privy-evm');
if (evmWallet.wallet) {
  const txHash = await evmWallet.wallet.sendTransaction({
    to: '0x...',
    value: '0.1',
    data: '0x'
  });
}

// Solana transaction
const solanaWallet = useWallet('privy-solana');
if (solanaWallet.wallet) {
  const signature = await solanaWallet.wallet.sendTransaction(transaction);
}
```

## Customization

### Theme Customization

```typescript
privyConfig={{
  appearance: {
    theme: 'dark', // or 'light'
    accentColor: '#3a86ff',
    logo: 'https://your-app.com/logo.png',
    landingHeader: 'Welcome!',
    loginMessage: 'Sign in to get started',
    showWalletLoginFirst: false
  }
}}
```

### Custom Styling

```typescript
privyConfig={{
  appearance: {
    theme: 'light',
    accentColor: '#3a86ff',
    // Add custom CSS
    walletList: {
      paddingTop: '20px',
      paddingBottom: '20px'
    }
  }
}}
```

## Security Features

### Multi-Factor Authentication

```typescript
privyConfig={{
  mfa: {
    noPromptOnMfaRequired: false // Prompt users to enable MFA
  }
}}
```

### Session Management

Privy handles session management automatically with secure token storage and refresh.

## API Reference

### PhoenixPrivyProvider Props

```typescript
interface PhoenixPrivyProviderProps {
  appId: string;
  enableEvm?: boolean;
  enableSolana?: boolean;
  privyConfig?: PrivyClientConfig;
  evmPrivyConnectorConfig?: EvmPrivyConnectorConfig;
  solanaPrivyConnectorConfig?: SolanaPrivyConnectorConfig;
  children: React.ReactNode;
}
```

### PrivyClientConfig

Full configuration options from `@privy-io/react-auth`. See [Privy documentation](https://docs.privy.io/) for details.

## Best Practices

1. **App ID Security**: Keep your Privy App ID public-safe (it's designed to be client-side)
2. **Domain Whitelisting**: Always configure allowed domains in Privy dashboard
3. **Embedded Wallets**: Use `users-without-wallets` for best UX with external wallet users
4. **Error Handling**: Always handle authentication errors gracefully
5. **Session Persistence**: Privy handles this automatically, but test logout flows

## Examples

### Complete Integration Example

```typescript
import { PhoenixPrivyProvider } from '@phoenix-wallet/privy';
import { WalletProvider } from '@phoenix-wallet/core';
import { useWallet } from '@/hooks/useWallet';

function App() {
  return (
    <PhoenixPrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID}
      enableEvm={true}
      enableSolana={true}
      privyConfig={{
        appearance: {
          theme: 'light',
          accentColor: '#3a86ff',
          logo: '/logo.png'
        },
        loginMethods: ['email', 'google', 'wallet'],
        embeddedWallets: {
          createOnLogin: 'users-without-wallets'
        }
      }}
      evmPrivyConnectorConfig={{
        id: 'privy-evm',
        name: 'Phoenix Auth',
        logo: '/logo.png',
        dappMetadata: {
          name: 'My DApp',
          url: window.location.origin
        }
      }}
    >
      <Dashboard />
    </PhoenixPrivyProvider>
  );
}

function Dashboard() {
  const { wallet, connect, disconnect, isConnected } = useWallet('privy-evm');
  
  return (
    <div>
      {!isConnected ? (
        <button onClick={connect}>Login</button>
      ) : (
        <div>
          <p>Welcome! {wallet?.address}</p>
          <button onClick={disconnect}>Logout</button>
        </div>
      )}
    </div>
  );
}
```

## TypeScript Support

Full TypeScript support with type definitions:

```typescript
import type {
  PhoenixPrivyProviderProps,
  EvmPrivyConnectorConfig,
  SolanaPrivyConnectorConfig
} from '@phoenix-wallet/privy';
```

## Related Packages

- [@phoenix-wallet/core](../core) - Core interfaces and types
- [@phoenix-wallet/evm](../evm) - EVM blockchain support
- [@phoenix-wallet/solana](../solana) - Solana blockchain support
- [@phoenix-wallet/aptos](../aptos) - Aptos blockchain support
- [@phoenix-wallet/sui](../sui) - Sui blockchain support

## Resources

- [Privy Documentation](https://docs.privy.io/)
- [Privy Dashboard](https://dashboard.privy.io/)
- [Privy React SDK](https://github.com/privy-io/privy-react-auth)

## License

MIT

## Support

For issues and questions, please visit our [GitHub repository](https://github.com/your-org/phoenix-wallet).
