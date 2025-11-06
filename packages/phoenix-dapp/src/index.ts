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
  Session,
  SignRequest,
  SignResponse,
  PhoenixURI,
  ChainType,
  ChainConfig,
  SignRequestType,
  SignResponseStatus,
  SignMessagePayload,
  SignTransactionPayload,
} from './types';

// Export constants
export { EVM_CHAINS, SOLANA_CHAINS, PROTOCOL_VERSION } from './types';
