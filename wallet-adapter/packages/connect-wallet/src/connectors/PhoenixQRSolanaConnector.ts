/**
 * Phoenix QR Solana Connector
 * QR-code based wallet connector for Solana using phoenix-dapp SDK
 */

import { SolanaConnector, SolanaCluster } from '@phoenix-wallet/solana';
import { DappMetadata, ChainType } from '@phoenix-wallet/core';
import { PhoenixConnectorConfig, PhoenixSession, QRCodeOptions } from '../types';
import { PhoenixDappClientWrapper } from './PhoenixDappClientWrapper';
import { SessionPersistence } from '../utils/sessionPersistence';
import { EventBridge } from '../utils/eventBridge';
import { getDefaultStorageAdapter } from '../utils/storage';
import { BaseWalletAdapter } from '@solana/wallet-adapter-base';

/**
 * Phoenix QR Solana Connector
 * Extends SolanaConnector to provide QR-based wallet connection
 */
export class PhoenixQRSolanaConnector extends SolanaConnector {
  private phoenixClient: PhoenixDappClientWrapper;
  private phoenixConfig: Required<Omit<PhoenixConnectorConfig, 'qrOptions'>> & { qrOptions?: QRCodeOptions };
  private sessionPersistence: SessionPersistence;
  private eventBridge: EventBridge;
  private currentSession: PhoenixSession | undefined;
  private virtualAdapter: BaseWalletAdapter | null = null;

  constructor(
    phoenixConfig: PhoenixConnectorConfig,
    dappMetadata: DappMetadata,
    defaultCluster: SolanaCluster = SolanaCluster.MAINNET,
    supportedChains: string[]
  ) {
    // Create a virtual adapter for SolanaConnector
    const adapter = createPhoenixSolanaAdapter();

    super(dappMetadata, adapter, defaultCluster, supportedChains);

    // Setup phoenix configuration
    const storage = phoenixConfig.storage || getDefaultStorageAdapter();
    this.phoenixConfig = {
      serverUrl: phoenixConfig.serverUrl,
      reconnect: phoenixConfig.reconnect ?? true,
      reconnectAttempts: phoenixConfig.reconnectAttempts ?? 5,
      reconnectDelay: phoenixConfig.reconnectDelay ?? 2000,
      enablePersistence: phoenixConfig.enablePersistence ?? true,
      storage,
      ...(phoenixConfig.qrOptions && { qrOptions: phoenixConfig.qrOptions }),
    };

    // Initialize phoenix client
    this.phoenixClient = new PhoenixDappClientWrapper(this.phoenixConfig);

    // Initialize session persistence
    this.sessionPersistence = new SessionPersistence(
      storage,
      this.phoenixConfig.enablePersistence
    );

    // Initialize event bridge
    this.eventBridge = new EventBridge();

    // Setup event listeners
    this.setupPhoenixEventListeners();
  }

  /**
   * Check if wallet is installed
   * For QR connectors, this is always true
   */
  async isInstalled(): Promise<boolean> {
    return true; // QR-based connection doesn't require installation
  }

  /**
   * Get installation link
   */
  get installLink(): string {
    return ''; // No installation needed
  }

  /**
   * Connect wallet via QR code
   * Overrides base SolanaConnector.connect()
   */
  async connect(): Promise<{ address: string; chainId: string }> {
    try {
      console.log('[Phoenix QR Solana] Starting connection...');

      // Check for stored session first
      const storedSession = await this.sessionPersistence.loadSession(this.id);
      if (storedSession && storedSession.connected) {
        console.log('[Phoenix QR Solana] Restoring session:', storedSession);

        this.currentSession = storedSession;
        this.activeAddress = storedSession.address;

        // Emit restored session event
        this.eventBridge.emitSessionRestored(storedSession);

        // Trigger connection event
        await this.handleEventConnect(this.activeAddress!, this.phoenixChainId);

        return {
          address: this.activeAddress!,
          chainId: this.phoenixChainId,
        };
      }

      // Generate new QR code connection
      const { uri, uuid } = await this.phoenixClient.connect();

      console.log('[Phoenix QR Solana] QR Code generated. URI:', uri);
      console.log('[Phoenix QR Solana] Session UUID:', uuid);

      // Emit QR generated event for UI to display
      this.eventBridge.emitQRGenerated(uri);

      // Wait for wallet to scan and connect
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout - wallet did not scan QR code'));
        }, 120000); // 2 minute timeout

        const onConnected = async (session: PhoenixSession) => {
          clearTimeout(timeout);
          this.phoenixClient.off('session_connected', onConnected);

          console.log('[Phoenix QR Solana] Wallet connected:', session);

          this.currentSession = session;
          this.activeAddress = session.address;

          // Save session for persistence
          await this.sessionPersistence.saveSession(this.id, session);

          // Trigger connection event
          await this.handleEventConnect(this.activeAddress!, this.phoenixChainId);

          resolve({
            address: this.activeAddress!,
            chainId: this.phoenixChainId,
          });
        };

        this.phoenixClient.once('session_connected', onConnected);
      });
    } catch (error: any) {
      console.error('[Phoenix QR Solana] Connection failed:', error);
      this.eventBridge.emitError(error);
      throw error;
    }
  }

  /**
   * Disconnect wallet
   * Overrides base SolanaConnector.disconnect()
   */
  async disconnect(): Promise<void> {
    try {
      console.log('[Phoenix QR Solana] Disconnecting...');

      const currentAddress = this.activeAddress;

      // Disconnect phoenix client
      this.phoenixClient.disconnect();

      // Clear session
      this.currentSession = undefined;
      this.activeAddress = undefined;

      // Clear persisted session
      await this.sessionPersistence.clearSession(this.id);

      // Trigger disconnect event
      if (currentAddress) {
        await this.handleEventDisconnect(currentAddress);
      }

      console.log('[Phoenix QR Solana] Disconnected successfully');
    } catch (error: any) {
      console.error('[Phoenix QR Solana] Disconnect failed:', error);
      throw error;
    }
  }

  /**
   * Get connected addresses
   * Overrides base SolanaConnector.getConnectedAddresses()
   */
  async getConnectedAddresses(): Promise<string[]> {
    if (this.activeAddress) {
      return [this.activeAddress];
    }
    return [];
  }

  /**
   * Get current session information
   */
  getSession(): PhoenixSession | undefined {
    return this.currentSession;
  }

  /**
   * Get phoenix client for direct access
   */
  getPhoenixClient(): PhoenixDappClientWrapper {
    return this.phoenixClient;
  }

  /**
   * Get event bridge for subscribing to events
   */
  getEventBridge(): EventBridge {
    return this.eventBridge;
  }

  /**
   * Setup phoenix event listeners
   */
  private setupPhoenixEventListeners(): void {
    // Session connected
    this.phoenixClient.on('session_connected', (session: PhoenixSession) => {
      this.eventBridge.emitSessionConnected(session);
    });

    // Session disconnected
    this.phoenixClient.on('session_disconnected', () => {
      this.eventBridge.emitSessionDisconnected();
    });

    // QR generated
    this.phoenixClient.on('qr_generated', (uri: string) => {
      this.eventBridge.emitQRGenerated(uri);
    });

    // Errors
    this.phoenixClient.on('error', (error: Error) => {
      this.eventBridge.emitError(error);
    });
  }

  private get phoenixChainId(): string {
    return 'solana_' + this.cluster.toLowerCase().replace('-', '_');
  }
}

/**
 * Create a virtual Solana adapter for phoenix connection
 * This adapter bridges phoenix protocol to Solana wallet adapter interface
 */
function createPhoenixSolanaAdapter(): BaseWalletAdapter {
  return {
    name: 'Phoenix QR',
    url: '',
    icon: '',
    readyState: 'Installed' as any,
    publicKey: null,
    connecting: false,
    connected: false,

    connect: async () => {
      // Connection is handled by PhoenixQRSolanaConnector
      throw new Error('Use PhoenixQRSolanaConnector.connect() instead');
    },

    disconnect: async () => {
      // Disconnection is handled by PhoenixQRSolanaConnector
    },

    on: () => {},
    off: () => {},
    emit: () => {},
    removeListener: () => {},
    removeAllListeners: () => {},
    listenerCount: () => 0,
    listeners: () => [],
    once: () => {},
    addListener: () => {},
    prependListener: () => {},
    prependOnceListener: () => {},
    eventNames: () => [],
    getMaxListeners: () => 0,
    setMaxListeners: () => {},
    rawListeners: () => [],
  } as any;
}
