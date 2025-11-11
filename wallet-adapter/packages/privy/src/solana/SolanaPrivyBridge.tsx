import React, { useEffect, useMemo, useRef } from 'react';
import { useSendTransaction, useSignMessage, useSignTransaction, useSolanaWallets } from '@privy-io/react-auth/solana';
import { SolanaPrivyConnector } from './SolanaPrivyConnector';
import { SolanaPrivyContext, SolanaPrivyWallet } from './SolanaPrivyContext';
import { SolanaTransaction } from '@phoenix-wallet/solana';
import { Connection } from '@solana/web3.js';
import { logger } from '@phoenix-wallet/core';

interface SolanaPrivyBridgeProps {
  children: React.ReactNode;
  solanaPrivyConnector: SolanaPrivyConnector;
}

// Custom hook to bridge Privy Solana wallets with Phoenix Wallet
export const useSolanaPrivyBridge = (solanaPrivyConnector: SolanaPrivyConnector) => {
  const solanaHooks = useSolanaWallets();
  const { signTransaction } = useSignTransaction();
  const { sendTransaction } = useSendTransaction();
  const { signMessage } = useSignMessage();
  const previousWalletsCount = useRef<number>(0);
  const connection = useMemo(() => new Connection(solanaPrivyConnector.getRpcUrl()), [solanaPrivyConnector]);

  // Convert Privy Solana hooks to our SolanaPrivyContext interface
  const solanaPrivyContext: SolanaPrivyContext = {
    ready: solanaHooks.ready,
    wallets: solanaHooks.wallets.map(
      (wallet): SolanaPrivyWallet => ({
        address: wallet.address,
        chainId: (wallet as any).chainId || solanaPrivyConnector.chainId,
        walletClient: wallet,
        publicKey: wallet.address,
        disconnect: async () => {
          // Use Privy's disconnect method for this specific wallet
          // This might need to be implemented based on Privy's API
          logger.warn('Individual wallet disconnect not implemented yet');
        },
        switchCluster: async (clusterId: string) => {
          // Implement cluster switching if supported by Privy
          logger.warn('Cluster switching not implemented yet', clusterId);
        },
        signTransaction: async (transaction: SolanaTransaction) => {
          const rs = await signTransaction({
            transaction,
            connection,
          });
          return rs;
        },
        signAllTransactions: async (transactions: SolanaTransaction[]) => {
          const rs = await wallet.signAllTransactions(transactions);
          return rs as any;
        },
        signMessage: async (message: any) => {
          const rs = await signMessage({ message });
          return rs as any;
        },
        sendTransaction: async (transaction: SolanaTransaction) => {
          const rs = await sendTransaction({
            transaction,
            connection,
          });
          return rs.signature;
        },
      })
    ),
    connectWallet: async (): Promise<SolanaPrivyWallet> => {
      const newWallet: any = await solanaHooks.createWallet();
      return {
        address: newWallet.address,
        chainId: newWallet.chainId || solanaPrivyConnector.chainId,
        walletClient: newWallet,
        publicKey: newWallet.address,
        disconnect: async () => {
          logger.warn('Individual wallet disconnect not implemented yet');
        },
        switchCluster: async (clusterId: string) => {
          logger.warn('Cluster switching not implemented yet', clusterId);
        },
        signTransaction: newWallet.signTransaction,
        signAllTransactions: newWallet.signAllTransactions,
        signMessage: newWallet.signMessage,
      };
    },
    createWallet: solanaHooks.createWallet
      ? async (): Promise<SolanaPrivyWallet> => {
          const newWallet: any = await solanaHooks.createWallet!();
          return {
            address: newWallet.address,
            chainId: newWallet.chainId || solanaPrivyConnector.chainId,
            walletClient: newWallet,
            publicKey: newWallet.address,
            disconnect: async () => {
              logger.warn('Individual wallet disconnect not implemented yet');
            },
            switchCluster: async (clusterId: string) => {
              logger.warn('Cluster switching not implemented yet', clusterId);
            },
            signTransaction: newWallet.signTransaction,
            signAllTransactions: newWallet.signAllTransactions,
            signMessage: newWallet.signMessage,
          };
        }
      : undefined,
    connecting: (solanaHooks as any).connecting,
    connected: solanaHooks.wallets.length > 0,
  };

  // Initialize the connector with Solana Privy context
  useEffect(() => {
    if (solanaHooks.ready) {
      solanaPrivyConnector.setSolanaPrivyContext(solanaPrivyContext);
    }
  }, [solanaHooks.ready, solanaPrivyConnector, solanaPrivyContext]);

  // Handle wallet connection events
  useEffect(() => {
    if (!solanaHooks.ready) return;

    const currentWalletsCount = solanaHooks.wallets.length;

    // Handle new wallet connection
    if (previousWalletsCount.current < currentWalletsCount) {
      const newWallet: any = solanaHooks.wallets[currentWalletsCount - 1];
      if (newWallet?.address) {
        solanaPrivyConnector.handleEventConnect(newWallet.address, newWallet.chainId || 'solana_mainnet_beta');
      }
    }

    // Handle wallet disconnection
    if (previousWalletsCount.current > currentWalletsCount) {
      // Get addresses from connector to know which was disconnected
      solanaPrivyConnector.getConnectedAddresses().then((addresses) => {
        const currentAddresses = solanaHooks.wallets.map((w) => w.address);
        const disconnectedAddresses = addresses.filter((addr) => !currentAddresses.includes(addr));

        disconnectedAddresses.forEach((address) => {
          solanaPrivyConnector.handleEventDisconnect(address);
        });
      });
    }

    previousWalletsCount.current = currentWalletsCount;
  }, [solanaHooks.ready, solanaHooks.wallets.length, solanaPrivyConnector]);

  // Handle wallet address changes
  useEffect(() => {
    if (solanaHooks.wallets.length > 0) {
      const addresses = solanaHooks.wallets.map((wallet) => wallet.address);
      solanaPrivyConnector.handleEventAccountChanged(addresses);
    }
  }, [solanaHooks.wallets.map((w) => w.address).join(','), solanaPrivyConnector]);

  // Handle chain/cluster changes
  useEffect(() => {
    if (solanaHooks.wallets.length > 0) {
      // For simplicity, use the first wallet's chainId
      const primaryWallet: any = solanaHooks.wallets[0];
      if (primaryWallet?.chainId) {
        solanaPrivyConnector.handleEventChainChanged(primaryWallet.chainId);
      }
    }
  }, [solanaHooks.wallets.map((w: any) => w.chainId).join(','), solanaPrivyConnector]);

  return solanaPrivyContext;
};

// Component wrapper for SolanaPrivyBridge
export const SolanaPrivyBridge: React.FC<SolanaPrivyBridgeProps> = ({ children, solanaPrivyConnector }) => {
  useSolanaPrivyBridge(solanaPrivyConnector);
  return <>{children}</>;
};
