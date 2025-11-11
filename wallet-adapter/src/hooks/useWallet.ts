import { useCallback } from 'react';
import { useWalletBase, ChainType, type UseWalletCallbacks, type WalletState } from '@phoenix-wallet/core';
import { EvmWallet, EvmChain, EvmConnector } from '@phoenix-wallet/evm';
import { SolanaWallet, SolanaChain, SolanaConnector } from '@phoenix-wallet/solana';
import { AptosWallet, AptosChain, AptosConnector } from '@phoenix-wallet/aptos';
import { SuiWallet, SuiChain, SuiConnector } from '@phoenix-wallet/sui';
import type { IConnector, IChainConfig } from '@phoenix-wallet/core';

/**
 * Universal wallet hook - works with any chain
 * Just pass the connectorId and it automatically handles the rest!
 * 
 * @example
 * ```tsx
 * // Works for any chain!
 * const { wallet, connect, disconnect, isConnected } = useWallet('metamask');
 * const { wallet, connect, disconnect, isConnected } = useWallet('phantom');
 * const { wallet, connect, disconnect, isConnected } = useWallet('petra');
 * ```
 */
export function useWallet<W = any>(
  connectorId: string,
  callbacks?: UseWalletCallbacks<any>
): WalletState<W> {
  const walletFactory = useCallback(
    (connector: IConnector, address: string, chainId: string, chainConfigs: IChainConfig[]) => {
      try {
        // Find the chain config from the provided chainConfigs
        const chainConfig = chainConfigs.find(
          (c) => c.id === chainId || c.chainId?.toString() === chainId
        );

        if (!chainConfig) {
          console.warn(`Chain with ID ${chainId} not found in chainConfigs`);
          return null;
        }

        switch (connector.chainType) {
          case ChainType.EVM: {
            const evmConnector = connector as EvmConnector;
            const evmChain = new EvmChain(chainConfig.name, chainConfig as any);
            const walletClient = (evmConnector as any).createWalletClient(evmChain);
            return new EvmWallet(address, evmChain, evmConnector, walletClient) as any;
          }

          case ChainType.SOLANA: {
            const solanaConnector = connector as SolanaConnector;
            const solanaChain = new SolanaChain(chainConfig.name, chainConfig as any);
            const walletClient = (solanaConnector as any).createWalletClient(solanaChain);
            return new SolanaWallet(address, solanaChain, solanaConnector, walletClient) as any;
          }

          case ChainType.APTOS: {
            const aptosConnector = connector as AptosConnector;
            const aptosChain = new AptosChain(chainConfig.name, chainConfig as any);
            const walletClient = (aptosConnector as any).createWalletClient(aptosChain);
            return new AptosWallet(address, aptosChain, aptosConnector, walletClient) as any;
          }

          case ChainType.SUI: {
            const suiConnector = connector as SuiConnector;
            const suiChain = new SuiChain(chainConfig.name, chainConfig as any);
            const walletClient = (suiConnector as any).createWalletClient(suiChain);
            return new SuiWallet(address, suiChain, suiConnector, walletClient) as any;
          }

          default:
            console.warn(`Unsupported chain type: ${connector.chainType}`);
            return null;
        }
      } catch (error) {
        console.error('Failed to create wallet:', error);
        return null;
      }
    },
    []
  );

  return useWalletBase<any>(
    connectorId,
    walletFactory,
    callbacks
  );
}

