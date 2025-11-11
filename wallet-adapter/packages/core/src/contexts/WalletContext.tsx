import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { IChainConfig } from '../interfaces/Chain';
import { IConnector, IConnectorCallback } from '../interfaces/IConnector';
import { ConnectorStatus, WalletContextState, WalletProviderProps } from '../types';
import { logger } from '../utils/Logger';

// Default empty arrays for context
const DEFAULT_CONNECTORS: IConnector[] = [];
const DEFAULT_CHAIN_CONFIGS: IChainConfig[] = [];

// Create context with default values
const WalletContext = createContext<WalletContextState>({
  connectors: DEFAULT_CONNECTORS,
  chainConfigs: DEFAULT_CHAIN_CONFIGS,
  connectorStatuses: {},
  activeConnectors: {},
  reconnect: 'none',
});

export const useWalletConnectors = () => useContext(WalletContext);

export const WalletProvider: React.FC<WalletProviderProps> = ({
  children,
  connectors = [],
  chainConfigs = [],
  reconnect = 'none',
  loggerConfig,
}) => {
  const [activeConnectors, setActiveConnectors] = useState<{ [key: string]: IConnector }>({});
  const [connectorStatuses, setConnectorStatuses] = useState<{ [key: string]: ConnectorStatus }>({});

  // Configure logger on mount
  useEffect(() => {
    if (loggerConfig) {
      logger.configure(loggerConfig);
    }
  }, [loggerConfig]);

  // Initialize connector statuses
  useEffect(() => {
    const initializeConnectorStatuses = async () => {
      const initialStatuses: { [key: string]: ConnectorStatus } = {};

      // First, set all connectors to a default DISCONNECTED state
      connectors.forEach((connector) => {
        initialStatuses[connector.id] = ConnectorStatus.DISCONNECTED;
      });

      // Set initial statuses first to avoid UI flicker
      setConnectorStatuses(initialStatuses);

      // Then check for actual connection states asynchronously
      if (connectors.length > 0) {
        for (const connector of connectors) {
          try {
            const isConnected = await connector.isConnected();
            if (isConnected) {
              // Update with the real status
              setConnectorStatuses((prev) => ({
                ...prev,
                [connector.id]: ConnectorStatus.CONNECTED,
              }));

              // Also add to active connectors
              setActiveConnectors((prev) => ({
                ...prev,
                [connector.id]: connector,
              }));
            }
          } catch (error) {
            logger.error(`Error checking connection status for ${connector.id}:`, error);
          }
        }
      }
    };

    initializeConnectorStatuses();
  }, [connectors]);

  // Auto reconnect wallets from last session if enabled
  useEffect(() => {
    const autoReconnect = async () => {
      if (reconnect === 'auto') {
        // Attempt to reconnect all connectors that might have active sessions
        for (const connector of connectors) {
          try {
            const isConnected = await connector.isConnected();
            if (isConnected) {
              logger.info(`Auto-reconnecting to ${connector.id}...`);
              const result = await connector.connect();
              if (result) {
                logger.info(`Successfully reconnected to ${connector.id} and chain ${result.chainId}`);
              }
            }
          } catch (error) {
            logger.error(`Failed to auto-reconnect to ${connector.id}:`, error);
          }
        }
      }
    };

    autoReconnect();
  }, [connectors, reconnect]);

  // Register global event listeners for all connectors
  useEffect(() => {
    const connectorCallback: IConnectorCallback = {
      async onConnect(connectorId: string, address: string, chainId?: string) {
        // When a connector connects, update its status and add it to active connectors
        const connector = connectors.find((c) => c.id === connectorId);
        if (connector) {
          setConnectorStatuses((prev) => ({
            ...prev,
            [connectorId]: ConnectorStatus.CONNECTED,
          }));

          setActiveConnectors((prev) => ({
            ...prev,
            [connectorId]: connector,
          }));
        }
      },
      async onDisconnect(connectorId: string, address: string) {
        // When a connector disconnects, update its status and remove from active connectors
        setConnectorStatuses((prev) => ({
          ...prev,
          [connectorId]: ConnectorStatus.DISCONNECTED,
        }));

        setActiveConnectors((prev) => {
          const newState = { ...prev };
          delete newState[connectorId];
          return newState;
        });
      },
      async onChainChanged(connectorId: string, chainId: string) {
        // Chain changes don't affect connection status
        logger.info(`Chain changed for ${connectorId} to ${chainId}`);
      },
      async onAccountChanged(connectorId: string, addresses: string[]) {
        // Account changes don't affect connection status
        logger.info(`Accounts changed for ${connectorId} to ${addresses.join(', ')}`);
      },
    };

    // Register the callback with all connectors
    connectors.forEach((connector) => {
      connector.registerConnectorCallback(connectorCallback);
    });

    // Cleanup when the component unmounts
    return () => {
      connectors.forEach((connector) => {
        connector.unregisterConnectorCallback(connectorCallback);
      });
    };
  }, [connectors]);

  const contextValue = useMemo<WalletContextState>(
    () => ({
      chainConfigs,
      connectors,
      activeConnectors,
      connectorStatuses,
      reconnect,
    }),
    [chainConfigs, connectors, activeConnectors, connectorStatuses, reconnect]
  );

  return <WalletContext.Provider value={contextValue}>{children}</WalletContext.Provider>;
};

