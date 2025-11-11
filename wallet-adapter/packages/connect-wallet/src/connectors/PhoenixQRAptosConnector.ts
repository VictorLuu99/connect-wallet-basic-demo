/**
 * Phoenix QR Aptos Connector
 * QR-code based wallet connector for Aptos using phoenix-dapp SDK
 *
 * NOTE: This connector requires phoenix-dapp SDK to support 'aptos' chain type.
 * Currently, the SDK only supports 'evm' and 'solana'. Once the SDK is extended,
 * this connector will be fully functional.
 */

import { AptosConnector, AptosNetwork } from '@phoenix-wallet/aptos';
import { ConnectorConfig, DappMetadata, ChainType } from '@phoenix-wallet/core';
import { PhoenixConnectorConfig, PhoenixSession, QRCodeOptions } from '../types';
import { PhoenixDappClientWrapper } from './PhoenixDappClientWrapper';
import { SessionPersistence } from '../utils/sessionPersistence';
import { EventBridge } from '../utils/eventBridge';
import { getDefaultStorageAdapter } from '../utils/storage';
import { WalletReadyState, Wallet } from '@aptos-labs/wallet-adapter-core';

// AdapterWallet type - matches the type used in AptosConnector
// It's AptosWallet & { readyState?, isAptosNativeWallet? }
// Since AptosWallet extends Wallet, we use Wallet as base
type AdapterWallet = Wallet & {
  readyState?: WalletReadyState;
  isAptosNativeWallet?: boolean;
};

/**
 * Phoenix QR Aptos Connector
 * Extends AptosConnector to provide QR-based wallet connection
 */
export class PhoenixQRAptosConnector extends AptosConnector {
  private phoenixClient: PhoenixDappClientWrapper;
  private phoenixConfig: Required<Omit<PhoenixConnectorConfig, 'qrOptions'>> & { qrOptions?: QRCodeOptions };
  private sessionPersistence: SessionPersistence;
  private eventBridge: EventBridge;
  private currentSession: PhoenixSession | undefined;
  private virtualAdapter: AdapterWallet | null = null;

  constructor(
    connectorConfig: ConnectorConfig,
    phoenixConfig: PhoenixConnectorConfig,
    dappMetadata: DappMetadata,
    defaultCluster: AptosNetwork = AptosNetwork.MAINNET,
    supportedChains: string[]
  ) {
    // Initialize base connector
    super(connectorConfig, dappMetadata, defaultCluster, supportedChains);

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
   * Get adapter (required by AptosConnector)
   * Returns a virtual adapter that bridges phoenix protocol to Aptos adapter interface
   */
  get adapter(): any {
    if (!this.virtualAdapter) {
      this.virtualAdapter = this.createVirtualAdapter();
    }
    return this.virtualAdapter as any;
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
   * Overrides base AptosConnector.connect()
   */
  async connect(): Promise<{ address: string; chainId: string }> {
    try {
      console.log('[Phoenix QR Aptos] Starting connection...');

      // Check for stored session first
      const storedSession = await this.sessionPersistence.loadSession(this.id);
      if (storedSession && storedSession.connected) {
        console.log('[Phoenix QR Aptos] Restoring session:', storedSession);

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

      console.log('[Phoenix QR Aptos] QR Code generated. URI:', uri);
      console.log('[Phoenix QR Aptos] Session UUID:', uuid);

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

          console.log('[Phoenix QR Aptos] Wallet connected:', session);

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
      console.error('[Phoenix QR Aptos] Connection failed:', error);
      this.eventBridge.emitError(error);
      throw error;
    }
  }

  /**
   * Disconnect wallet
   * Overrides base AptosConnector.disconnect()
   */
  async disconnect(): Promise<void> {
    try {
      console.log('[Phoenix QR Aptos] Disconnecting...');

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

      console.log('[Phoenix QR Aptos] Disconnected successfully');
    } catch (error: any) {
      console.error('[Phoenix QR Aptos] Disconnect failed:', error);
      throw error;
    }
  }

  /**
   * Get connected addresses
   * Overrides base AptosConnector.getConnectedAddresses()
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
   * Create virtual adapter that bridges phoenix protocol to Aptos adapter interface
   * NOTE: This will work once phoenix-dapp SDK supports 'aptos' chain type
   */
  private createVirtualAdapter(): AdapterWallet {
    const self = this;

    return {
      name: 'Phoenix QR',
      url: '',
      icon: '',
      readyState: WalletReadyState.Installed,

      // Connection features
      features: {
        'aptos:connect': {
          connect: async () => {
            // Connection is handled by PhoenixQRAptosConnector.connect()
            if (self.activeAddress) {
              return { status: 'Approved' as const };
            }
            throw new Error('Not connected - call PhoenixQRAptosConnector.connect() first');
          },
        },

        'aptos:disconnect': {
          disconnect: async () => {
            // Disconnection is handled by PhoenixQRAptosConnector.disconnect()
            await self.disconnect();
          },
        },

        'aptos:account': {
          account: async () => {
            if (!self.activeAddress) {
              throw new Error('Not connected');
            }
            // Return Aptos account format
            return {
              address: self.activeAddress,
            } as any;
          },
        },

        'aptos:signMessage': {
          signMessage: async (params: any) => {
            // TODO: Implement once SDK supports Aptos
            // const response = await self.phoenixClient.signMessage({
            //   message: params.message,
            //   chainType: ChainType.APTOS,
            //   chainId: self._chainId,
            // });
            throw new Error('Aptos message signing not yet implemented - SDK needs to support Aptos chain type');
          },
        },

        'aptos:signTransaction': {
          signTransaction: async (params: any) => {
            // TODO: Implement once SDK supports Aptos
            // const response = await self.phoenixClient.signTransaction({
            //   transaction: params.transaction,
            //   chainType: ChainType.APTOS,
            //   chainId: self._chainId,
            // });
            throw new Error('Aptos transaction signing not yet implemented - SDK needs to support Aptos chain type');
          },
        },

        'aptos:signAndSubmitTransaction': {
          signAndSubmitTransaction: async (params: any) => {
            // TODO: Implement once SDK supports Aptos
            // const response = await self.phoenixClient.sendTransaction({
            //   transaction: params.transaction,
            //   chainType: ChainType.APTOS,
            //   chainId: self._chainId,
            // });
            throw new Error('Aptos transaction submission not yet implemented - SDK needs to support Aptos chain type');
          },
        },
      },
    } as unknown as AdapterWallet;
  }

  private get phoenixChainId(): string {
    return `aptos_${this.cluster.toLowerCase().replace('-', '_')}`;
  }

  /**
   * Handle disconnect event (required by AptosConnector)
   */
  async onDisconnect(): Promise<void> {
    // Disconnection is handled by disconnect() method
    // This is called by base class when adapter disconnects
  }
}

