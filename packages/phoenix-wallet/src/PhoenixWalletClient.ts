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

/**
 * Phoenix Wallet Client
 * Main SDK for wallet developers to handle dApp connection requests
 */
export class PhoenixWalletClient extends EventEmitter<PhoenixWalletEvents> {
  private socket?: Socket;
  private encryption: EncryptionManager;
  private requestHandler: RequestHandler;
  private session?: Session;
  private config: Required<PhoenixWalletConfig>;

  constructor(config?: PhoenixWalletConfig) {
    super();

    this.config = {
      reconnect: config?.reconnect ?? true,
      reconnectAttempts: config?.reconnectAttempts ?? 5,
      reconnectDelay: config?.reconnectDelay ?? 2000,
    };

    this.encryption = new EncryptionManager();
    this.requestHandler = new RequestHandler();
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
   * Ensure client is connected
   */
  private ensureConnected(): void {
    if (!this.session?.connected) {
      throw new Error('Not connected - call connect() first');
    }
  }
}
