export * from './chains';
export * from './protocol';
export * from './signer';
export * from './events';

/**
 * Storage adapter interface (re-exported from utils)
 */
export type { StorageAdapter } from '../utils/storage';

/**
 * Wallet client configuration
 */
export interface PhoenixWalletConfig {
  reconnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  storage?: import('../utils/storage').StorageAdapter;
  enablePersistence?: boolean; // Default: true
}
