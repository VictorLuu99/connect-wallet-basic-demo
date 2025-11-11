import { Transaction } from '@mysten/sui/transactions';
import { Wallet, logger } from '@phoenix-wallet/core';
import { SuiChain } from '../chains/SuiChain';
import { SuiConnector } from '../connectors/SuiConnector';
import { SuiTransactionBlock } from '../types/sui';
import { fromBase64 } from '@mysten/sui/utils';
import { SuiWalletClientStandard } from '../connectors/SuiWalletClientStandard';
import {
  SuiSignAndExecuteTransactionInput,
  SuiSignAndExecuteTransactionOutput,
  SuiSignTransactionInput,
  WalletAccount,
} from '@mysten/wallet-standard';
// Sui Transaction Type
export type SuiTransaction = SuiSignTransactionInput;

export class SuiWallet extends Wallet<SuiTransaction, SuiChain, SuiConnector, SuiWalletClientStandard> {
  constructor(address: string, chain: SuiChain, connector: SuiConnector, walletClient: SuiWalletClientStandard) {
    super(address, chain, connector, walletClient);
  }

  // Convert Transaction to SuiTransactionBlock format
  // private async convertToSuiTransactionBlock(transaction: SuiTransaction): Promise<SuiTransactionBlock> {
  //   // Build the transaction to get serialized format
  //   const builtTransaction = await transaction.toJSON();

  //   // Parse the built transaction to create SuiTransactionBlock
  //   return builtTransaction as any;
  // }

  // Sign a transaction block without executing it
  async signTransaction(transaction: SuiSignTransactionInput): Promise<{ transaction: string; signature: string }> {
    try {
      // Get the provider from connector
      if (!this.walletClient) {
        throw new Error('Sui wallet client not available');
      }

      const signedTransaction = await this.walletClient.signTransaction(transaction);

      return { transaction: signedTransaction.toString(), signature: signedTransaction.signature };
    } catch (error) {
      logger.error('Error signing Sui transaction:', error);
      throw error;
    }
  }

  // Sign a message
  async signMessage(data: string): Promise<string> {
    const dataReturn = data as unknown as { message: Uint8Array; account: WalletAccount };
    try {
      if (!this.walletClient) {
        throw new Error('Sui wallet client not available');
      }

      const signedMessage = await this.walletClient.signMessage({
        message: dataReturn.message,
        account: dataReturn.account,
      });

      return signedMessage.signature;
    } catch (error) {
      logger.error('Error signing Sui message:', error);
      throw error;
    }
  }

  // Get wallet address
  get address(): string {
    return this._address;
  }

  // Execute a transaction (sign and submit)
  async sendTransaction(transaction: SuiSignAndExecuteTransactionInput): Promise<string> {
    try {
      if (!this.walletClient) {
        throw new Error('Sui wallet client not available');
      }

      const result = await this.walletClient.signAndExecuteTransaction(transaction);

      return result.digest;
    } catch (error) {
      logger.error('Error sending Sui transaction:', error);
      throw error;
    }
  }

  // Send a pre-signed transaction
  sendRawTransaction(transaction: string): Promise<string> {
    // return this.chain.provider.sendRawTransaction(Buffer.from(transaction, 'base64'));
    return new Promise(() => new Error('Not implemented'));
  }

  async signAllTransactions(transactions: any): Promise<string[]> {
    // const signedTransactions = await this.walletClient.signAllTransactions(transactions);
    // @ts-ignore
    // return signedTransactions.map((transaction) => Buffer.from(transaction.serialize()).toString('base64'));
    return new Promise(() => new Error('Not implemented'));
  }

  // Get the Sui client instance
  get walletClient(): SuiWalletClientStandard {
    return this._walletClient;
  }

  // Additional Sui-specific methods

  // Get account balance for native SUI
  async getBalance(): Promise<{ amount: string; uiAmount: string; decimals: number; symbol: string; name: string }> {
    try {
      const balance = await this.chain.provider.getBalance({
        owner: this._address,
        coinType: '0x2::sui::SUI',
      });

      const nativeCurrency = this.chain.nativeCurrency;
      const amount = balance.totalBalance;
      const uiAmount = (parseInt(amount) / Math.pow(10, nativeCurrency.decimals)).toString();

      return {
        amount: amount,
        uiAmount: uiAmount,
        decimals: nativeCurrency.decimals,
        symbol: nativeCurrency.symbol,
        name: nativeCurrency.name,
      };
    } catch (error) {
      logger.error('Error getting Sui balance:', error);
      throw error;
    }
  }

  // Get balance for specific coin type
  async getBalanceForCoin(coinType: string = '0x2::sui::SUI'): Promise<string> {
    try {
      const balance = await this.chain.provider.getBalance({
        owner: this._address,
        coinType: coinType,
      });
      return balance.totalBalance;
    } catch (error) {
      logger.error('Error getting Sui balance:', error);
      throw error;
    }
  }

  // Get all coin balances
  async getAllBalances(): Promise<Array<{ coinType: string; balance: string }>> {
    try {
      const balances = await this.chain.provider.getAllBalances({
        owner: this._address,
      });
      return balances.map((balance) => ({
        coinType: balance.coinType,
        balance: balance.totalBalance,
      }));
    } catch (error) {
      logger.error('Error getting all Sui balances:', error);
      throw error;
    }
  }

  // Get owned objects with simpler filter
  async getOwnedObjects(options?: {
    filter?: {
      StructType?: string;
    };
    limit?: number;
  }) {
    try {
      const objects = await this.chain.provider.getOwnedObjects({
        owner: this._address,
        filter: options?.filter?.StructType ? { StructType: options.filter.StructType } : null,
        options: {
          showType: true,
          showOwner: true,
          showPreviousTransaction: true,
          showDisplay: true,
          showContent: true,
          showBcs: false,
        },
        limit: options?.limit || 50,
      });
      return objects.data;
    } catch (error) {
      logger.error('Error getting owned Sui objects:', error);
      throw error;
    }
  }

  // Get transaction history
  async getTransactionHistory(limit: number = 20) {
    try {
      const transactions = await this.chain.provider.queryTransactionBlocks({
        filter: {
          FromAddress: this._address,
        },
        limit: limit,
        order: 'descending',
        options: {
          showInput: true,
          showEffects: true,
          showEvents: true,
          showObjectChanges: true,
          showBalanceChanges: true,
        },
      });
      return transactions.data;
    } catch (error) {
      logger.error('Error getting Sui transaction history:', error);
      throw error;
    }
  }
}
