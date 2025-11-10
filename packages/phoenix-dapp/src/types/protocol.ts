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
  appUrl?: string; // Optional dApp app URL
}

/**
 * Session token for cryptographic proof of wallet identity
 * Signed by wallet's blockchain private key (not encryption key)
 */
export interface SessionToken {
  sessionId: string;        // UUID of connection
  walletAddress: string;    // Blockchain address
  chainType: ChainType;     // 'evm' | 'solana' | ...
  appUrl?: string;          // dApp's app URL (optional)
  serverUrl: string;        // Backend relay URL
  dappPublicKey: string;    // dApp's encryption public key (base64)
  timestamp: number;        // Creation time (replay protection)
  signature: string;        // Digital signature of all above fields
}

/**
 * Connection response data (encrypted in connected_uuid event)
 */
export interface ConnectionResponseData {
  sessionToken: SessionToken;
  address: string;
  chainType: ChainType;
  chainId?: string;
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
  sessionToken: SessionToken; // Cryptographic proof of wallet identity
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
  sessionToken?: SessionToken; // Authenticated session token from wallet
}
