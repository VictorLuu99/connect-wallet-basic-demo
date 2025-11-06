export * from './chains';
export * from './protocol';
export * from './signer';
export * from './events';

/**
 * Wallet client configuration
 */
export interface PhoenixWalletConfig {
  reconnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}
