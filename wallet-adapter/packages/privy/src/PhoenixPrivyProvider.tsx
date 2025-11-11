import React, { useMemo } from 'react';
import { PrivyProvider, PrivyClientConfig } from '@privy-io/react-auth';
import { WalletProvider, IConnector, IChainConfig, ChainType, LoggerConfig } from '@phoenix-wallet/core';
import { PrivyConnector } from './PrivyConnector';
import { PrivyBridge } from './PrivyBridge';
import { SolanaPrivyConnector } from './solana/SolanaPrivyConnector';
import { SolanaPrivyBridge } from './solana/SolanaPrivyBridge';

export interface PhoenixPrivyProviderProps {
  children: React.ReactNode;

  // Privy configuration
  appId: string;
  privyConfig?: Omit<PrivyClientConfig, 'id'>;

  // Phoenix Wallet configuration
  connectors?: IConnector[];
  chainConfigs: IChainConfig[];
  reconnect?: 'none' | 'auto';
  loggerConfig?: LoggerConfig;

  // Multi-chain support
  enableEvm?: boolean;
  enableSolana?: boolean;

  // EVM Privy connector configuration
  evmPrivyConnectorConfig?: {
    id?: string;
    name?: string;
    logo?: string;
    dappMetadata?: {
      name: string;
      url: string;
      icon?: string;
    };
    supportedChains?: string[];
  };

  // Solana Privy connector configuration
  solanaPrivyConnectorConfig?: {
    id?: string;
    name?: string;
    logo?: string;
    dappMetadata?: {
      name: string;
      url: string;
      icon?: string;
    };
    chainId?: 'solana_mainnet_beta' | 'solana_devnet' | 'solana_testnet';
    supportedChains?: string[];
  };
}

export const PhoenixPrivyProvider: React.FC<PhoenixPrivyProviderProps> = ({
  children,
  appId,
  privyConfig = {},
  connectors = [],
  chainConfigs,
  reconnect = 'none',
  loggerConfig,
  enableEvm = true,
  enableSolana = false,
  evmPrivyConnectorConfig = {},
  solanaPrivyConnectorConfig = {},
}) => {
  // Create EVM Privy connector if enabled
  const evmPrivyConnector = useMemo(() => {
    if (!enableEvm) return null;

    return new PrivyConnector({
      id: evmPrivyConnectorConfig.id || 'privy-evm',
      name: evmPrivyConnectorConfig.name || 'Privy (EVM)',
      logo: evmPrivyConnectorConfig.logo || '',
      dappMetadata: evmPrivyConnectorConfig.dappMetadata || {
        name: 'Phoenix Wallet',
        url: typeof window !== 'undefined' ? window.location.host : 'localhost',
      },
    }, evmPrivyConnectorConfig.supportedChains || []);
  }, [enableEvm, evmPrivyConnectorConfig]);

  // Filter chains by enabled types
  const supportedChains = useMemo(() => {
    return chainConfigs.filter((chain) => {
      if (!enableEvm && chain.chainType === ChainType.EVM) return false;
      if (!enableSolana && chain.chainType === ChainType.SOLANA) return false;
      return true;
    });
  }, [chainConfigs, enableEvm, enableSolana]);

  // Create Solana Privy connector if enabled
  const solanaPrivyConnector = useMemo(() => {
    if (!enableSolana) return null;

    return new SolanaPrivyConnector({
      id: solanaPrivyConnectorConfig.id || 'privy-solana',
      name: solanaPrivyConnectorConfig.name || 'Privy (Solana)',
      logo: solanaPrivyConnectorConfig.logo || '',
      dappMetadata: solanaPrivyConnectorConfig.dappMetadata || {
        name: 'Phoenix Wallet',
        url: typeof window !== 'undefined' ? window.location.host : 'localhost',
      },
      chainId: solanaPrivyConnectorConfig.chainId || 'solana_mainnet_beta',
      rpcUrl:
        supportedChains.find((chain) => chain.id === solanaPrivyConnectorConfig.chainId)?.privateRpcUrl ||
        'https://api.devnet.solana.com',
    }, solanaPrivyConnectorConfig.supportedChains || []);
  }, [enableSolana, solanaPrivyConnectorConfig, supportedChains]);

  // Combine all connectors
  const allConnectors = useMemo(() => {
    const privyConnectors = [
      ...(evmPrivyConnector ? [evmPrivyConnector] : []),
      ...(solanaPrivyConnector ? [solanaPrivyConnector] : []),
    ];
    return [...privyConnectors, ...connectors];
  }, [evmPrivyConnector, solanaPrivyConnector, connectors]);

  return (
    <PrivyProvider
      appId={appId}
      config={{
        ...privyConfig,
        // Ensure proper configuration for wallet connections
        appearance: {
          theme: 'light',
          accentColor: '#676FFF',
          logo: evmPrivyConnectorConfig.logo || solanaPrivyConnectorConfig.logo,
          ...privyConfig.appearance,
        },
        // Configure supported chains based on enabled types
        supportedChains:
          privyConfig.supportedChains ||
          supportedChains
            .filter((chain) => chain.chainType === ChainType.EVM)
            .map((chain) => ({
              id: parseInt(chain.id),
              name: chain.name,
              network: chain.name.toLowerCase(),
              nativeCurrency: chain.nativeCurrency,
              rpcUrls: {
                default: {
                  http: [chain.publicRpcUrl],
                },
              },
              blockExplorers: {
                default: {
                  name: `${chain.name} Explorer`,
                  url: chain.explorerUrl,
                },
              },
            })),
        // Configure embedded wallets for multi-chain
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
          requireUserPasswordOnCreate: false,
          ...privyConfig.embeddedWallets,
        },
        // Configure login methods
        loginMethods: privyConfig.loginMethods || ['email', 'wallet', 'google'],
      }}
    >
      <WalletProvider connectors={allConnectors} chainConfigs={supportedChains} reconnect={reconnect} loggerConfig={loggerConfig}>
        {/* EVM Bridge */}
        {enableEvm && evmPrivyConnector && (
          <PrivyBridge privyConnector={evmPrivyConnector}>
            {/* Solana Bridge */}
            {enableSolana && solanaPrivyConnector ? (
              <SolanaPrivyBridge solanaPrivyConnector={solanaPrivyConnector}>{children}</SolanaPrivyBridge>
            ) : (
              children
            )}
          </PrivyBridge>
        )}

        {/* Solana Only */}
        {!enableEvm && enableSolana && solanaPrivyConnector && (
          <SolanaPrivyBridge solanaPrivyConnector={solanaPrivyConnector}>{children}</SolanaPrivyBridge>
        )}

        {/* No Privy chains enabled - should not happen but fallback */}
        {!enableEvm && !enableSolana && children}
      </WalletProvider>
    </PrivyProvider>
  );
};
