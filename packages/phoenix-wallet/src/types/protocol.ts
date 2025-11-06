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
export type SignRequestType = 'sign_message' | 'sign_transaction';

/**
 * Sign message payload
 */
export interface SignMessagePayload {
  message: string;
}

/**
 * Sign transaction payload
 */
export interface SignTransactionPayload {
  to: string;
  value: string;
  data?: string;
  gasLimit?: string;
  gasPrice?: string;
  nonce?: number;
  // Additional chain-specific fields
  [key: string]: any;
}

/**
 * Sign request (decrypted payload)
 */
export interface SignRequest {
  id: string;
  type: SignRequestType;
  chainType: ChainType;
  chainId: string;
  payload: SignMessagePayload | SignTransactionPayload;
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
  txHash?: string;
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
