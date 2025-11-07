import { EventEmitter } from 'eventemitter3';
import { io, Socket } from 'socket.io-client';
import {
  PhoenixDappConfig,
  PhoenixDappEvents,
  ConnectionResult,
  SignMessageParams,
  SignTransactionParams,
  SignAllTransactionsParams,
  SendTransactionParams,
  Session,
  SignRequest,
  SignResponse,
  PhoenixURI,
  PROTOCOL_VERSION,
  EncryptedMessage,
} from './types';
import { EncryptionManager } from './utils/encryption';
import { URIEncoder } from './core/URIEncoder';
import { RequestManager } from './core/RequestManager';
import { SOCKET_EVENTS, TIMEOUTS } from './utils/constants';
import { isValidTimestamp } from './utils/validation';
import { SessionStorage } from './utils/sessionStorage';
import { getDefaultStorageAdapter } from './utils/storage';
import { encodePayload } from './utils/payload';

/**
 * Phoenix DAPP Client
 * Main SDK for dApp developers to connect with wallets
 */
export class PhoenixDappClient extends EventEmitter<PhoenixDappEvents> {
  private socket?: Socket;
  private encryption: EncryptionManager;
  private requestManager: RequestManager;
  private session?: Session;
  private config: Required<PhoenixDappConfig> & { storage?: any; enablePersistence?: boolean };
  private sessionStorage: SessionStorage;
  private initializationPromise: Promise<void>;
  private initialized: boolean = false;
  private isReconnecting: boolean = false;

  constructor(config: PhoenixDappConfig) {
    console.log('PhoenixDappClient constructor');
    super();

    const storage = config.storage || getDefaultStorageAdapter();
    const enablePersistence = config.enablePersistence !== false;

    this.config = {
      serverUrl: config.serverUrl,
      reconnect: config.reconnect ?? true,
      reconnectAttempts: config.reconnectAttempts ?? 5,
      reconnectDelay: config.reconnectDelay ?? 2000,
      storage,
      enablePersistence,
    };

    console.log('config', this.config);
    console.log('storage', storage);
    console.log('enablePersistence', enablePersistence);


    this.sessionStorage = new SessionStorage(storage, enablePersistence);
    this.encryption = new EncryptionManager();
    this.requestManager = new RequestManager(TIMEOUTS.REQUEST_TIMEOUT);

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
      console.log('[Phoenix DAPP] Client initialized');
    } catch (error) {
      console.warn('[Phoenix DAPP] Failed to restore session during initialization:', error);
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
   * Connect and generate connection URI for wallet scanning
   * Note: QR code generation should be handled by the application layer
   */
  async connect(): Promise<ConnectionResult> {
    if (this.session?.connected) {
      throw new Error('Already connected');
    }

    // Generate UUID and connection URI
    const uuid = crypto.randomUUID();
    const publicKey = this.encryption.getPublicKey();

    const connectionData: PhoenixURI = {
      version: PROTOCOL_VERSION,
      uuid,
      serverUrl: this.config.serverUrl,
      publicKey,
    };

    // Encode connection data to URI
    const uri = URIEncoder.encodeURI(connectionData);

    // Initialize session
    this.session = {
      uuid,
      connected: false,
    };

    // Save initial session (before wallet connects)
    await this.sessionStorage.saveSession(this.session, this.config.serverUrl, this.encryption).catch((error) => {
      console.warn('[Phoenix DAPP] Failed to save initial session:', error);
    });

    // Connect socket (not a reconnection, so isReconnecting stays false)
    await this.connectSocket(uuid);

    // Clear any reconnecting flag that might have been set (shouldn't happen in connect())
    this.isReconnecting = false;

    return { uri, uuid };
  }

  /**
   * Manually reconnect to existing session
   * Useful for recovering from network issues or forcing a reconnect
   */
  async reconnect(): Promise<void> {
    if (!this.session) {
      throw new Error('No session to reconnect - call connect() first');
    }

    if (this.session.connected && this.socket?.connected) {
      console.log('[Phoenix DAPP] Already connected, no need to reconnect');
      return;
    }

    console.log('[Phoenix DAPP] Manual reconnect requested');

    const uuid = this.session.uuid;
    console.log('uuid', uuid);

    try {
      // Set reconnecting flag BEFORE connecting to prevent disconnect events
      // This flag will be cleared after session is fully restored
      console.log('[Phoenix DAPP] Setting isReconnecting = true');
      this.isReconnecting = true;

      // Connect socket (this already joins the room in connectSocket)
      await this.connectSocket(uuid);

      console.log("this.encryption.hasPeerPublicKey(): ", this.encryption.hasPeerPublicKey());

      // If we have peer public key from storage, we can consider ourselves connected
      // No need to wait for connected_uuid event - we already have encryption keys
      if (this.encryption.hasPeerPublicKey()) {
        this.session.connected = true;
        console.log('[Phoenix DAPP] Session reconnected successfully with stored keys');

        // Save the reconnected state
        await this.sessionStorage.saveSession(
          this.session,
          this.config.serverUrl,
          this.encryption
        );

        // CRITICAL: Clear reconnecting flag AFTER session is fully restored
        // This prevents disconnect events from being ignored after reconnection completes
        this.isReconnecting = false;

        // Emit connected event to update UI
        this.emit('session_connected', this.session);
      } else {
        console.warn('[Phoenix DAPP] Reconnection failed: no peer public key');
        this.isReconnecting = false; // Clear flag on failure
        throw new Error('Cannot reconnect without peer public key');
      }
    } catch (error) {
      // Clear flag on any error
      this.isReconnecting = false;
      throw error;
    }
  }

  /**
   * Sign a message
   */
  async signMessage(params: SignMessageParams): Promise<SignResponse> {
    this.ensureConnected();

    const requestId = this.requestManager.generateRequestId('sign_message');

    // Encode payload to JSON string for multi-chain support
    const payload = typeof params.message === 'string' 
      ? { message: params.message }
      : params.message;
    const encodedPayload = encodePayload(payload);

    const request: SignRequest = {
      id: requestId,
      type: 'sign_message',
      chainType: params.chainType,
      chainId: params.chainId,
      payload: encodedPayload,
      timestamp: Date.now(),
    };

    return this.sendRequest(request);
  }

  /**
   * Sign a transaction
   */
  async signTransaction(params: SignTransactionParams): Promise<SignResponse> {
    this.ensureConnected();

    const requestId = this.requestManager.generateRequestId('sign_transaction');

    // Encode payload to JSON string for multi-chain support
    const encodedPayload = encodePayload(params.transaction);

    const request: SignRequest = {
      id: requestId,
      type: 'sign_transaction',
      chainType: params.chainType,
      chainId: params.chainId,
      payload: encodedPayload,
      timestamp: Date.now(),
    };

    return this.sendRequest(request);
  }

  /**
   * Sign all transactions (for batch signing, e.g., Solana)
   */
  async signAllTransactions(params: SignAllTransactionsParams): Promise<SignResponse> {
    this.ensureConnected();

    const requestId = this.requestManager.generateRequestId('sign_all_transactions');

    // Encode payload to JSON string for multi-chain support
    const encodedPayload = encodePayload({ transactions: params.transactions });

    const request: SignRequest = {
      id: requestId,
      type: 'sign_all_transactions',
      chainType: params.chainType,
      chainId: params.chainId,
      payload: encodedPayload,
      timestamp: Date.now(),
    };

    return this.sendRequest(request);
  }

  /**
   * Send transaction (sign and broadcast immediately, e.g., EVM)
   */
  async sendTransaction(params: SendTransactionParams): Promise<SignResponse> {
    this.ensureConnected();

    const requestId = this.requestManager.generateRequestId('send_transaction');

    // Encode payload to JSON string for multi-chain support
    const encodedPayload = encodePayload(params.transaction);

    const request: SignRequest = {
      id: requestId,
      type: 'send_transaction',
      chainType: params.chainType,
      chainId: params.chainId,
      payload: encodedPayload,
      timestamp: Date.now(),
    };

    return this.sendRequest(request);
  }

  /**
   * Disconnect from wallet
   */
  disconnect(): void {
    // Don't emit disconnect event if we're in the middle of reconnecting
    // This prevents the UI from showing disconnected state during session restore
    if (this.isReconnecting) {
      console.log('[Phoenix DAPP] Skipping disconnect() call during reconnection');
      return;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = undefined;
    }

    this.requestManager.clearAll();
    this.session = undefined;

    // Clear stored session
    this.sessionStorage.clearSession().catch((error) => {
      console.warn('[Phoenix DAPP] Failed to clear session:', error);
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
   * Check if connected
   */
  isConnected(): boolean {
    return this.session?.connected ?? false;
  }

  // Private methods

  /**
   * Connect to socket server
   */
  private async connectSocket(uuid: string): Promise<void> {
    console.log('connectSocket', uuid);
    return new Promise((resolve, reject) => {
      // Clean up old socket if exists
      if (this.socket) {
        console.log('[Phoenix DAPP] Cleaning up old socket connection');
        // Store reference to old socket to prevent event propagation
        const oldSocket = this.socket;
        // Remove all listeners from old socket BEFORE disconnecting
        // This prevents disconnect events from firing during cleanup
        oldSocket.removeAllListeners();
        // Disconnect old socket (won't trigger events since listeners are removed)
        oldSocket.disconnect();
        this.socket = undefined;
      }

      this.socket = io(this.config.serverUrl, {
        reconnection: this.config.reconnect,
        reconnectionAttempts: this.config.reconnectAttempts,
        reconnectionDelay: this.config.reconnectDelay,
        timeout: TIMEOUTS.CONNECTION_TIMEOUT,
      });

      // Connection established
      this.socket.on(SOCKET_EVENTS.CONNECT, () => {
        console.log('[Phoenix DAPP] Connected to server');
        // Join room immediately after connection
        this.socket!.emit(SOCKET_EVENTS.JOIN, { uuid });
        console.log('[Phoenix DAPP] Joined room:', uuid);
        // Don't clear reconnecting flag here - let the caller (connect() or reconnect()) handle it
        // This ensures the flag stays true during the entire reconnection process
        resolve();
      });

      // Connection error
      this.socket.on(SOCKET_EVENTS.ERROR, (error: Error) => {
        console.error('[Phoenix DAPP] Socket error:', error);
        this.isReconnecting = false; // Clear flag on error
        this.emit('error', error);
        reject(error);
      });

      // Listen for wallet connection
      this.socket.on(SOCKET_EVENTS.CONNECTED_UUID, (data: { uuid: string; publicKey: string }) => {
        console.log('[Phoenix DAPP] Received connected_uuid:', data);
        if (data.uuid === uuid) {
          // Set wallet's public key for encryption
          if (data.publicKey) {
            this.encryption.setPeerPublicKey(data.publicKey);
            console.log('[Phoenix DAPP] Wallet public key set');
            this.handleWalletConnected(uuid);
          }
        }
      });

      // Listen for encrypted responses from wallet
      this.socket.on(SOCKET_EVENTS.DAPP_RESPONSE, (data: EncryptedMessage) => {
        console.log('[Phoenix DAPP] Received dapp:response:', data);
        this.handleResponse(data);
      });

      // Disconnection
      this.socket.on(SOCKET_EVENTS.DISCONNECT, () => {
        console.log('[Phoenix DAPP] Disconnected from server, isReconnecting:', this.isReconnecting);
        // Don't emit disconnect event if we're reconnecting
        if (this.isReconnecting) {
          console.log('[Phoenix DAPP] Skipping disconnect event during reconnection');
          return;
        }
        // Only update session state and emit event if this is a real disconnect
        console.log('[Phoenix DAPP] Emitting session_disconnected event');
        if (this.session) {
          this.session.connected = false;
        }
        this.emit('session_disconnected');
      });
    });
  }

  /**
   * Handle wallet connected event
   * Note: Room is already joined in connectSocket, so we just update session state
   */
  private handleWalletConnected(uuid: string): void {
    // Update session
    if (this.session) {
      this.session.connected = true;
    }

    // Save session to storage
    if (this.session) {
      this.sessionStorage.saveSession(this.session, this.config.serverUrl, this.encryption).catch((error) => {
        console.warn('[Phoenix DAPP] Failed to save session:', error);
      });
    }

    console.log('[Phoenix DAPP] Wallet connected to session:', uuid);
    this.emit('session_connected', this.session!);
  }

  /**
   * Send encrypted request to wallet
   */
  private async sendRequest(request: SignRequest): Promise<SignResponse> {
    return new Promise((resolve, reject) => {
      // Add to pending requests
      this.requestManager.addRequest(request.id, request.type, resolve, reject);

      // Encrypt request
      const { encrypted, nonce } = this.encryption.encrypt(request);

      const message: EncryptedMessage = {
        uuid: this.session!.uuid,
        encryptedPayload: encrypted,
        nonce,
        timestamp: Date.now(),
      };

      // Send to wallet
      this.socket!.emit(SOCKET_EVENTS.DAPP_REQUEST, message);

      this.emit('request_sent', request.id);
    });
  }

  /**
   * Handle encrypted response from wallet
   */
  private handleResponse(data: EncryptedMessage): void {
    try {
      // Decrypt response
      const response: SignResponse = this.encryption.decrypt(
        data.encryptedPayload,
        data.nonce
      );

      // Validate timestamp
      if (!isValidTimestamp(response.timestamp)) {
        console.warn('[Phoenix DAPP] Invalid response timestamp');
        return;
      }

      // Resolve pending request
      if (response.status === 'success') {
        this.requestManager.resolveRequest(response.id, response);
      } else {
        this.requestManager.rejectRequest(
          response.id,
          new Error(response.error || 'Request rejected')
        );
      }

      this.emit('request_response', response);
    } catch (error) {
      console.error('[Phoenix DAPP] Failed to handle response:', error);
      this.emit('error', error as Error);
    }
  }

  /**
   * Restore session from storage and reconnect
   */
  private async restoreSession(): Promise<void> {
    const storedData = await this.sessionStorage.loadSession();
    if (!storedData) {
      return;
    }

    // Verify server URL matches
    if (storedData.serverUrl !== this.config.serverUrl) {
      console.warn('[Phoenix DAPP] Stored session server URL mismatch, clearing session');
      await this.sessionStorage.clearSession();
      return;
    }

    // Restore encryption keys
    this.encryption = this.sessionStorage.restoreEncryption(storedData);

    // Restore session
    this.session = storedData.session;

    // If session was connected, try to reconnect
    if (storedData.session.connected && storedData.peerPublicKey) {
      console.log('[Phoenix DAPP] Restoring session, attempting to reconnect...');
      try {
        await this.reconnect();
      } catch (error) {
        console.warn('[Phoenix DAPP] Failed to reconnect, clearing session:', error);
        // Clear invalid session
        this.session = undefined;
        await this.sessionStorage.clearSession();
      }
    }
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
