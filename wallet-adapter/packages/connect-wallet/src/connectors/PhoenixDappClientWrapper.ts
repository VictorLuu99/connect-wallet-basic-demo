/**
 * Phoenix Dapp Client Wrapper
 * Wraps phoenix-dapp SDK functionality for wallet-adapter integration
 */

import {
  PhoenixDappClient,
  PhoenixDappConfig,
  ConnectionResult,
  SignMessageParams,
  SignTransactionParams,
  SignAllTransactionsParams,
  SendTransactionParams,
  Session,
  SignResponse,
  ChainType as PhoenixChainType,
} from '@vincenttaylorlab3/phoenix-dapp';
import { ChainType } from '@phoenix-wallet/core';
import { PhoenixConnectorConfig, PhoenixSession, QRCodeOptions } from '../types';

/**
 * Wrapper around PhoenixDappClient that bridges phoenix-dapp SDK to wallet-adapter
 * Handles session management, event bridging, and type conversions
 */
export class PhoenixDappClientWrapper {
  private phoenixClient: PhoenixDappClient;
  private config: Required<Omit<PhoenixConnectorConfig, 'qrOptions'>> & { qrOptions?: QRCodeOptions };
  private _eventEmitter?: any;

  constructor(config: PhoenixConnectorConfig) {
    this.config = {
      serverUrl: config.serverUrl,
      reconnect: config.reconnect ?? true,
      reconnectAttempts: config.reconnectAttempts ?? 5,
      reconnectDelay: config.reconnectDelay ?? 2000,
      enablePersistence: config.enablePersistence ?? true,
      storage: config.storage || { 
        getItem: async () => null, 
        setItem: async () => {}, 
        removeItem: async () => {} 
      },
      qrOptions: config.qrOptions,
    };

    // Initialize phoenix-dapp SDK client
    const phoenixConfig: PhoenixDappConfig = {
      serverUrl: this.config.serverUrl,
      reconnect: this.config.reconnect,
      reconnectAttempts: this.config.reconnectAttempts,
      reconnectDelay: this.config.reconnectDelay,
      storage: {
        getItem: async (key: string) => {
          const result = this.config.storage.getItem(key);
          return result instanceof Promise ? result : Promise.resolve(result);
        },
        setItem: async (key: string, value: string) => {
          const result = this.config.storage.setItem(key, value);
          return result instanceof Promise ? result : Promise.resolve();
        },
        removeItem: async (key: string) => {
          const result = this.config.storage.removeItem(key);
          return result instanceof Promise ? result : Promise.resolve();
        },
      },
      enablePersistence: this.config.enablePersistence,
    };

    this.phoenixClient = new PhoenixDappClient(phoenixConfig);

    // Bridge phoenix-dapp events to wrapper events
    this.setupEventBridge();
  }

  /**
   * Bridge phoenix-dapp SDK events to EventEmitter-style interface
   */
  private setupEventBridge(): void {
    this.phoenixClient.on('session_connected', (session: Session) => {
      this.emit('session_connected', this.convertSession(session));
    });

    this.phoenixClient.on('session_disconnected', () => {
      this.emit('session_disconnected');
    });

    this.phoenixClient.on('request_sent', (requestId: string) => {
      this.emit('request_sent', requestId);
    });

    this.phoenixClient.on('request_response', (response: SignResponse) => {
      this.emit('request_response', response);
    });

    this.phoenixClient.on('error', (error: Error) => {
      this.emit('error', error);
    });
  }

  /**
   * Convert phoenix-dapp Session to PhoenixSession
   */
  private convertSession(session: Session): PhoenixSession {
    return {
      uuid: session.uuid,
      connected: session.connected,
      address: session.address,
      chainType: this.convertChainType(session.chainType),
      chainId: session.chainId,
      serverUrl: this.config.serverUrl,
      connectedAt: Date.now(),
    };
  }

  /**
   * Convert phoenix-dapp ChainType to wallet-adapter ChainType
   */
  private convertChainType(chainType?: PhoenixChainType): ChainType | undefined {
    if (!chainType) return undefined;
    // phoenix-dapp uses lowercase: 'evm' | 'solana'
    // wallet-adapter uses uppercase enum: ChainType.EVM | ChainType.SOLANA
    const upper = chainType.toUpperCase();
    if (upper === 'EVM') return ChainType.EVM;
    if (upper === 'SOLANA') return ChainType.SOLANA;
    if (upper === 'APTOS') return ChainType.APTOS;
    if (upper === 'SUI') return ChainType.SUI;
    return undefined;
  }

  /**
   * Convert wallet-adapter ChainType to phoenix-dapp ChainType
   */
  private convertToPhoenixChainType(chainType: ChainType): PhoenixChainType {
    // wallet-adapter uses enum, phoenix-dapp uses lowercase string
    const str = chainType.toString().toLowerCase();
    return str as PhoenixChainType;
  }

  /**
   * EventEmitter-like interface
   */
  on(event: string, handler: (...args: any[]) => void): void {
    // Route phoenix-dapp events directly, custom events to internal emitter
    if (['session_connected', 'session_disconnected', 'request_sent', 'request_response', 'error'].includes(event)) {
      this.phoenixClient.on(event as any, handler);
    } else {
      if (!this._eventEmitter) {
        const EventEmitter = require('eventemitter3');
        this._eventEmitter = new EventEmitter();
      }
      this._eventEmitter.on(event, handler);
    }
  }

  off(event: string, handler: (...args: any[]) => void): void {
    if (['session_connected', 'session_disconnected', 'request_sent', 'request_response', 'error'].includes(event)) {
      this.phoenixClient.off(event as any, handler);
    } else {
      this._eventEmitter?.off(event, handler);
    }
  }

  once(event: string, handler: (...args: any[]) => void): void {
    if (['session_connected', 'session_disconnected', 'request_sent', 'request_response', 'error'].includes(event)) {
      this.phoenixClient.once(event as any, handler);
    } else {
      if (!this._eventEmitter) {
        const EventEmitter = require('eventemitter3');
        this._eventEmitter = new EventEmitter();
      }
      this._eventEmitter.once(event, handler);
    }
  }

  emit(event: string, ...args: any[]): void {
    // Use internal event emitter for custom events (like qr_generated)
    if (!this._eventEmitter) {
      const EventEmitter = require('eventemitter3');
      this._eventEmitter = new EventEmitter();
    }
    this._eventEmitter.emit(event, ...args);
  }

  /**
   * Connect and generate QR code
   * Returns connection URI for QR code generation
   */
  async connect(): Promise<{ uri: string; uuid: string }> {
    const result: ConnectionResult = await this.phoenixClient.connect();

    // Emit QR generated event
    this.emit('qr_generated', result.uri);

    console.log('[Phoenix] QR Code URI generated:', result.uri);
    console.log('[Phoenix] Waiting for wallet scan...');

    return { uri: result.uri, uuid: result.uuid };
  }

  /**
   * Sign message request
   */
  async signMessage(params: {
    message: string | any;
    chainType: ChainType;
    chainId: string;
  }): Promise<SignResponse> {
    const phoenixParams: SignMessageParams = {
      message: params.message,
      chainType: this.convertToPhoenixChainType(params.chainType),
      chainId: params.chainId,
    };

    return await this.phoenixClient.signMessage(phoenixParams);
  }

  /**
   * Sign transaction request
   */
  async signTransaction(params: {
    transaction: any;
    chainType: ChainType;
    chainId: string;
  }): Promise<SignResponse> {
    const phoenixParams: SignTransactionParams = {
      transaction: params.transaction,
      chainType: this.convertToPhoenixChainType(params.chainType),
      chainId: params.chainId,
    };

    return await this.phoenixClient.signTransaction(phoenixParams);
  }

  /**
   * Sign all transactions (batch signing, e.g., Solana)
   */
  async signAllTransactions(params: {
    transactions: any[];
    chainType: ChainType;
    chainId: string;
  }): Promise<SignResponse> {
    const phoenixParams: SignAllTransactionsParams = {
      transactions: params.transactions,
      chainType: this.convertToPhoenixChainType(params.chainType),
      chainId: params.chainId,
    };

    return await this.phoenixClient.signAllTransactions(phoenixParams);
  }

  /**
   * Send transaction (sign and broadcast, e.g., EVM)
   */
  async sendTransaction(params: {
    transaction: any;
    chainType: ChainType;
    chainId: string;
  }): Promise<SignResponse> {
    const phoenixParams: SendTransactionParams = {
      transaction: params.transaction,
      chainType: this.convertToPhoenixChainType(params.chainType),
      chainId: params.chainId,
    };

    return await this.phoenixClient.sendTransaction(phoenixParams);
  }

  /**
   * Disconnect from wallet
   */
  disconnect(): void {
    this.phoenixClient.disconnect();
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.phoenixClient.isConnected();
  }

  /**
   * Get current session
   */
  getSession(): PhoenixSession | undefined {
    const session = this.phoenixClient.getSession();
    return session ? this.convertSession(session) : undefined;
  }

  /**
   * Wait for client initialization (for session restoration)
   */
  async waitForInitialization(): Promise<void> {
    await this.phoenixClient.waitForInitialization();
  }

  /**
   * Check if client is initialized
   */
  isInitialized(): boolean {
    return this.phoenixClient.isInitialized();
  }

  /**
   * Manually reconnect to existing session
   */
  async reconnect(): Promise<void> {
    await this.phoenixClient.reconnect();
  }

  /**
   * Get underlying phoenix-dapp client (for advanced usage)
   */
  getPhoenixClient(): PhoenixDappClient {
    return this.phoenixClient;
  }
}
