import { ChainType } from './chains';
import { SignMessagePayload, SignTransactionPayload } from './protocol';

/**
 * Wallet signer interface
 * Wallets must implement this interface to use Phoenix Wallet SDK
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
   * @param params - Message signing parameters
   * @returns Promise<string> - Signature string
   */
  signMessage(params: SignMessagePayload): Promise<string>;

  /**
   * Sign and broadcast a transaction
   * @param params - Transaction parameters
   * @returns Promise<string> - Transaction hash
   */
  signTransaction(params: SignTransactionPayload): Promise<string>;
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
