import React, { useEffect, useRef } from 'react';
import { usePrivy, useSendTransaction, useSignMessage, useSignTransaction, useWallets } from '@privy-io/react-auth';
import { PrivyConnector } from './PrivyConnector';
import { PrivyContext } from './PrivyContext';
import { EvmTransaction } from '@phoenix-wallet/evm';
import { prepareTransactionRequest } from './utils';

interface PrivyBridgeProps {
  children: React.ReactNode;
  privyConnector: PrivyConnector;
}

// Custom hook to bridge Privy with Phoenix Wallet
export const usePrivyBridge = (privyConnector: PrivyConnector) => {
  const privyHooks = usePrivy();
  const { signMessage } = useSignMessage();
  const { signTransaction } = useSignTransaction();
  const { sendTransaction } = useSendTransaction();
  const { wallets } = useWallets();
  const wallet = wallets[0];
  const previousAuthState = useRef<boolean>(false);

  // Convert Privy hooks to our PrivyContext interface
  const privyContext: PrivyContext = {
    ready: privyHooks.ready,
    authenticated: privyHooks.authenticated,
    user: privyHooks.user
      ? {
          id: privyHooks.user.id,
          wallet: privyHooks.user.wallet
            ? {
                address: privyHooks.user.wallet.address,
                chainId: (privyHooks.user.wallet as any).chainId,
                walletClient: {
                  ...privyHooks?.user?.wallet,
                  signMessage: async (message: { account: string; message: string }) => {
                    const rs = await signMessage({
                      message: message.message,
                    });
                    return rs.signature;
                  },
                  signTransaction: async (transaction: EvmTransaction) => {
                    const rs = await signTransaction(transaction);
                    return rs.signature;
                  },
                  signAllTransactions: async (_transactions: EvmTransaction[]) => {},
                  sendTransaction: async (transaction: EvmTransaction) => {
                    return sendTransaction(transaction);
                  },
                  sendRawTransaction: async (transaction: string) => {
                    const provider = await wallet.getEthereumProvider();
                    // Send the raw transaction using the provider
                    return await provider.request({
                      method: 'eth_sendRawTransaction',
                      params: [(transaction as any).serializedTransaction],
                    });
                  },
                  prepareTransactionRequest: async (transaction: EvmTransaction) => {
                    return prepareTransactionRequest(transaction, wallet);
                  },
                  switchChain: async (chainId: string) => {
                    return wallet.switchChain(chainId as `0x${string}`);
                  },
                },
              }
            : undefined,
          email: privyHooks.user.email
            ? {
                address: privyHooks.user.email.address,
              }
            : undefined,
          phone: privyHooks.user.phone
            ? {
                number: privyHooks.user.phone.number,
              }
            : undefined,
        }
      : null,
    login: privyHooks.login as any,
    logout: privyHooks.logout,
    connectWallet: privyHooks.connectWallet as any,
    disconnectWallet: (privyHooks as any).disconnectWallet as any,
  };

  // Initialize the connector with Privy context
  useEffect(() => {
    // if (privyHooks.ready) {
    privyConnector.setPrivyContext(privyContext);
    // }
  }, [privyHooks.ready, privyConnector, privyContext]);

  // Handle authentication state changes
  useEffect(() => {
    // if (!privyHooks.ready) return;

    const currentAuthState = privyHooks.authenticated;

    // Handle login event
    if (!previousAuthState.current && currentAuthState && privyHooks.user?.wallet) {
      privyConnector.handleEventConnect(
        privyHooks.user.wallet.address,
        (privyHooks.user.wallet as any).chainId?.toString() || '1'
      );
    }

    // Handle logout event
    if (previousAuthState.current && !currentAuthState) {
      // Get the last known address to properly disconnect
      const addresses = privyConnector.getConnectedAddresses();
      addresses.then((addrs) => {
        if (addrs.length > 0) {
          privyConnector.handleEventDisconnect(addrs[0]);
        }
      });
    }

    previousAuthState.current = currentAuthState;
  }, [privyHooks.ready, privyHooks.authenticated, privyHooks.user, privyConnector]);

  // Handle account changes
  useEffect(() => {
    if (privyHooks.user?.wallet?.address) {
      const addresses = [privyHooks.user.wallet.address];
      privyConnector.handleEventAccountChanged(addresses);
    }
  }, [privyHooks.user?.wallet?.address, privyConnector]);

  // Handle chain changes
  useEffect(() => {
    if ((privyHooks.user?.wallet as any)?.chainId) {
      privyConnector.handleEventChainChanged((privyHooks.user?.wallet as any).chainId.toString());
    }
  }, [(privyHooks.user?.wallet as any)?.chainId, privyConnector]);

  return privyContext;
};

// Component wrapper for PrivyBridge
export const PrivyBridge: React.FC<PrivyBridgeProps> = ({ children, privyConnector }) => {
  usePrivyBridge(privyConnector);
  return <>{children}</>;
};
