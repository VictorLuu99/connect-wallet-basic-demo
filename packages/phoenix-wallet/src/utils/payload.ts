/**
 * Payload encoding/decoding utilities for multi-chain support
 * Handles serialization of chain-specific payloads to/from JSON strings
 */

/**
 * JSON-serializable value type
 */
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

/**
 * JSON-serializable object type
 */
export type JsonObject = { [key: string]: JsonValue };

/**
 * Encode payload object to JSON string
 * Handles Uint8Array by converting to base64 string
 */
export function encodePayload(payload: JsonValue | MessagePayload | TransactionPayload | { transactions: TransactionPayload[] } | Record<string, unknown>): string {
  try {
    // Handle Uint8Array - convert to base64
    if (payload instanceof Uint8Array) {
      // Convert Uint8Array to base64 string
      const base64 = btoa(String.fromCharCode(...payload));
      return JSON.stringify({ __uint8array: base64 });
    }
    
    // Handle MessagePayload that might contain Uint8Array
    if (typeof payload === 'object' && payload !== null && 'message' in payload) {
      const msgPayload = payload as { message: string | Uint8Array; [key: string]: unknown };
      if (msgPayload.message instanceof Uint8Array) {
        const base64 = btoa(String.fromCharCode(...msgPayload.message));
        return JSON.stringify({ ...msgPayload, message: { __uint8array: base64 } });
      }
    }
    
    return JSON.stringify(payload);
  } catch (error) {
    throw new Error(`Failed to encode payload: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decode JSON string to payload object
 */
export function decodePayload<T = JsonValue>(payloadString: string): T {
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
  message: string | Uint8Array;
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
  [key: string]: JsonValue | undefined | string | number;
}

/**
 * Solana-specific payload types (for convenience)
 */
export interface SolanaMessagePayload {
  message: string | Uint8Array;
}

/**
 * Solana instruction (simplified - can be extended)
 */
export interface SolanaInstruction {
  programId: string;
  keys?: Array<{ pubkey: string; isSigner?: boolean; isWritable?: boolean }>;
  data?: string;
  [key: string]: JsonValue | undefined;
}

export interface SolanaTransactionPayload {
  instructions: SolanaInstruction[];
  recentBlockhash?: string;
  feePayer?: string;
  [key: string]: JsonValue | undefined | SolanaInstruction[] | string;
}

/**
 * Generic payload types
 * Supports string, Uint8Array, or chain-specific payload objects
 */
export type MessagePayload = 
  | string 
  | Uint8Array 
  | EVMMessagePayload 
  | SolanaMessagePayload
  | { message: string | Uint8Array; [key: string]: JsonValue | undefined | string | Uint8Array };

export type TransactionPayload = 
  | EVMTransactionPayload 
  | SolanaTransactionPayload
  | JsonObject;

