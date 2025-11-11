import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IConnector } from '../interfaces/IConnector';
import { IWallet } from '../interfaces/IWallet';
import { IChain, IChainConfig } from '../interfaces/Chain';
import { useWalletConnectors } from '../contexts/WalletContext';
import { ConnectorStatus } from '../types';
import { useWalletConnectorEvent } from './useWalletConnectorEvent';
import { logger } from '../utils/Logger';

export interface WalletState<W = any> {
  connector: IConnector | null;
  status: ConnectorStatus;
  isConnected: boolean;
  isConnecting: boolean;
  isDisconnected: boolean;
  hasError: boolean;
  isInstalled: boolean | null;
  isWalletReady: boolean;
  address: string | null;
  chainId: string | null;
  connect: () => Promise<any>;
  disconnect: () => Promise<void>;
  switchChain: (chainId: string) => Promise<W>;
  wallet: W | null;
  getWallet: () => W | null;
}

export interface UseWalletCallbacks<W = any> {
  onConnect?: (cId: string, addr: string, wallet: W, chainConfig?: IChainConfig) => void;
  onDisconnect?: (cId: string) => void;
  onAccountChanged?: (cId: string, address: string, wallet: W) => void;
  onChainChanged?: (cId: string, wallet: W, chainConfig?: IChainConfig) => void;
}

/**
 * Base wallet hook - preserves all original logic from phoenix-wallet
 * @internal Use app-specific useWallet wrapper instead
 */
export function useWalletBase<W = any>(
  connectorId: string,
  createWallet: (
    connector: IConnector,
    address: string,
    chainId: string,
    chainConfigs: IChainConfig[]
  ) => W | null,
  callbacks: UseWalletCallbacks<W> = {}
): WalletState<W> {
  const walletContext = useWalletConnectors();
  const { connectors, activeConnectors, connectorStatuses, chainConfigs, reconnect } = walletContext;

  // State for tracking transitional statuses (connecting, error)
  const [transitionalStatus, setTransitionalStatus] = useState<ConnectorStatus | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // Track connection attempts to prevent race conditions
  const connectionAttemptRef = useRef<number>(0);
  const hasAttemptedReconnect = useRef<boolean>(false);
  const initializedRef = useRef<boolean>(false);
  const walletRef = useRef<W | null>(null);

  // Get the connector instance
  const connector = useMemo(
    () => activeConnectors[connectorId] || connectors.find((c) => c.id === connectorId) || null,
    [activeConnectors, connectors, connectorId]
  );

  // Get current status, prioritizing transitional status
  const status = useMemo(() => {
    if (transitionalStatus) return transitionalStatus;
    return connectorStatuses[connectorId] || ConnectorStatus.DISCONNECTED;
  }, [connectorStatuses, connectorId, transitionalStatus]);

  // Initialize wallet state on first load
  useEffect(() => {
    const initializeWalletState = async () => {
      if (!connector || initializedRef.current) return;

      initializedRef.current = true;

      try {
        const isConnectedResult = await connector.isConnected();

        if (isConnectedResult) {
          const addresses = await connector.getConnectedAddresses();
          if (addresses && addresses.length > 0) {
            setAddress(addresses[0]);

            try {
              const currentChainId = await connector.getChainId();
              if (currentChainId) {
                setChainId(currentChainId);
              }
            } catch (chainError) {
              logger.error(`Connected to ${connectorId} but failed to get chain ID:`, chainError);
            }
          }
        }

        setIsInitialized(true);
      } catch (error) {
        logger.error(`Error initializing wallet state for ${connectorId}:`, error);
        setIsInitialized(true);
      }
    };

    initializeWalletState();
  }, [connector, connectorId]);

  // Attempt auto-reconnect if needed
  useEffect(() => {
    const attemptReconnect = async () => {
      if (!connector || hasAttemptedReconnect.current || reconnect !== 'auto') {
        return;
      }

      hasAttemptedReconnect.current = true;

      try {
        if (status === ConnectorStatus.DISCONNECTED) {
          const isConnectedResult = await connector.isConnected();

          if (isConnectedResult) {
            setTransitionalStatus(ConnectorStatus.CONNECTING);

            const result = await connector.connect();

            if (result?.address) {
              setAddress(result.address);

              if (result.chainId) {
                setChainId(result.chainId);
              } else {
                try {
                  const chainIdResult = await connector.getChainId();
                  if (chainIdResult) {
                    setChainId(chainIdResult);
                  }
                } catch (chainError) {
                  logger.error(`Connected to ${connectorId} but failed to get chain ID:`, chainError);
                }
              }
            }
          }
        }
      } catch (error) {
        logger.error(`Failed to auto-reconnect to ${connectorId}:`, error);
        setTransitionalStatus(ConnectorStatus.ERROR);
      }
    };

    attemptReconnect();
  }, [connector, connectorId, status, reconnect]);

  // Check if wallet is installed
  useEffect(() => {
    const checkWalletInstalled = async () => {
      if (connector) {
        try {
          const installed = await connector.isInstalled();
          setIsInstalled(installed);
        } catch (error) {
          logger.error(`Failed to check if ${connector.name} is installed:`, error);
          setIsInstalled(false);
        }
      } else {
        setIsInstalled(null);
      }
    };

    checkWalletInstalled();
  }, [connector]);

  // Clear transitional status when context status changes
  useEffect(() => {
    if (connectorStatuses[connectorId]) {
      if (connectorStatuses[connectorId] === ConnectorStatus.CONNECTED) {
        setTransitionalStatus(null);
      }
    }
  }, [connectorStatuses, connectorId]);

  // Event listeners for status changes (first set - for state updates)
  useWalletConnectorEvent({
    onConnect: (cId, addr, chain) => {
      if (cId === connectorId) {
        setTransitionalStatus(null);
        setAddress(addr);
        if (chain) {
          setChainId(chain);
        }
      }
    },
    onDisconnect: (cId) => {
      if (cId === connectorId) {
        setTransitionalStatus(null);
        setAddress(null);
        setChainId(null);
      }
    },
    onAccountChanged: (cId, addresses) => {
      if (cId === connectorId) {
        if (addresses.length > 0) {
          setAddress(addresses[0]);
        } else {
          setAddress(null);
        }
      }
    },
    onChainChanged: (cId, chain) => {
      if (cId === connectorId) {
        setChainId(chain);
      }
    },
  });

  // Connect function implementation
  const connect = useCallback(async () => {
    if (!connector) {
      throw new Error(`Connector with id "${connectorId}" not found`);
    }

    try {
      const currentAttempt = ++connectionAttemptRef.current;
      setTransitionalStatus(ConnectorStatus.CONNECTING);

      const result = await connector.connect();

      if (currentAttempt === connectionAttemptRef.current) {
        if (result?.address) {
          setTimeout(() => {
            if (transitionalStatus === ConnectorStatus.CONNECTING) {
              setTransitionalStatus(null);
              setAddress(result.address);

              if (result.chainId) {
                setChainId(result.chainId);
              } else {
                connector
                  .getChainId()
                  .then((chainIdResult) => {
                    if (chainIdResult) {
                      setChainId(chainIdResult);
                    }
                  })
                  .catch((error) => {
                    logger.error('Error getting chain ID:', error);
                  });
              }
            }
          }, 500);
        }
      }

      return result;
    } catch (error) {
      setTransitionalStatus(ConnectorStatus.ERROR);
      logger.error(`Failed to connect to ${connectorId}:`, error);
      throw error;
    }
  }, [connector, connectorId, transitionalStatus]);

  // Disconnect function implementation
  const disconnect = useCallback(async () => {
    if (!connector || status !== ConnectorStatus.CONNECTED) {
      return;
    }

    try {
      await connector.disconnect();

      setTimeout(() => {
        if (status === ConnectorStatus.CONNECTED) {
          setTransitionalStatus(ConnectorStatus.DISCONNECTED);
          setAddress(null);
        }
      }, 500);
    } catch (error) {
      logger.error(`Failed to disconnect from ${connectorId}:`, error);
      throw error;
    }
  }, [connector, connectorId, status]);

  // SwitchChain function implementation
  const switchChain = useCallback(
    async (newChainId: string) => {
      if (!connector || status !== ConnectorStatus.CONNECTED) {
        throw new Error('Wallet not connected');
      }

      try {
        await connector.switchChainId(newChainId);
        while ((walletRef.current as any)?.chain?.id.toString() !== newChainId) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
        return walletRef.current!;
      } catch (error) {
        logger.error(`Failed to switch chain to ${newChainId}:`, error);
        throw error;
      }
    },
    [connector, status]
  );

  // Fetch address and chainId when connector or status changes
  useEffect(() => {
    const fetchConnectionData = async () => {
      if (connector && status === ConnectorStatus.CONNECTED) {
        try {
          const addresses = await connector.getConnectedAddresses();
          if (addresses && addresses.length > 0) {
            setAddress(addresses[0]);

            try {
              const currentChainId = await connector.getChainId();
              if (currentChainId) {
                setChainId(currentChainId);
              }
            } catch (chainError) {
              console.error('Error getting chain ID:', chainError);
            }
          } else {
            setAddress(null);
          }
        } catch (error) {
          logger.error('Error getting connected addresses:', error);
          setAddress(null);
        }
      } else if (status !== ConnectorStatus.CONNECTING) {
        setAddress(null);
        setChainId(null);
      }
    };

    fetchConnectionData();
  }, [connector, status]);

  // Create wallet instance
  const wallet = useMemo(() => {
    if (status !== ConnectorStatus.CONNECTED || !connector || !address || !chainId) {
      return null;
    }

    try {
      return createWallet(connector, address, chainId, chainConfigs);
    } catch (error) {
      logger.error('Error creating wallet:', error);
      return null;
    }
  }, [status, address, chainId, connector, chainConfigs, createWallet]);

  // Update wallet ref
  useEffect(() => {
    if (wallet) {
      walletRef.current = wallet;
    }
  }, [wallet]);

  // Event listeners for callbacks (second set - for user callbacks)
  useWalletConnectorEvent({
    onConnect: (cId, addr, chain) => {
      if (cId === connectorId) {
        logger.info(`Connector ${cId} connected with address ${addr} on chain ${chain || 'unknown'}`);
        setTransitionalStatus(null);
        setAddress(addr);
        if (chain) {
          setChainId(chain);
        }

        setTimeout(() => {
          const wallet = walletRef.current;
          const chainConfig = chainConfigs.find((c) => c.id === chain);
          if (wallet) {
            callbacks.onConnect?.(cId, addr, wallet, chainConfig);
          }
        }, 100);
      }
    },
    onDisconnect: (cId) => {
      if (cId === connectorId) {
        logger.info(`Connector ${cId} disconnected`);
        setTransitionalStatus(null);
        setAddress(null);
        setChainId(null);
        callbacks.onDisconnect?.(cId);
      }
    },
    onAccountChanged: (cId, addresses) => {
      if (cId === connectorId) {
        logger.info(`Connector ${cId} accounts changed to ${addresses.join(', ')}`);
        if (addresses.length > 0) {
          setAddress(addresses[0]);
        } else {
          setAddress(null);
        }
        setTimeout(() => {
          const wallet = walletRef.current;
          if (wallet) {
            if (addresses.length > 0 && addresses[0] !== (wallet as any).address) {
              callbacks.onAccountChanged?.(cId, addresses[0], wallet);
            }
          }
        }, 100);
      }
    },
    onChainChanged: (cId, chain) => {
      if (cId === connectorId) {
        logger.info(`Connector ${cId} chain changed to ${chain}`);
        setChainId(chain);

        setTimeout(() => {
          const wallet = walletRef.current;
          const chainConfig = chainConfigs.find((c) => c.id === chain);
          if (wallet) {
            callbacks.onChainChanged?.(cId, wallet, chainConfig);
          }
        }, 100);
      }
    },
  });

  // Derive status booleans
  const isConnected = status === ConnectorStatus.CONNECTED;
  const isConnecting = status === ConnectorStatus.CONNECTING;
  const isDisconnected = status === ConnectorStatus.DISCONNECTED;
  const hasError = status === ConnectorStatus.ERROR;

  // Determine if wallet is fully ready for use
  const isWalletReady = useMemo(() => {
    return isInitialized && isConnected && !!address && !!chainId && !!wallet && !isConnecting && !hasError;
  }, [isInitialized, isConnected, address, chainId, wallet, isConnecting, hasError]);

  return {
    connector,
    wallet,
    status,
    isConnected,
    isConnecting,
    isDisconnected,
    hasError,
    isInstalled,
    isWalletReady,
    address,
    chainId,
    connect,
    disconnect,
    switchChain,
    getWallet: () => walletRef.current,
  };
}

