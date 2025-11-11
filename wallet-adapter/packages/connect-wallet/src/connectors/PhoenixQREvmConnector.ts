/**
 * Phoenix QR EVM Connector
 * QR-code based wallet connector for EVM chains using phoenix-dapp SDK
 */

import { EvmConnector } from '@phoenix-wallet/evm';
import { ConnectorConfig, DappMetadata, ChainType } from '@phoenix-wallet/core';
import { PhoenixConnectorConfig, PhoenixSession, PhoenixVirtualProvider, QRCodeOptions } from '../types';
import { PhoenixDappClientWrapper } from './PhoenixDappClientWrapper';
import { SessionPersistence } from '../utils/sessionPersistence';
import { EventBridge } from '../utils/eventBridge';
import { getDefaultStorageAdapter } from '../utils/storage';

/**
 * Phoenix QR EVM Connector
 * Extends EvmConnector to provide QR-based wallet connection
 */
export class PhoenixQREvmConnector extends EvmConnector {
  private phoenixClient: PhoenixDappClientWrapper;
  private phoenixConfig: Required<Omit<PhoenixConnectorConfig, 'qrOptions'>> & { qrOptions?: QRCodeOptions };
  private sessionPersistence: SessionPersistence;
  private eventBridge: EventBridge;
  private virtualProvider: PhoenixVirtualProvider | null = null;
  private currentSession: PhoenixSession | undefined;

  constructor(
    connectorConfig: ConnectorConfig,
    phoenixConfig: PhoenixConnectorConfig,
    dappMetadata: DappMetadata,
    supportedChains: string[]
  ) {
    // Initialize base connector with unique ID for QR-based connection
    super('phoenix_qr_evm', connectorConfig, dappMetadata, supportedChains);

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
   * Get provider (required by EvmConnector)
   * Returns a virtual provider that bridges phoenix protocol to Ethereum provider interface
   */
  get provider(): any {
    if (!this.virtualProvider) {
      this.virtualProvider = this.createVirtualProvider();
    }
    return this.virtualProvider;
  }

  /**
   * Check if wallet is installed
   * For QR connectors, this is always true (wallet connects via QR scan)
   */
  async isInstalled(): Promise<boolean> {
    return true; // QR-based connection doesn't require installation
  }

  /**
   * Get installation link
   * Returns empty string as QR connection doesn't require installation
   */
  get installLink(): string {
    return ''; // No installation needed for QR connection
  }

  /**
   * Connect wallet via QR code
   * Overrides base EvmConnector.connect()
   */
  async connect(): Promise<{ address: string; chainId: string }> {
    try {
      console.log('[Phoenix QR EVM] Starting connection...');

      // Check for stored session first
      const storedSession = await this.sessionPersistence.loadSession(this.id);
      if (storedSession && storedSession.connected) {
        console.log('[Phoenix QR EVM] Restoring session:', storedSession);

        this.currentSession = storedSession;
        this.activeAddress = storedSession.address;
        this.activeChainId = storedSession.chainId;

        // Emit restored session event
        this.eventBridge.emitSessionRestored(storedSession);

        // Trigger connection event
        await this.handleEventConnect(this.activeAddress!, this.activeChainId!);

        return {
          address: this.activeAddress!,
          chainId: this.activeChainId!,
        };
      }

      // Generate new QR code connection
      const { uri, uuid } = await this.phoenixClient.connect();

      console.log('[Phoenix QR EVM] QR Code generated. URI:', uri);
      console.log('[Phoenix QR EVM] Session UUID:', uuid);

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

          console.log('[Phoenix QR EVM] Wallet connected:', session);

          this.currentSession = session;
          this.activeAddress = session.address;
          this.activeChainId = session.chainId;

          // Save session for persistence
          await this.sessionPersistence.saveSession(this.id, session);

          // Trigger connection event
          await this.handleEventConnect(this.activeAddress!, this.activeChainId!);

          resolve({
            address: this.activeAddress!,
            chainId: this.activeChainId!,
          });
        };

        this.phoenixClient.once('session_connected', onConnected);
      });
    } catch (error: any) {
      console.error('[Phoenix QR EVM] Connection failed:', error);
      this.eventBridge.emitError(error);
      throw error;
    }
  }

  /**
   * Disconnect wallet
   * Overrides base EvmConnector.disconnect()
   */
  async disconnect(): Promise<void> {
    try {
      console.log('[Phoenix QR EVM] Disconnecting...');

      const currentAddress = this.activeAddress;

      // Disconnect phoenix client
      this.phoenixClient.disconnect();

      // Clear session
      this.currentSession = undefined;
      this.activeAddress = undefined;
      this.activeChainId = undefined;

      // Clear persisted session
      await this.sessionPersistence.clearSession(this.id);

      // Trigger disconnect event
      if (currentAddress) {
        await this.handleEventDisconnect(currentAddress);
      }

      console.log('[Phoenix QR EVM] Disconnected successfully');
    } catch (error: any) {
      console.error('[Phoenix QR EVM] Disconnect failed:', error);
      throw error;
    }
  }

  /**
   * Get connected addresses
   * Overrides base EvmConnector.getConnectedAddresses()
   */
  async getConnectedAddresses(): Promise<string[]> {
    if (this.activeAddress) {
      return [this.activeAddress];
    }
    return [];
  }

  /**
   * Get current chain ID
   * Overrides base EvmConnector.getChainId()
   */
  async getChainId(): Promise<string> {
    return this.activeChainId || '1'; // Default to Ethereum mainnet
  }

  /**
   * Get current session information
   */
  getSession(): PhoenixSession | undefined {
    return this.currentSession;
  }

  /**
   * Get phoenix client for direct access (advanced usage)
   */
  getPhoenixClient(): PhoenixDappClientWrapper {
    return this.phoenixClient;
  }

  /**
   * Get event bridge for subscribing to phoenix events
   */
  getEventBridge(): EventBridge {
    return this.eventBridge;
  }

  /**
   * Setup phoenix event listeners
   * Bridges phoenix-dapp events to wallet-adapter events
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
   * Create virtual provider that bridges phoenix protocol to Ethereum provider interface
   */
  private createVirtualProvider(): PhoenixVirtualProvider {
    const self = this;
    const eventHandlers: Map<string, Set<(...args: any[]) => void>> = new Map();

    return {
      isPhoenixProvider: true,

      async request(args: { method: string; params?: any[] }): Promise<any> {
        console.log('[Phoenix Virtual Provider] Request:', args);

        switch (args.method) {
          case 'eth_requestAccounts':
          case 'eth_accounts':
            return self.activeAddress ? [self.activeAddress] : [];

          case 'eth_chainId':
            return `0x${parseInt(self.activeChainId || '1').toString(16)}`;

          case 'eth_signTransaction':
            {
              const response = await self.phoenixClient.signTransaction({
                transaction: args.params?.[0],
                chainType: ChainType.EVM,
                chainId: self.activeChainId || '1',
              });
              if (response.status === 'error') {
                throw new Error(response.error || 'Transaction signing failed');
              }
              return response.result?.signature || response.result;
            }

          case 'eth_sendTransaction':
            {
              const response = await self.phoenixClient.sendTransaction({
                transaction: args.params?.[0],
                chainType: ChainType.EVM,
                chainId: self.activeChainId || '1',
              });
              if (response.status === 'error') {
                throw new Error(response.error || 'Transaction sending failed');
              }
              return response.result?.txHash || response.result;
            }

          case 'personal_sign':
            {
              const message = args.params?.[0];
              const response = await self.phoenixClient.signMessage({
                message,
                chainType: ChainType.EVM,
                chainId: self.activeChainId || '1',
              });
              if (response.status === 'error') {
                throw new Error(response.error || 'Message signing failed');
              }
              return response.result?.signature || response.result;
            }

          case 'eth_sign':
            {
              // eth_sign (deprecated but still used by some dApps)
              const [address, message] = args.params || [];
              const response = await self.phoenixClient.signMessage({
                message,
                chainType: ChainType.EVM,
                chainId: self.activeChainId || '1',
              });
              if (response.status === 'error') {
                throw new Error(response.error || 'Message signing failed');
              }
              return response.result?.signature || response.result;
            }

          case 'eth_signTypedData':
          case 'eth_signTypedData_v3':
          case 'eth_signTypedData_v4':
            {
              // EIP-712 typed data signing
              const [address, typedData] = args.params || [];
              const response = await self.phoenixClient.signMessage({
                message: typedData,
                chainType: ChainType.EVM,
                chainId: self.activeChainId || '1',
              });
              if (response.status === 'error') {
                throw new Error(response.error || 'Typed data signing failed');
              }
              return response.result?.signature || response.result;
            }

          default:
            throw new Error(`Method ${args.method} not supported by Phoenix virtual provider`);
        }
      },

      on(event: string, handler: (...args: any[]) => void): void {
        if (!eventHandlers.has(event)) {
          eventHandlers.set(event, new Set());
        }
        eventHandlers.get(event)!.add(handler);
      },

      removeListener(event: string, handler: (...args: any[]) => void): void {
        eventHandlers.get(event)?.delete(handler);
      },
    };
  }
}
