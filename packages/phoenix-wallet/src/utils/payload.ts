/**
 * Payload encoding/decoding utilities for multi-chain support
 * Handles serialization of chain-specific payloads to/from JSON strings
 */

/**
 * Encode payload object to JSON string
 */
export function encodePayload(payload: any): string {
  try {
    return JSON.stringify(payload);
  } catch (error) {
    throw new Error(`Failed to encode payload: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decode JSON string to payload object
 */
export function decodePayload<T = any>(payloadString: string): T {
  try {
    return JSON.parse(payloadString) as T;
  } catch (error) {
    throw new Error(`Failed to decode payload: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * EVM-specific payload types (for convenience)
 */
export interface EVMMessagePayload {
  message: string;
}

export interface EVMTransactionPayload {
  to: string;
  value: string;
  data?: string;
  gasLimit?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  nonce?: number;
  chainId?: number;
  // Additional EVM fields
  [key: string]: any;
}

/**
 * Solana-specific payload types (for convenience)
 */
export interface SolanaMessagePayload {
  message: string;
}

export interface SolanaTransactionPayload {
  // Solana transaction fields
  instructions: any[];
  recentBlockhash?: string;
  feePayer?: string;
  [key: string]: any;
}

/**
 * Generic payload types
 */
export type MessagePayload = EVMMessagePayload | SolanaMessagePayload | any;
export type TransactionPayload = EVMTransactionPayload | SolanaTransactionPayload | any;

