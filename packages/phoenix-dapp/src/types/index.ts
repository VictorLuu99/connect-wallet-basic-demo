export * from './chains';
export * from './protocol';
export * from './events';

/**
 * DAPP client configuration
 */
export interface PhoenixDappConfig {
  serverUrl: string;
  reconnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

/**
 * Sign message parameters
 */
export interface SignMessageParams {
  message: string;
  chainType: import('./chains').ChainType;
  chainId: string;
}

/**
 * Sign transaction parameters
 */
export interface SignTransactionParams {
  transaction: import('./protocol').SignTransactionPayload;
  chainType: import('./chains').ChainType;
  chainId: string;
}

/**
 * Connection result
 */
export interface ConnectionResult {
  qrCodeUrl: string;
  uri: string;
  uuid: string;
}
