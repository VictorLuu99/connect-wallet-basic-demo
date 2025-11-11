import { useCallback, useEffect, useRef } from 'react';
import { IConnectorCallback } from '../interfaces/IConnector';
import { useWalletConnectors } from '../contexts/WalletContext';

type ConnectHandler = (connectorId: string, address: string, chainId?: string) => void | Promise<void>;
type DisconnectHandler = (connectorId: string, address: string) => void | Promise<void>;
type ChainChangedHandler = (connectorId: string, chainId: string) => void | Promise<void>;
type AccountChangedHandler = (connectorId: string, addresses: string[]) => void | Promise<void>;

interface WalletConnectorEventProps {
  onConnect?: ConnectHandler;
  onDisconnect?: DisconnectHandler;
  onChainChanged?: ChainChangedHandler;
  onAccountChanged?: AccountChangedHandler;
}

/**
 * Hook to handle wallet connector events
 *
 * @param props Event handlers for wallet connector events
 */
export function useWalletConnectorEvent({
  onConnect,
  onDisconnect,
  onChainChanged,
  onAccountChanged,
}: WalletConnectorEventProps) {
  const { connectors } = useWalletConnectors();
  const handlersRef = useRef({ onConnect, onDisconnect, onChainChanged, onAccountChanged });

  // Update handlers reference when they change
  useEffect(() => {
    handlersRef.current = { onConnect, onDisconnect, onChainChanged, onAccountChanged };
  }, [onConnect, onDisconnect, onChainChanged, onAccountChanged]);

  // Create connector callback
  const connectorCallback = useCallback(() => {
    const callback: IConnectorCallback = {
      async onConnect(connectorId: string, address: string, chainId?: string) {
        if (handlersRef.current.onConnect) {
          await handlersRef.current.onConnect(connectorId, address, chainId);
        }
      },
      async onDisconnect(connectorId: string, address: string) {
        if (handlersRef.current.onDisconnect) {
          await handlersRef.current.onDisconnect(connectorId, address);
        }
      },
      async onChainChanged(connectorId: string, chainId: string) {
        if (handlersRef.current.onChainChanged) {
          await handlersRef.current.onChainChanged(connectorId, chainId);
        }
      },
      async onAccountChanged(connectorId: string, addresses: string[]) {
        if (handlersRef.current.onAccountChanged) {
          await handlersRef.current.onAccountChanged(connectorId, addresses);
        }
      },
    };
    return callback;
  }, []);

  // Register and unregister callback for each active connector
  useEffect(() => {
    const callback = connectorCallback();

    // Register callback with all active connectors
    Object.values(connectors).forEach((connector) => {
      connector.registerConnectorCallback(callback);
    });

    // Cleanup: unregister callbacks when component unmounts
    return () => {
      Object.values(connectors).forEach((connector) => {
        connector.unregisterConnectorCallback(callback);
      });
    };
  }, [connectors, connectorCallback]);
}

