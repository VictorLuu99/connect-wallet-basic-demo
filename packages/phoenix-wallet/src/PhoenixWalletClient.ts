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
  ConnectionResponseData,
} from './types';
import { EncryptionManager } from './utils/encryption';
import { QRParser } from './core/QRParser';
import { RequestHandler } from './core/RequestHandler';
import { SOCKET_EVENTS, TIMEOUTS } from './utils/constants';
import { SessionStorage } from './utils/sessionStorage';
import { getDefaultStorageAdapter } from './utils/storage';
import { createSessionToken, validateSessionToken } from './utils/sessionToken.js';

/**
 * Phoenix Wallet Client
 * Main SDK for wallet developers to handle dApp connection requests
 */
export class PhoenixWalletClient extends EventEmitter<PhoenixWalletEvents> {
  private socket?: Socket;
  private encryption: EncryptionManager;
  private requestHandler: RequestHandler;
  private session?: Session;
  private config: Required<PhoenixWalletConfig> & { storage: import('./utils/storage').StorageAdapter; enablePersistence: boolean };
  private sessionStorage: SessionStorage;
  private storedServerUrl?: string;
  private isReconnecting: boolean = false;
  private initializationPromise: Promise<void>;
  private initialized: boolean = false;

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

    // Initialize and restore session - store promise for waitForInitialization()
    this.initializationPromise = this.initialize();
  }

  /**
   * Initialize client and restore session if available
   */
  private async initialize(): Promise<void> {
    try {
      await this.restoreSession();
      this.initialized = true;
      console.log('[Phoenix Wallet] Client initialized');
    } catch (error) {
      console.warn('[Phoenix Wallet] Failed to restore session during initialization:', error);
      this.initialized = true; // Mark as initialized even if restore failed
    }
  }

  /**
   * Wait for client initialization to complete
   * This should be called before checking session status after page reload
   */
  async waitForInitialization(): Promise<void> {
    await this.initializationPromise;
  }

  /**
   * Check if client has completed initialization
   */
  isInitialized(): boolean {
    return this.initialized;
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

    // Set peer public key and compute shared secret
    this.encryption.setPeerPublicKey(connectionData.publicKey);

    // Set signer
    this.requestHandler.setSigner(signer);

    // Create sessionToken IMMEDIATELY (signed by wallet's blockchain private key)
    console.log('[Phoenix Wallet] Creating sessionToken...');
    const sessionToken = await createSessionToken(
      connectionData.uuid,
      signer.address,
      signer.chainType,
      connectionData.serverUrl,
      connectionData.publicKey, // dApp's public key
      signer,
      connectionData.appUrl
    );
    console.log('[Phoenix Wallet] SessionToken created and signed');

    // Initialize session with sessionToken
    this.session = {
      uuid: connectionData.uuid,
      connected: false,
      address: signer.address,
      chainType: signer.chainType,
      sessionToken, // Store sessionToken in session
    };

    // Save session to storage
    await this.sessionStorage.saveSession(this.session, connectionData.serverUrl, this.encryption).catch((error) => {
      console.warn('[Phoenix Wallet] Failed to save session:', error);
    });

    this.storedServerUrl = connectionData.serverUrl;

    // Connect to socket server and send encrypted sessionToken
    await this.connectSocket(connectionData.serverUrl, connectionData.uuid, sessionToken, signer);
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
    // Don't emit disconnect event if we're in the middle of reconnecting
    // This prevents the UI from showing disconnected state during session restore
    if (this.isReconnecting) {
      console.log('[Phoenix Wallet] Skipping disconnect() call during reconnection');
      return;
    }

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
  private async connectSocket(serverUrl: string, uuid: string, sessionToken?: import('./types').SessionToken, signer?: WalletSigner): Promise<void> {
    return new Promise((resolve, reject) => {
      // Clean up old socket if exists
      if (this.socket) {
        console.log('[Phoenix Wallet] Cleaning up old socket connection');
        // Store reference to old socket to prevent event propagation
        const oldSocket = this.socket;
        // Remove all listeners from old socket BEFORE disconnecting
        // This prevents disconnect events from firing during cleanup
        oldSocket.removeAllListeners();
        // Disconnect old socket (won't trigger events since listeners are removed)
        oldSocket.disconnect();
        this.socket = undefined;
      }

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

        // Prepare connection event data
        const walletPublicKey = this.encryption.getPublicKey();
        const connectionEventData: { uuid: string; publicKey: string; nonce?: string; data?: string } = {
          uuid,
          publicKey: walletPublicKey
        };

        // If sessionToken provided, encrypt and include in connection event
        if (sessionToken && signer) {
          console.log('[Phoenix Wallet] Encrypting sessionToken for dApp...');

          // Prepare connection response data
          const connectionResponseData: ConnectionResponseData = {
            sessionToken,
            address: signer.address,
            chainType: signer.chainType,
            chainId: this.session?.chainId
          };

          // Encrypt using shared secret
          const encrypted = this.encryption.encrypt(connectionResponseData as unknown as Record<string, unknown>);

          // Add encrypted data to connection event
          connectionEventData.nonce = encrypted.nonce;
          connectionEventData.data = encrypted.encrypted;

          console.log('[Phoenix Wallet] SessionToken encrypted and ready to send');
        }

        // Emit connection event with wallet's public key + encrypted sessionToken
        this.socket!.emit(SOCKET_EVENTS.CONNECTED_UUID, connectionEventData);

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
        console.log('[Phoenix Wallet] Disconnected from server, isReconnecting:', this.isReconnecting);
        // CRITICAL: Don't emit disconnect event if we're reconnecting
        // This prevents the UI from showing disconnected state during session restore
        if (this.isReconnecting) {
          console.log('[Phoenix Wallet] Skipping disconnect event during reconnection');
          return;
        }
        // Only update session state and emit event if this is a real disconnect
        console.log('[Phoenix Wallet] Emitting session_disconnected event');
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

      // VALIDATE sessionToken before processing (security critical!)
      if (!request.sessionToken) {
        throw new Error('Missing session token - request rejected');
      }

      if (!this.session || !this.storedServerUrl) {
        throw new Error('No active session - request rejected');
      }

      // Validate sessionToken matches current session
      const peerPublicKey = this.encryption.getPeerPublicKey();
      if (!peerPublicKey) {
        throw new Error('No peer public key - session invalid');
      }

      const isValid = validateSessionToken(
        request.sessionToken,
        {
          uuid: this.session.uuid,
          address: this.session.address!,
          chainType: this.session.chainType!
        },
        this.storedServerUrl,
        peerPublicKey
      );

      if (!isValid) {
        throw new Error('Invalid session token - request rejected');
      }

      console.log('[Phoenix Wallet] SessionToken validated ✓');

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
    const { encrypted, nonce } = this.encryption.encrypt(response as unknown as Record<string, unknown>);

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
      console.log('[Phoenix Wallet] No stored session found');
      return;
    }

    console.log('[Phoenix Wallet] Found stored session, restoring...');

    // Restore encryption keys
    this.encryption = this.sessionStorage.restoreEncryption(storedData);

    // Restore session state (but mark as not connected since socket needs to reconnect)
    // The session.connected flag in storage might be true, but socket is not connected after reload
    this.session = {
      ...storedData.session,
      connected: false, // Always mark as not connected after restore - socket needs to reconnect
    };
    this.storedServerUrl = storedData.serverUrl;

    console.log('[Phoenix Wallet] Session restored from storage:', {
      uuid: this.session.uuid,
      wasConnected: storedData.session.connected,
      hasPeerPublicKey: !!storedData.peerPublicKey,
    });

    // If session was previously connected, we can try to reconnect
    // But we need the signer to be set first
    if (storedData.session.connected && storedData.peerPublicKey) {
      console.log('[Phoenix Wallet] Session restored, ready to reconnect with signer');
      // Emit event so user knows they can reconnect
      this.emit('session_restored', this.session);
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

    try {
      // Set reconnecting flag BEFORE connecting to prevent disconnect events
      // This flag will be cleared after session is fully restored
      console.log('[Phoenix Wallet] Setting isReconnecting = true');
      this.isReconnecting = true;

      // Set signer
      this.requestHandler.setSigner(signer);

      // Reconnect socket
      await this.connectSocket(this.storedServerUrl, this.session.uuid);

      // CRITICAL: Clear reconnecting flag AFTER session is fully restored
      // This prevents disconnect events from being ignored after reconnection completes
      this.isReconnecting = false;
    } catch (error) {
      // Clear flag on any error
      this.isReconnecting = false;
      throw error;
    }
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
