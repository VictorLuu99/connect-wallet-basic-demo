/**
 * WalletSigner Adapter
 * Bridges wallet-adapter's IWallet to phoenix-wallet SDK's WalletSigner interface
 */

import { IWallet, ChainType } from '@phoenix-wallet/core';
import { WalletSigner } from '../types';

/**
 * Adapter that wraps wallet-adapter's IWallet and implements WalletSigner
 * Allows existing wallet-adapter wallets to work with phoenix-wallet SDK
 */
export class WalletSignerAdapter implements WalletSigner {
  private wallet: IWallet<any, any, any, any>;

  constructor(wallet: IWallet<any, any, any, any>) {
    this.wallet = wallet;
  }

  /**
   * Get wallet address
   */
  get address(): string {
    return this.wallet.address;
  }

  /**
   * Get chain type (EVM, SOLANA, etc.)
   */
  get chainType(): ChainType {
    return this.wallet.connector.chainType;
  }

  /**
   * Sign message
   * Phoenix-wallet SDK passes params that need to be decoded
   */
  async signMessage(params: any): Promise<string> {
    try {
      // Phoenix SDK encodes message as JSON string
      // Decode it back to original format
      const message = this.decodeMessageParams(params);

      // Call wallet-adapter's signMessage
      const signature = await this.wallet.signMessage(message);

      return signature;
    } catch (error: any) {
      throw new Error(`Failed to sign message: ${error.message}`);
    }
  }

  /**
   * Sign transaction
   * Phoenix-wallet SDK passes transaction params as JSON-encoded string
   */
  async signTransaction(params: any): Promise<string> {
    try {
      // Decode transaction params from JSON
      const transaction = this.decodeTransactionParams(params);

      // Call wallet-adapter's signTransaction
      const result = await this.wallet.signTransaction(transaction);

      // wallet-adapter may return string or { transaction, signature }
      if (typeof result === 'string') {
        return result;
      } else if (result && typeof result === 'object' && 'signature' in result) {
        return result.signature;
      }

      throw new Error('Invalid signature format returned from wallet');
    } catch (error: any) {
      throw new Error(`Failed to sign transaction: ${error.message}`);
    }
  }

  /**
   * Sign all transactions (batch signing, mainly for Solana)
   * Optional method - not all wallets support this
   */
  async signAllTransactions(transactions: any[]): Promise<string[]> {
    try {
      // Decode each transaction
      const decodedTransactions = transactions.map((tx) =>
        this.decodeTransactionParams(tx)
      );

      // Call wallet-adapter's signAllTransactions
      const results = await this.wallet.signAllTransactions(decodedTransactions);

      // Extract signatures from results
      return results.map((result) => {
        if (typeof result === 'string') {
          return result;
        } else if (result && typeof result === 'object' && 'signature' in result) {
          return result.signature;
        }
        throw new Error('Invalid signature format in batch');
      });
    } catch (error: any) {
      throw new Error(`Failed to sign all transactions: ${error.message}`);
    }
  }

  /**
   * Send transaction (sign and broadcast)
   * Optional method - mainly for EVM
   */
  async sendTransaction(params: any): Promise<string> {
    try {
      // Decode transaction params
      const transaction = this.decodeTransactionParams(params);

      // Call wallet-adapter's sendTransaction
      const txHash = await this.wallet.sendTransaction(transaction);

      return txHash;
    } catch (error: any) {
      throw new Error(`Failed to send transaction: ${error.message}`);
    }
  }

  /**
   * Decode message parameters from phoenix protocol format
   * Phoenix SDK may send string or { message: string }
   */
  private decodeMessageParams(params: any): string | Uint8Array {
    if (typeof params === 'string') {
      return params;
    }

    if (params && typeof params === 'object') {
      // Try to parse as JSON if it's a string
      if (typeof params === 'string') {
        try {
          const parsed = JSON.parse(params);
          return parsed.message || parsed;
        } catch {
          return params;
        }
      }

      // Extract message field
      if ('message' in params) {
        return params.message;
      }

      // If it's Uint8Array
      if (params instanceof Uint8Array) {
        return params;
      }
    }

    return params;
  }

  /**
   * Decode transaction parameters from phoenix protocol format
   * Phoenix SDK encodes transactions as JSON strings for multi-chain support
   */
  private decodeTransactionParams(params: any): any {
    // If params is a JSON string, parse it
    if (typeof params === 'string') {
      try {
        return JSON.parse(params);
      } catch {
        // If parsing fails, return as-is
        return params;
      }
    }

    // Already an object, return as-is
    return params;
  }
}

/**
 * Create WalletSigner from IWallet
 * Convenience function for creating adapter
 */
export function createWalletSigner(
  wallet: IWallet<any, any, any, any>
): WalletSigner {
  return new WalletSignerAdapter(wallet);
}
