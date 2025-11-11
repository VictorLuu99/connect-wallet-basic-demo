'use client';

import { PhoenixPrivyProvider, LoggerConfig } from '@phoenix-wallet/privy';
import { chainConfigs } from './wallet-config';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { IConnector } from '@phoenix-wallet/core';
import { getWallets } from '@wallet-standard/core';

// Import all connectors from their respective packages
import {
  BinanceEvmConnector,
  CoinbaseEvmConnector,
  MagicEdenEvmConnector,
  MetamaskEvmConnector,
  OkxEvmConnector,
  PhantomEvmConnector,
  RabbyEvmConnector,
  RainbowEvmConnector,
  TrustWalletEvmConnector,
  ZerionEvmConnector,
} from '@phoenix-wallet/evm';

import { SolanaCluster, SolanaConnector } from '@phoenix-wallet/solana';
import { AptosNetwork, PetraAptosConnector, OKXAptosConnector } from '@phoenix-wallet/aptos';
import { SuiStandardConnnector, SUI_DEVNET_CHAIN, Wallet, SuiCluster } from '@phoenix-wallet/sui';
import {
  PhoenixQREvmConnector,
  PhoenixQRSolanaConnector,
  PhoenixQRAptosConnector,
  PhoenixQRSuiConnector,
} from '@phoenix-wallet/connect-wallet';

import { isWalletAdapterCompatibleWallet, StandardWalletAdapter } from '@solana/wallet-standard-wallet-adapter-base';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';

const dappMetadata = {
  name: 'Phoenix Wallet',
  url: 'https://phoenix-wallet.com',
};

// Create context for client wallet state
interface ClientWalletContextType {
  isWalletReady: boolean;
}

const ClientWalletContext = createContext<ClientWalletContextType>({
  isWalletReady: false,
});

// Hook to use client wallet state
export const useClientWallet = () => {
  const context = useContext(ClientWalletContext);
  if (!context) {
    throw new Error('useClientWallet must be used within a ClientWalletProvider');
  }
  return context;
};

interface ClientWalletProviderProps {
  children: React.ReactNode;
  appId: string;
  enableEvm?: boolean;
  enableSolana?: boolean;
  privyConfig?: any;
  evmPrivyConnectorConfig?: any;
  solanaPrivyConnectorConfig?: any;
  loggerConfig?: LoggerConfig;
}

function useConstant<T>(fn: () => T): T {
  const ref = useRef<{ value: T }>(undefined);
  if (ref.current === undefined) {
    ref.current = { value: fn() };
  }
  return ref.current.value;
}

export const ClientWalletProvider: React.FC<ClientWalletProviderProps> = ({
  children,
  appId,
  enableEvm = true,
  enableSolana = true,
  privyConfig,
  evmPrivyConnectorConfig,
  solanaPrivyConnectorConfig,
  loggerConfig,
}) => {
  const [connectors, setConnectors] = useState<IConnector[]>([]);
  const [isWalletReady, setIsWalletReady] = useState(false);
  const { on, get } = useConstant(() => getWallets());

  useEffect(() => {
    setIsWalletReady(true);

    // Initialize connectors on the client side
    const initializeConnectors = () => {
      // Phoenix QR connectors configuration
      const phoenixConfig = {
        serverUrl: 'wss://whales-wallet-replayer-dev.gaimes.dev',
        reconnect: true,
        reconnectAttempts: 5,
        reconnectDelay: 2000,
        enablePersistence: true,
      };

      const baseConnectors: IConnector[] = [
        // Phoenix QR connectors for all chains
        new PhoenixQREvmConnector(
          {
            name: 'Phoenix QR (EVM)',
            logo: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSIjRkY2MDAwIi8+Cjwvc3ZnPgo=',
          },
          phoenixConfig,
          dappMetadata,
          ['1', '137', '11155111', '56']
        ),
        new PhoenixQRSolanaConnector(
          phoenixConfig,
          dappMetadata,
          SolanaCluster.DEVNET,
          ['solana_devnet', 'solana_mainnet_beta']
        ),
        new PhoenixQRAptosConnector(
          {
            name: 'Phoenix QR (Aptos)',
            logo: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSIjRkY2MDAwIi8+Cjwvc3ZnPgo=',
          },
          phoenixConfig,
          dappMetadata,
          AptosNetwork.TESTNET,
          ['aptos_mainnet', 'aptos_testnet']
        ),
        new PhoenixQRSuiConnector(
          {
            name: 'Phoenix QR (Sui)',
            logo: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSIjRkY2MDAwIi8+Cjwvc3ZnPgo=',
          },
          phoenixConfig,
          dappMetadata,
          SuiCluster.MAINNET,
          ['sui_testnet', 'sui_mainnet']
        ),

        // Traditional browser extension connectors
        new MetamaskEvmConnector(dappMetadata, ['1', '137', '11155111', '56']),
        new PhantomEvmConnector(dappMetadata, ['1', '137', '11155111', '56']),
        new CoinbaseEvmConnector(dappMetadata, ['1', '137', '11155111', '56']),
        new TrustWalletEvmConnector(dappMetadata, ['1', '137', '11155111', '56']),
        new MagicEdenEvmConnector(dappMetadata, ['1', '137', '11155111', '56']),
        new RainbowEvmConnector(dappMetadata, ['1', '137', '11155111', '56']),
        new ZerionEvmConnector(dappMetadata, ['1', '137', '11155111', '56']),
        new RabbyEvmConnector(dappMetadata, ['1', '137', '11155111', '56']),
        new OkxEvmConnector(dappMetadata, ['1', '137', '11155111', '56']),
        new BinanceEvmConnector(dappMetadata, ['1', '137', '11155111', '56']),

        // Solana, don't need because we use wallet standard
        new SolanaConnector(dappMetadata, new PhantomWalletAdapter(), SolanaCluster.DEVNET, [
          'solana_devnet',
          'solana_mainnet_beta',
        ]),

        // Sui
        // new PhantomSuiConnector(dappMetadata, SuiCluster.TESTNET, ['sui_testnet', 'sui_mainnet']),

        // Aptos
        new PetraAptosConnector(dappMetadata, AptosNetwork.TESTNET, ['aptos_mainnet', 'aptos_testnet']),
        new OKXAptosConnector(dappMetadata, AptosNetwork.TESTNET, ['aptos_mainnet', 'aptos_testnet']),
      ];

      console.log('get', get());
      //ADD METAMASK SOLANA CONNECTOR
      const solanaAdapters = wrapWalletsWithSolanaAdapters(get());
      const solanaConnectors = solanaAdapters.map(
        (adapter) =>
          new SolanaConnector(dappMetadata, adapter, SolanaCluster.DEVNET, ['solana_devnet', 'solana_mainnet_beta'])
      );

      const suiAdapters = wrapWalletsWithSuiAdapters(get());
      const suiConnectors = suiAdapters.map(
        (adapter) => new SuiStandardConnnector(dappMetadata, adapter, SUI_DEVNET_CHAIN, ['sui_testnet', 'sui_mainnet'])
      );
      //distinct connectors by connector id
      const distinctConnectors = [...baseConnectors, ...solanaConnectors, ...suiConnectors].filter(
        (connector, index, self) => index === self.findIndex((t) => t.id === connector.id)
      );

      setConnectors(distinctConnectors);
    };

    initializeConnectors();
  }, []);

  useEffect(() => {
    const listeners = [
      on('register', (...wallets) => {
        //ADD SOLANA CONNECTORS WITH WALLET STANDARD (metmask, backpack, etc)
        const solanaAdapters = wrapWalletsWithSolanaAdapters(wallets);
        const solanaConnectors = solanaAdapters.map(
          (adapter) =>
            new SolanaConnector(dappMetadata, adapter, SolanaCluster.DEVNET, ['solana_devnet', 'solana_mainnet_beta'])
        );
        setConnectors((connectors) => [...connectors, ...solanaConnectors]);

        const suiAdapters = wrapWalletsWithSuiAdapters(wallets);
        const suiConnectors = suiAdapters.map(
          (adapter) =>
            new SuiStandardConnnector(dappMetadata, adapter, SUI_DEVNET_CHAIN, ['sui_testnet', 'sui_mainnet'])
        );
        setConnectors((connectors) => [...connectors, ...suiConnectors]);
      }),
    ];
    return () => listeners.forEach((off) => off());
  }, [on]);

  return (
    <ClientWalletContext.Provider value={{ isWalletReady }}>
      <PhoenixPrivyProvider
        appId={appId}
        chainConfigs={chainConfigs}
        connectors={isWalletReady ? connectors : []} // Empty array during SSR
        reconnect="auto"
        enableEvm={enableEvm}
        enableSolana={enableSolana}
        privyConfig={privyConfig}
        evmPrivyConnectorConfig={evmPrivyConnectorConfig}
        solanaPrivyConnectorConfig={solanaPrivyConnectorConfig}
        loggerConfig={loggerConfig}
      >
        {children}
      </PhoenixPrivyProvider>
    </ClientWalletContext.Provider>
  );
};

function wrapWalletsWithSolanaAdapters(wallets: readonly any[]): readonly StandardWalletAdapter[] {
  return wallets.filter(isWalletAdapterCompatibleWallet).map((wallet) => new StandardWalletAdapter({ wallet }));
}

function wrapWalletsWithSuiAdapters(wallets: readonly any[]): readonly Wallet[] {
  return wallets.filter((wallet) => {
    const supportSuiChain = wallet.chains?.some((chain: string) => chain.startsWith('sui:'));
    const supportSuiFeature = Object.keys(wallet.features || {}).some((feature) => feature.startsWith('sui:'));
    return supportSuiChain || supportSuiFeature;
  });
}
