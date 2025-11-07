export * from './chains';
export * from './protocol';
export * from './events';

/**
 * Storage adapter interface (re-exported from utils)
 */
export type { StorageAdapter } from '../utils/storage';

/**
 * DAPP client configuration
 */
export interface PhoenixDappConfig {
  serverUrl: string;
  reconnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  storage?: import('../utils/storage').StorageAdapter;
  enablePersistence?: boolean; // Default: true
}

/**
 * Sign message parameters
 */
export interface SignMessageParams {
  message: string | any; // Can be string or chain-specific message object
  chainType: import('./chains').ChainType;
  chainId: string;
}

/**
 * Sign transaction parameters
 */
export interface SignTransactionParams {
  transaction: any; // Chain-specific transaction object (EVM, Solana, etc.)
  chainType: import('./chains').ChainType;
  chainId: string;
}

/**
 * Sign all transactions parameters (for batch signing, e.g., Solana)
 */
export interface SignAllTransactionsParams {
  transactions: any[]; // Array of chain-specific transaction objects
  chainType: import('./chains').ChainType;
  chainId: string;
}

/**
 * Send transaction parameters (for direct send, e.g., EVM)
 */
export interface SendTransactionParams {
  transaction: any; // Chain-specific transaction object
  chainType: import('./chains').ChainType;
  chainId: string;
}

/**
 * Connection result
 */
export interface ConnectionResult {
  uri: string;
  uuid: string;
}
