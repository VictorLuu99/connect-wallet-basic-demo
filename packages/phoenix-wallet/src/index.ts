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
  SignMessagePayload,
  SignTransactionPayload,
} from './types';

// Export constants
export { EVM_CHAINS, SOLANA_CHAINS, PROTOCOL_VERSION } from './types';

// Export utilities
export { QRParser } from './core/QRParser';
