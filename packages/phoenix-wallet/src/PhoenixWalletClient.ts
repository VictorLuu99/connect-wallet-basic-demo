import { EventEmitter } from 'eventemitter3';
import { io, Socket } from 'socket.io-client';
import {
  PhoenixWalletConfig,
  PhoenixWalletEvents,
  WalletSigner,
  Session,
  SignRequest,
  SignResponse,
  PhoenixURI,
  EncryptedMessage,
} from './types';
import { EncryptionManager } from './utils/encryption';
import { QRParser } from './core/QRParser';
import { RequestHandler } from './core/RequestHandler';
import { SOCKET_EVENTS, TIMEOUTS } from './utils/constants';
import { SessionStorage } from './utils/sessionStorage';
import { getDefaultStorageAdapter } from './utils/storage';

/**
 * Phoenix Wallet Client
 * Main SDK for wallet developers to handle dApp connection requests
 */
export class PhoenixWalletClient extends EventEmitter<PhoenixWalletEvents> {
  private socket?: Socket;
  private encryption: EncryptionManager;
  private requestHandler: RequestHandler;
  private session?: Session;
  private config: Required<PhoenixWalletConfig> & { storage?: any; enablePersistence?: boolean };
  private sessionStorage: SessionStorage;
  private storedServerUrl?: string;

  constructor(config?: PhoenixWalletConfig) {
    super();

    const storage = config?.storage || getDefaultStorageAdapter();
    const enablePersistence = config?.enablePersistence !== false;

    this.config = {
      reconnect: config?.reconnect ?? true,
      reconnectAttempts: config?.reconnectAttempts ?? 5,
      reconnectDelay: config?.reconnectDelay ?? 2000,
      storage,
      enablePersistence,
    };

    this.sessionStorage = new SessionStorage(storage, enablePersistence);
    this.encryption = new EncryptionManager();
    this.requestHandler = new RequestHandler();

    // Try to restore session on initialization
    this.restoreSession().catch((error) => {
      console.warn('[Phoenix Wallet] Failed to restore session:', error);
    });
  }

  /**
   * Connect to dApp by scanning QR code
   */
  async connect(qrData: string, signer: WalletSigner): Promise<void> {
    if (this.session?.connected) {
      throw new Error('Already connected');
    }

    // Parse QR code
    console.log("qrData", qrData);
    const connectionData: PhoenixURI = QRParser.parseURI(qrData);
    console.log("connectionData", connectionData);
    

    // Set peer public key
    this.encryption.setPeerPublicKey(connectionData.publicKey);

    // Set signer
    this.requestHandler.setSigner(signer);

    // Initialize session
    this.session = {
      uuid: connectionData.uuid,
      connected: false,
      address: signer.address,
      chainType: signer.chainType,
    };

    // Save session to storage
    await this.sessionStorage.saveSession(this.session, connectionData.serverUrl, this.encryption).catch((error) => {
      console.warn('[Phoenix Wallet] Failed to save session:', error);
    });

    this.storedServerUrl = connectionData.serverUrl;

    // Connect to socket server
    await this.connectSocket(connectionData.serverUrl, connectionData.uuid);
  }

  /**
   * Approve pending request
   */
  async approveRequest(requestId: string): Promise<void> {
    this.ensureConnected();

    const response = await this.requestHandler.approveRequest(requestId);
    await this.sendResponse(response);

    this.emit('request_approved', requestId);
  }

  /**
   * Reject pending request
   */
  async rejectRequest(requestId: string, reason?: string): Promise<void> {
    this.ensureConnected();

    const response = await this.requestHandler.rejectRequest(requestId, reason);
    await this.sendResponse(response);

    this.emit('request_rejected', requestId);
  }

  /**
   * Disconnect from dApp
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = undefined;
    }

    this.requestHandler.clearPendingRequest();
    this.session = undefined;
    this.storedServerUrl = undefined;

    // Clear stored session
    this.sessionStorage.clearSession().catch((error) => {
      console.warn('[Phoenix Wallet] Failed to clear session:', error);
    });

    this.emit('session_disconnected');
  }

  /**
   * Get current session
   */
  getSession(): Session | undefined {
    return this.session;
  }

  /**
   * Get pending request
   */
  getPendingRequest(): SignRequest | undefined {
    return this.requestHandler.getPendingRequest();
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.session?.connected ?? false;
  }

  // Private methods

  /**
   * Connect to socket server
   */
  private async connectSocket(serverUrl: string, uuid: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = io(serverUrl, {
        reconnection: this.config.reconnect,
        reconnectionAttempts: this.config.reconnectAttempts,
        reconnectionDelay: this.config.reconnectDelay,
        timeout: TIMEOUTS.CONNECTION_TIMEOUT,
      });

      // Connection established
      this.socket.on(SOCKET_EVENTS.CONNECT, () => {
        console.log('[Phoenix Wallet] Connected to server');

        // Join room
        this.socket!.emit(SOCKET_EVENTS.JOIN, { uuid });

        // Emit connection event with wallet's public key
        // dApp needs this to encrypt messages to wallet
        const walletPublicKey = this.encryption.getPublicKey();
        this.socket!.emit(SOCKET_EVENTS.CONNECTED_UUID, { 
          uuid,
          publicKey: walletPublicKey 
        });

        // Update session
        if (this.session) {
          this.session.connected = true;
        }

        // Save connected session
        if (this.session && this.storedServerUrl) {
          this.sessionStorage.saveSession(this.session, this.storedServerUrl, this.encryption).catch((error) => {
            console.warn('[Phoenix Wallet] Failed to save connected session:', error);
          });
        }

        console.log('[Phoenix Wallet] Session established');
        this.emit('session_connected', this.session!);

        // Listen for sign requests
        this.socket!.on(SOCKET_EVENTS.WALLET_REQUEST, (data: EncryptedMessage) => {
          this.handleRequest(data);
        });

        resolve();
      });

      // Connection error
      this.socket.on(SOCKET_EVENTS.ERROR, (error: Error) => {
        console.error('[Phoenix Wallet] Socket error:', error);
        this.emit('error', error);
        reject(error);
      });

      // Disconnection
      this.socket.on(SOCKET_EVENTS.DISCONNECT, () => {
        console.log('[Phoenix Wallet] Disconnected from server');
        if (this.session) {
          this.session.connected = false;
        }
        this.emit('session_disconnected');
      });
    });
  }

  /**
   * Handle encrypted request from dApp
   */
  private handleRequest(data: EncryptedMessage): void {
    try {
      // Decrypt request
      const request: SignRequest = this.encryption.decrypt(
        data.encryptedPayload,
        data.nonce
      );

      // Validate and store request
      this.requestHandler.validateRequest(request);

      console.log('[Phoenix Wallet] Received sign request:', request.type);
      this.emit('sign_request', request);
    } catch (error) {
      console.error('[Phoenix Wallet] Failed to handle request:', error);
      this.emit('error', error as Error);
    }
  }

  /**
   * Send encrypted response to dApp
   */
  private async sendResponse(response: SignResponse): Promise<void> {
    if (!this.socket || !this.session) {
      throw new Error('Not connected');
    }

    // Encrypt response
    const { encrypted, nonce } = this.encryption.encrypt(response);

    const message: EncryptedMessage = {
      uuid: this.session.uuid,
      encryptedPayload: encrypted,
      nonce,
      timestamp: Date.now(),
    };

    // Send to dApp
    this.socket.emit(SOCKET_EVENTS.WALLET_RESPONSE, message);

    console.log('[Phoenix Wallet] Response sent:', response.status);
  }

  /**
   * Restore session from storage
   * Note: This restores encryption keys and session state, but signer must be provided via connect()
   */
  private async restoreSession(): Promise<void> {
    const storedData = await this.sessionStorage.loadSession();
    if (!storedData) {
      return;
    }

    // Restore encryption keys
    this.encryption = this.sessionStorage.restoreEncryption(storedData);

    // Restore session state (but not fully connected until signer is provided)
    this.session = storedData.session;
    this.storedServerUrl = storedData.serverUrl;

    // If session was connected, we can try to reconnect
    // But we need the signer to be set first
    if (storedData.session.connected && storedData.peerPublicKey) {
      console.log('[Phoenix Wallet] Session restored, ready to reconnect with signer');
      // Emit event so user knows they can reconnect
      this.emit('session_restored', storedData.session);
    }
  }

  /**
   * Reconnect to existing session with signer
   * This can be called after restoreSession() to fully reconnect
   */
  async reconnectWithSigner(signer: WalletSigner): Promise<void> {
    if (!this.session || !this.storedServerUrl) {
      throw new Error('No stored session to reconnect');
    }

    // Verify signer matches stored session
    if (this.session.address !== signer.address || this.session.chainType !== signer.chainType) {
      throw new Error('Signer does not match stored session');
    }

    // Set signer
    this.requestHandler.setSigner(signer);

    // Reconnect socket
    await this.connectSocket(this.storedServerUrl, this.session.uuid);
  }

  /**
   * Check if there's a stored session that can be restored
   */
  async hasStoredSession(): Promise<boolean> {
    const storedData = await this.sessionStorage.loadSession();
    return storedData !== null;
  }

  /**
   * Ensure client is connected
   */
  private ensureConnected(): void {
    if (!this.session?.connected) {
      throw new Error('Not connected - call connect() first');
    }
  }
}
