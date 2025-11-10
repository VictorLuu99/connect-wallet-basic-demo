import { io, Socket } from 'socket.io-client';
import {
  WalletSigner,
  Session,
  SignRequest,
  SignResponse,
  EncryptedMessage,
  ConnectionResponseData,
  SessionToken,
} from '../types';
import { EncryptionManager } from '../utils/encryption';
import { RequestHandler } from './RequestHandler';
import { SOCKET_EVENTS, TIMEOUTS } from '../utils/constants';
import { validateSessionToken } from '../utils/sessionToken';

/**
 * Event emitter type for session events
 */
export interface DappSessionEvents {
  session_connected: (session: Session) => void;
  session_disconnected: () => void;
  sign_request: (request: SignRequest) => void;
  error: (error: Error) => void;
}

/**
 * DappSession - Encapsulates all state and logic for a single dApp connection
 */
export class DappSession {
  private socket?: Socket;
  private encryption: EncryptionManager;
  private requestHandler: RequestHandler;
  private session: Session;
  private serverUrl: string;
  private signer?: WalletSigner;
  private isReconnecting: boolean = false;
  private eventHandlers: Map<string, Set<Function>> = new Map();

  constructor(
    uuid: string,
    serverUrl: string,
    dappPublicKey: string,
    sessionToken: SessionToken,
    signer: WalletSigner,
    encryption?: EncryptionManager
  ) {
    this.serverUrl = serverUrl;
    this.signer = signer;

    // Use provided encryption or create new one
    this.encryption = encryption || new EncryptionManager();
    this.encryption.setPeerPublicKey(dappPublicKey);

    // Initialize request handler with signer
    this.requestHandler = new RequestHandler();
    this.requestHandler.setSigner(signer);

    // Initialize session
    this.session = {
      uuid,
      connected: false,
      address: signer.address,
      chainType: signer.chainType,
      sessionToken,
    };
  }

  /**
   * Get session UUID
   */
  getUuid(): string {
    return this.session.uuid;
  }

  /**
   * Get session data
   */
  getSession(): Session {
    return this.session;
  }

  /**
   * Get server URL
   */
  getServerUrl(): string {
    return this.serverUrl;
  }

  /**
   * Get encryption manager
   */
  getEncryption(): EncryptionManager {
    return this.encryption;
  }

  /**
   * Check if session is connected
   */
  isConnected(): boolean {
    return this.session.connected ?? false;
  }

  /**
   * Get pending request
   */
  getPendingRequest(): SignRequest | undefined {
    return this.requestHandler.getPendingRequest();
  }

  /**
   * Connect to socket server
   */
  async connect(
    reconnectConfig?: {
      reconnect: boolean;
      reconnectAttempts: number;
      reconnectDelay: number;
    }
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Clean up old socket if exists
      if (this.socket) {
        console.log(`[DappSession ${this.session.uuid}] Cleaning up old socket connection`);
        const oldSocket = this.socket;
        oldSocket.removeAllListeners();
        oldSocket.disconnect();
        this.socket = undefined;
      }

      const reconnect = reconnectConfig?.reconnect ?? true;
      const maxReconnectAttempts = reconnectConfig?.reconnectAttempts ?? 5;
      const reconnectDelayMs = reconnectConfig?.reconnectDelay ?? 2000;

      this.socket = io(this.serverUrl, {
        reconnection: reconnect,
        reconnectionAttempts: maxReconnectAttempts,
        reconnectionDelay: reconnectDelayMs,
        timeout: TIMEOUTS.CONNECTION_TIMEOUT,
      });

      // Connection established
      this.socket.on(SOCKET_EVENTS.CONNECT, () => {
        console.log(`[DappSession ${this.session.uuid}] Connected to server`);

        // Join room
        this.socket!.emit(SOCKET_EVENTS.JOIN, { uuid: this.session.uuid });

        // Prepare connection event data
        const walletPublicKey = this.encryption.getPublicKey();
        const connectionEventData: { uuid: string; publicKey: string; nonce?: string; data?: string } = {
          uuid: this.session.uuid,
          publicKey: walletPublicKey,
        };

        // Encrypt and include sessionToken
        if (this.session.sessionToken && this.signer) {
          console.log(`[DappSession ${this.session.uuid}] Encrypting sessionToken for dApp...`);

          const connectionResponseData: ConnectionResponseData = {
            sessionToken: this.session.sessionToken,
            address: this.signer.address,
            chainType: this.signer.chainType,
            chainId: this.session.chainId,
          };

          const encrypted = this.encryption.encrypt(connectionResponseData as unknown as Record<string, unknown>);
          connectionEventData.nonce = encrypted.nonce;
          connectionEventData.data = encrypted.encrypted;

          console.log(`[DappSession ${this.session.uuid}] SessionToken encrypted and ready to send`);
        }

        // Emit connection event
        this.socket!.emit(SOCKET_EVENTS.CONNECTED_UUID, connectionEventData);

        // Update session state
        this.session.connected = true;

        console.log(`[DappSession ${this.session.uuid}] Session established`);
        this.emit('session_connected', this.session);

        // Listen for sign requests
        this.socket!.on(SOCKET_EVENTS.WALLET_REQUEST, (data: EncryptedMessage) => {
          this.handleRequest(data);
        });

        resolve();
      });

      // Connection error
      this.socket.on(SOCKET_EVENTS.ERROR, (error: Error) => {
        console.error(`[DappSession ${this.session.uuid}] Socket error:`, error);
        this.emit('error', error);
        reject(error);
      });

      // Disconnection
      this.socket.on(SOCKET_EVENTS.DISCONNECT, () => {
        console.log(`[DappSession ${this.session.uuid}] Disconnected from server, isReconnecting:`, this.isReconnecting);
        if (this.isReconnecting) {
          console.log(`[DappSession ${this.session.uuid}] Skipping disconnect event during reconnection`);
          return;
        }
        console.log(`[DappSession ${this.session.uuid}] Emitting session_disconnected event`);
        this.session.connected = false;
        this.emit('session_disconnected');
      });
    });
  }

  /**
   * Disconnect from dApp
   */
  disconnect(): void {
    if (this.isReconnecting) {
      console.log(`[DappSession ${this.session.uuid}] Skipping disconnect() call during reconnection`);
      return;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket.removeAllListeners();
      this.socket = undefined;
    }

    this.requestHandler.clearPendingRequest();
    this.session.connected = false;

    this.emit('session_disconnected');
  }

  /**
   * Handle encrypted request from dApp
   */
  private handleRequest(data: EncryptedMessage): void {
    try {
      // Decrypt request
      const request: SignRequest = this.encryption.decrypt(data.encryptedPayload, data.nonce);

      // VALIDATE sessionToken before processing (security critical!)
      if (!request.sessionToken) {
        throw new Error('Missing session token - request rejected');
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
          chainType: this.session.chainType!,
        },
        this.serverUrl,
        peerPublicKey
      );

      if (!isValid) {
        throw new Error('Invalid session token - request rejected');
      }

      console.log(`[DappSession ${this.session.uuid}] SessionToken validated ✓`);

      // Validate and store request
      this.requestHandler.validateRequest(request);

      console.log(`[DappSession ${this.session.uuid}] Received sign request:`, request.type);
      this.emit('sign_request', request);
    } catch (error) {
      console.error(`[DappSession ${this.session.uuid}] Failed to handle request:`, error);
      this.emit('error', error as Error);
    }
  }

  /**
   * Send encrypted response to dApp
   */
  async sendResponse(response: SignResponse): Promise<void> {
    if (!this.socket || !this.session.connected) {
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

    console.log(`[DappSession ${this.session.uuid}] Response sent:`, response.status);
  }

  /**
   * Approve pending request
   */
  async approveRequest(requestId: string): Promise<void> {
    if (!this.session.connected) {
      throw new Error('Not connected');
    }

    const response = await this.requestHandler.approveRequest(requestId);
    await this.sendResponse(response);
  }

  /**
   * Reject pending request
   */
  async rejectRequest(requestId: string, reason?: string): Promise<void> {
    if (!this.session.connected) {
      throw new Error('Not connected');
    }

    const response = await this.requestHandler.rejectRequest(requestId, reason);
    await this.sendResponse(response);
  }

  /**
   * Set reconnecting flag
   */
  setReconnecting(value: boolean): void {
    this.isReconnecting = value;
  }

  /**
   * Reconnect to existing session
   */
  async reconnect(reconnectConfig?: {
    reconnect: boolean;
    reconnectAttempts: number;
    reconnectDelay: number;
  }): Promise<void> {
    if (!this.signer) {
      throw new Error('Signer not set');
    }

    try {
      this.isReconnecting = true;
      await this.connect(reconnectConfig);
      this.isReconnecting = false;
    } catch (error) {
      this.isReconnecting = false;
      throw error;
    }
  }

  /**
   * Update signer (for reconnection scenarios)
   */
  setSigner(signer: WalletSigner): void {
    this.signer = signer;
    this.requestHandler.setSigner(signer);
  }

  /**
   * Event emitter methods
   */
  on<K extends keyof DappSessionEvents>(event: K, handler: DappSessionEvents[K]): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  off<K extends keyof DappSessionEvents>(event: K, handler: DappSessionEvents[K]): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  private emit<K extends keyof DappSessionEvents>(event: K, ...args: Parameters<DappSessionEvents[K]>): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          (handler as Function)(...args);
        } catch (error) {
          console.error(`[DappSession ${this.session.uuid}] Error in event handler:`, error);
        }
      });
    }
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners(): void {
    this.eventHandlers.clear();
  }
}

