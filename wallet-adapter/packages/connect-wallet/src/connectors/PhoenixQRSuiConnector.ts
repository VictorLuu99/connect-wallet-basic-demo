/**
 * Phoenix QR Sui Connector
 * QR-code based wallet connector for Sui using phoenix-dapp SDK
 *
 * NOTE: This connector requires phoenix-dapp SDK to support 'sui' chain type.
 * Currently, the SDK only supports 'evm' and 'solana'. Once the SDK is extended,
 * this connector will be fully functional.
 */

import { SuiConnector, SuiCluster, SuiProvider } from '@phoenix-wallet/sui';
import { ConnectorConfig, DappMetadata, ChainType } from '@phoenix-wallet/core';
import { PhoenixConnectorConfig, PhoenixSession, QRCodeOptions } from '../types';
import { PhoenixDappClientWrapper } from './PhoenixDappClientWrapper';
import { SessionPersistence } from '../utils/sessionPersistence';
import { EventBridge } from '../utils/eventBridge';
import { getDefaultStorageAdapter } from '../utils/storage';

/**
 * Phoenix QR Sui Connector
 * Extends SuiConnector to provide QR-based wallet connection
 */
export class PhoenixQRSuiConnector extends SuiConnector {
  private phoenixClient: PhoenixDappClientWrapper;
  private phoenixConfig: Required<Omit<PhoenixConnectorConfig, 'qrOptions'>> & { qrOptions?: QRCodeOptions };
  private sessionPersistence: SessionPersistence;
  private eventBridge: EventBridge;
  private currentSession: PhoenixSession | undefined;
  private virtualProvider: SuiProvider | null = null;

  constructor(
    connectorConfig: ConnectorConfig,
    phoenixConfig: PhoenixConnectorConfig,
    dappMetadata: DappMetadata,
    defaultCluster: SuiCluster = 'mainnet' as SuiCluster,
    supportedChains: string[]
  ) {
    // Initialize base connector
    super(
      'phoenix_qr_sui',
      connectorConfig,
      dappMetadata,
      defaultCluster,
      supportedChains
    );

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

    // Create virtual provider
    this.virtualProvider = this.createVirtualProvider();
    this.provider = this.virtualProvider;

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
    return ''; // No installation needed for QR connection
  }

  /**
   * Connect wallet via QR code
   * Overrides base SuiConnector.connect()
   */
  async connect(): Promise<{ address: string; chainId: string }> {
    try {
      console.log('[Phoenix QR Sui] Starting connection...');

      // Check for stored session first
      const storedSession = await this.sessionPersistence.loadSession(this.id);
      if (storedSession && storedSession.connected) {
        console.log('[Phoenix QR Sui] Restoring session:', storedSession);

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

      console.log('[Phoenix QR Sui] QR Code generated. URI:', uri);
      console.log('[Phoenix QR Sui] Session UUID:', uuid);

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

          console.log('[Phoenix QR Sui] Wallet connected:', session);

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
      console.error('[Phoenix QR Sui] Connection failed:', error);
      this.eventBridge.emitError(error);
      throw error;
    }
  }

  /**
   * Disconnect wallet
   * Overrides base SuiConnector.disconnect()
   */
  async disconnect(): Promise<void> {
    try {
      console.log('[Phoenix QR Sui] Disconnecting...');

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

      console.log('[Phoenix QR Sui] Disconnected successfully');
    } catch (error: any) {
      console.error('[Phoenix QR Sui] Disconnect failed:', error);
      throw error;
    }
  }

  /**
   * Get connected addresses
   * Overrides base SuiConnector.getConnectedAddresses()
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

  /**
   * Create virtual provider that bridges phoenix protocol to Sui provider interface
   * NOTE: This will work once phoenix-dapp SDK supports 'sui' chain type
   */
  private createVirtualProvider(): SuiProvider {
    const self = this;

    return {
      name: 'Phoenix QR',
      icon: '',

      async requestAccount(): Promise<any> {
        // Connection is handled by PhoenixQRSuiConnector.connect()
        if (self.activeAddress) {
          return {
            accounts: [self.activeAddress],
          };
        }
        throw new Error('Not connected - call PhoenixQRSuiConnector.connect() first');
      },

      async disconnect(): Promise<void> {
        // Disconnection is handled by PhoenixQRSuiConnector.disconnect()
        await self.disconnect();
      },

      async getAccounts(): Promise<string[]> {
        if (self.activeAddress) {
          return [self.activeAddress];
        }
        return [];
      },

      async getChain(): Promise<string> {
        return self.phoenixChainId;
      },

      async signAndExecuteTransaction(input: any): Promise<any> {
        // TODO: Implement once SDK supports Sui
        // const response = await self.phoenixClient.sendTransaction({
        //   transaction: input.transaction,
        //   chainType: ChainType.SUI,
        //   chainId: self._chainId,
        // });
        throw new Error('Sui transaction signing and execution not yet implemented - SDK needs to support Sui chain type');
      },

      async signTransaction(input: any): Promise<any> {
        // TODO: Implement once SDK supports Sui
        // const response = await self.phoenixClient.signTransaction({
        //   transaction: input.transaction,
        //   chainType: ChainType.SUI,
        //   chainId: self._chainId,
        // });
        throw new Error('Sui transaction signing not yet implemented - SDK needs to support Sui chain type');
      },

      async signMessage(message: Uint8Array, account?: string): Promise<any> {
        // TODO: Implement once SDK supports Sui
        // const response = await self.phoenixClient.signMessage({
        //   message: Array.from(message),
        //   chainType: ChainType.SUI,
        //   chainId: self._chainId,
        // });
        throw new Error('Sui message signing not yet implemented - SDK needs to support Sui chain type');
      },

      on(event: string, callback: (...args: unknown[]) => void): void {
        // Event handling is managed by the connector
      },

      off(event: string, callback: (...args: unknown[]) => void): void {
        // Event handling is managed by the connector
      },
    };
  }

  private get phoenixChainId(): string {
    return `sui_${this.cluster.toLowerCase().replace('-', '_')}`;
  }

  /**
   * Setup event listeners (required by SuiConnector)
   */
  async setupEventListeners(): Promise<void> {
    // Event listeners are managed by phoenix client
    // This is called by base class during init
  }

  /**
   * Add chain (required by SuiConnector)
   */
  async addChain(chain: any): Promise<void> {
    // Sui doesn't support adding custom chains
    throw new Error('addChain not supported for Sui');
  }
}

