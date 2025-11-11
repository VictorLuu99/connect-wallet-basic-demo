import React, { useMemo } from 'react';
import { PrivyProvider, PrivyClientConfig } from '@privy-io/react-auth';
import { WalletProvider, IConnector, IChainConfig } from '@phoenix-wallet/core';
import { PrivyConnector } from './PrivyConnector';
import { PrivyBridge } from './PrivyBridge';

export interface EvmPhoenixPrivyProviderProps {
  children: React.ReactNode;

  // Privy configuration
  appId: string;
  privyConfig?: Omit<PrivyClientConfig, 'id'>;

  // Phoenix Wallet configuration
  connectors?: IConnector[];
  chainConfigs: IChainConfig[];
  reconnect?: 'none' | 'auto';

  // Privy connector configuration
  privyConnectorConfig?: {
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
}

export const EvmPhoenixPrivyProvider: React.FC<EvmPhoenixPrivyProviderProps> = ({
  children,
  appId,
  privyConfig = {},
  connectors = [],
  chainConfigs,
  reconnect = 'none',
  privyConnectorConfig = {},
}) => {
  // Create Privy connector instance
  const privyConnector = useMemo(() => {
    return new PrivyConnector({
      id: privyConnectorConfig.id || 'privy',
      name: privyConnectorConfig.name || 'Privy',
      logo: privyConnectorConfig.logo || '',
      dappMetadata: privyConnectorConfig.dappMetadata || {
        name: 'Phoenix Wallet',
        url: typeof window !== 'undefined' ? window.location.host : 'localhost',
      },
    }, privyConnectorConfig.supportedChains || []);
  }, [privyConnectorConfig]);

  // Combine privy connector with existing connectors
  const allConnectors = useMemo(() => {
    return [privyConnector, ...connectors];
  }, [privyConnector, connectors]);

  return (
    <PrivyProvider
      appId={appId}
      config={{
        ...privyConfig,
        // Ensure proper configuration for wallet connections
        appearance: {
          theme: 'light',
          accentColor: '#676FFF',
          logo: privyConnectorConfig.logo,
          ...privyConfig.appearance,
        },
        // Configure supported chains if not provided
        supportedChains:
          privyConfig.supportedChains ||
          chainConfigs.map((chain) => ({
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
      }}
    >
      <WalletProvider connectors={allConnectors} chainConfigs={chainConfigs} reconnect={reconnect}>
        <PrivyBridge privyConnector={privyConnector}>{children}</PrivyBridge>
      </WalletProvider>
    </PrivyProvider>
  );
};
