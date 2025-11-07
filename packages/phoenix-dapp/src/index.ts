/**
 * Phoenix DAPP SDK
 * WalletConnect-style protocol SDK for dApp developers
 */

export { PhoenixDappClient } from './PhoenixDappClient';

// Export types
export type {
  PhoenixDappConfig,
  PhoenixDappEvents,
  ConnectionResult,
  SignMessageParams,
  SignTransactionParams,
  SignAllTransactionsParams,
  SendTransactionParams,
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

// Export storage adapters
export {
  LocalStorageAdapter,
  MemoryStorageAdapter,
  getDefaultStorageAdapter,
} from './utils/storage';
export type { StorageAdapter as StorageAdapterType } from './utils/storage';
