import { ChainType } from './chains';

/**
 * Phoenix protocol version
 */
export const PROTOCOL_VERSION = '1';

/**
 * Phoenix connection URI
 */
export interface PhoenixURI {
  version: string;
  uuid: string;
  serverUrl: string;
  publicKey: string;
}

/**
 * Encrypted message envelope
 */
export interface EncryptedMessage {
  uuid: string;
  encryptedPayload: string; // base64
  nonce: string; // base64
  timestamp: number;
}

/**
 * Sign request types
 */
export type SignRequestType = 
  | 'sign_message' 
  | 'sign_transaction' 
  | 'sign_all_transactions' 
  | 'send_transaction';

/**
 * Sign request (decrypted payload)
 * Payload is a JSON-encoded string to support multi-chain (EVM, Solana, etc.)
 */
export interface SignRequest {
  id: string;
  type: SignRequestType;
  chainType: ChainType;
  chainId: string;
  payload: string; // JSON-encoded string for multi-chain support
  timestamp: number;
}

/**
 * Sign response status
 */
export type SignResponseStatus = 'success' | 'error';

/**
 * Sign response result
 */
export interface SignResponseResult {
  signature?: string;
  signatures?: string[]; // For batch signing (e.g., Solana)
  txHash?: string;
  txHashes?: string[]; // For batch transactions
  message?: string;
}

/**
 * Sign response (decrypted payload)
 */
export interface SignResponse {
  id: string;
  type: SignRequestType;
  status: SignResponseStatus;
  result?: SignResponseResult;
  error?: string;
  timestamp: number;
}

/**
 * Session info
 */
export interface Session {
  uuid: string;
  connected: boolean;
  address?: string;
  chainType?: ChainType;
  chainId?: string;
}
