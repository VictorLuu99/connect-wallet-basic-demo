/**
 * Phoenix QR Connector Types
 * Bridges phoenix-dapp/wallet SDKs with wallet-adapter system
 */

import { ChainType } from '@phoenix-wallet/core';

/**
 * Phoenix connection configuration
 */
export interface PhoenixConnectorConfig {
  /**
   * WebSocket relay server URL
   */
  serverUrl: string;

  /**
   * Enable auto-reconnection
   * @default true
   */
  reconnect?: boolean;

  /**
   * Max reconnection attempts
   * @default 5
   */
  reconnectAttempts?: number;

  /**
   * Reconnection delay in ms
   * @default 2000
   */
  reconnectDelay?: number;

  /**
   * Enable session persistence
   * @default true
   */
  enablePersistence?: boolean;

  /**
   * Custom storage adapter
   */
  storage?: StorageAdapter;

  /**
   * QR code options
   */
  qrOptions?: QRCodeOptions;
}

/**
 * QR code display options
 */
export interface QRCodeOptions {
  /**
   * QR code size in pixels
   * @default 300
   */
  size?: number;

  /**
   * Background color
   * @default "#ffffff"
   */
  bgColor?: string;

  /**
   * Foreground color
   * @default "#000000"
   */
  fgColor?: string;

  /**
   * Error correction level
   * @default "M"
   */
  level?: 'L' | 'M' | 'Q' | 'H';

  /**
   * Include logo/image in center
   */
  imageSettings?: {
    src: string;
    height: number;
    width: number;
    excavate?: boolean;
  };
}

/**
 * Phoenix session information
 */
export interface PhoenixSession {
  uuid: string;
  connected: boolean;
  address?: string;
  chainType?: ChainType;
  chainId?: string;
  serverUrl: string;
  connectedAt?: number;
}

/**
 * Storage adapter interface
 */
export interface StorageAdapter {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
  removeItem(key: string): Promise<void> | void;
}

/**
 * Phoenix connector events
 */
export interface PhoenixConnectorEvents {
  qr_generated: (uri: string) => void;
  qr_scanned: () => void;
  session_connected: (session: PhoenixSession) => void;
  session_disconnected: () => void;
  session_restored: (session: PhoenixSession) => void;
  error: (error: Error) => void;
}

/**
 * Sign request from dApp
 */
export interface PhoenixSignRequest {
  id: string;
  type: 'sign_message' | 'sign_transaction' | 'sign_all_transactions' | 'send_transaction';
  chainType: ChainType;
  chainId: string;
  payload: any; // Decoded payload
  timestamp: number;
}

/**
 * Sign response to dApp
 */
export interface PhoenixSignResponse {
  id: string;
  type: string;
  status: 'success' | 'error';
  result?: {
    signature?: string;
    signatures?: string[];
    txHash?: string;
    txHashes?: string[];
  };
  error?: string;
  timestamp: number;
}

/**
 * Virtual provider interface for EVM
 * Emulates window.ethereum provider using phoenix-dapp SDK
 */
export interface PhoenixVirtualProvider {
  request(args: { method: string; params?: any[] }): Promise<any>;
  on(event: string, handler: (...args: any[]) => void): void;
  removeListener(event: string, handler: (...args: any[]) => void): void;
  isPhoenixProvider: boolean;
}

/**
 * WalletSigner interface from phoenix-wallet SDK
 * Bridges IWallet to phoenix protocol
 */
export interface WalletSigner {
  address: string;
  chainType: ChainType;
  signMessage(params: any): Promise<string>;
  signTransaction(params: any): Promise<string>;
  signAllTransactions?(transactions: any[]): Promise<string[]>;
  sendTransaction?(params: any): Promise<string>;
}
