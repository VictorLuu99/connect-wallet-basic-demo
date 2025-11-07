import { ChainType } from './chains';

/**
 * Wallet signer interface
 * Wallets must implement this interface to use Phoenix Wallet SDK
 * Payloads are decoded from JSON strings to chain-specific objects
 */
export interface WalletSigner {
  /**
   * Wallet address
   */
  address: string;

  /**
   * Chain type this signer supports
   */
  chainType: ChainType;

  /**
   * Sign a message
   * @param params - Message signing parameters (decoded from JSON string)
   * @returns Promise<string> - Signature string
   */
  signMessage(params: any): Promise<string>;

  /**
   * Sign a transaction (returns signature, does not broadcast)
   * @param params - Transaction parameters (decoded from JSON string)
   * @returns Promise<string> - Transaction signature
   */
  signTransaction(params: any): Promise<string>;

  /**
   * Sign multiple transactions (for batch signing, e.g., Solana)
   * @param transactions - Array of transaction parameters (decoded from JSON string)
   * @returns Promise<string[]> - Array of transaction signatures
   */
  signAllTransactions?(transactions: any[]): Promise<string[]>;

  /**
   * Sign and send a transaction (broadcasts immediately, e.g., EVM)
   * @param params - Transaction parameters (decoded from JSON string)
   * @returns Promise<string> - Transaction hash
   */
  sendTransaction?(params: any): Promise<string>;
}

/**
 * Multi-chain wallet signer
 * For wallets that support multiple chains
 */
export interface MultiChainWalletSigner {
  /**
   * Get signer for specific chain
   */
  getSigner(chainType: ChainType): WalletSigner | undefined;

  /**
   * Get all supported chain types
   */
  getSupportedChains(): ChainType[];
}
