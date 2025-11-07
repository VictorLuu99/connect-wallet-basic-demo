/**
 * Phoenix Wallet SDK
 * WalletConnect-style protocol SDK for wallet developers
 */

export { PhoenixWalletClient } from './PhoenixWalletClient';

// Export types
export type {
  PhoenixWalletConfig,
  PhoenixWalletEvents,
  WalletSigner,
  MultiChainWalletSigner,
  Session,
  SignRequest,
  SignResponse,
  PhoenixURI,
  ChainType,
  ChainConfig,
  SignRequestType,
  SignResponseStatus,
  StorageAdapter,
} from './types';

// Export payload utilities
export { encodePayload, decodePayload } from './utils/payload';
export type {
  EVMMessagePayload,
  EVMTransactionPayload,
  SolanaMessagePayload,
  SolanaTransactionPayload,
  MessagePayload,
  TransactionPayload,
} from './utils/payload';

// Export constants
export { EVM_CHAINS, SOLANA_CHAINS, PROTOCOL_VERSION } from './types';

// Export utilities
export { QRParser } from './core/QRParser';

// Export storage adapters
export {
  LocalStorageAdapter,
  AsyncStorageAdapter,
  MemoryStorageAdapter,
  getDefaultStorageAdapter,
} from './utils/storage';
export type { StorageAdapter as StorageAdapterType } from './utils/storage';
