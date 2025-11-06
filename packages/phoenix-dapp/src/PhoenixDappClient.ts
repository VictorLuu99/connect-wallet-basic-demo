import { EventEmitter } from 'eventemitter3';
import { io, Socket } from 'socket.io-client';
import {
  PhoenixDappConfig,
  PhoenixDappEvents,
  ConnectionResult,
  SignMessageParams,
  SignTransactionParams,
  Session,
  SignRequest,
  SignResponse,
  PhoenixURI,
  PROTOCOL_VERSION,
  EncryptedMessage,
} from './types';
import { EncryptionManager } from './utils/encryption';
import { QRCodeGenerator } from './core/QRCodeGenerator';
import { RequestManager } from './core/RequestManager';
import { SOCKET_EVENTS, TIMEOUTS } from './utils/constants';
import { isValidTimestamp } from './utils/validation';

/**
 * Phoenix DAPP Client
 * Main SDK for dApp developers to connect with wallets
 */
export class PhoenixDappClient extends EventEmitter<PhoenixDappEvents> {
  private socket?: Socket;
  private encryption: EncryptionManager;
  private requestManager: RequestManager;
  private session?: Session;
  private config: Required<PhoenixDappConfig>;

  constructor(config: PhoenixDappConfig) {
    super();

    this.config = {
      serverUrl: config.serverUrl,
      reconnect: config.reconnect ?? true,
      reconnectAttempts: config.reconnectAttempts ?? 5,
      reconnectDelay: config.reconnectDelay ?? 2000,
    };

    this.encryption = new EncryptionManager();
    this.requestManager = new RequestManager(TIMEOUTS.REQUEST_TIMEOUT);
  }

  /**
   * Connect and generate QR code for wallet scanning
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

    // Generate QR code
    const qrCodeUrl = await QRCodeGenerator.generateQRCode(connectionData);
    const uri = QRCodeGenerator.encodeURI(connectionData);

    // Initialize session
    this.session = {
      uuid,
      connected: false,
    };

    // Connect socket
    await this.connectSocket(uuid);

    return { qrCodeUrl, uri, uuid };
  }

  /**
   * Sign a message
   */
  async signMessage(params: SignMessageParams): Promise<SignResponse> {
    this.ensureConnected();

    const requestId = this.requestManager.generateRequestId('sign_message');

    const request: SignRequest = {
      id: requestId,
      type: 'sign_message',
      chainType: params.chainType,
      chainId: params.chainId,
      payload: {
        message: params.message,
      },
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

    const request: SignRequest = {
      id: requestId,
      type: 'sign_transaction',
      chainType: params.chainType,
      chainId: params.chainId,
      payload: params.transaction,
      timestamp: Date.now(),
    };

    return this.sendRequest(request);
  }

  /**
   * Disconnect from wallet
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = undefined;
    }

    this.requestManager.clearAll();
    this.session = undefined;

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
    return new Promise((resolve, reject) => {
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
        resolve();
      });

      // Connection error
      this.socket.on(SOCKET_EVENTS.ERROR, (error: Error) => {
        console.error('[Phoenix DAPP] Socket error:', error);
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
        console.log('[Phoenix DAPP] Disconnected from server');
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
   * Ensure client is connected
   */
  private ensureConnected(): void {
    if (!this.session?.connected) {
      throw new Error('Not connected - call connect() first');
    }
  }
}
