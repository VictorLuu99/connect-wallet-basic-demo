import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { Wallet } from '@phoenix-wallet/core';
import { SolanaChain } from '../chains/SolanaChain';
import { SolanaConnector } from '../connectors/SolanaConnector';
import { SolanaWalletClient } from '../connectors/SolanaWalletClient';
import { ethers } from 'ethers';

export type SolanaTransaction = Transaction | VersionedTransaction;

export class SolanaWallet extends Wallet<SolanaTransaction, SolanaChain, SolanaConnector, SolanaWalletClient> {
  constructor(_address: string, chain: SolanaChain, connector: SolanaConnector, walletClient: SolanaWalletClient) {
    super(_address, chain, connector, walletClient);
  }

  async signMessage(message: string | Uint8Array): Promise<string> {
    const encodedMessage = typeof message === 'string' ? new TextEncoder().encode(message) : message;
    const signedMessage = await this.walletClient.signMessage(encodedMessage);

    return Buffer.from(signedMessage).toString('base64');
  }

  async signTransaction(transaction: SolanaTransaction): Promise<string> {
    let signedTransaction;

    if ('signatures' in transaction && !('message' in transaction)) {
      signedTransaction = await this.walletClient.signTransaction(transaction);

      // @ts-ignore
      return Buffer.from(signedTransaction.serialize()).toString('base64');
    } else if ('message' in transaction) {
      signedTransaction = await this.walletClient.signTransaction(transaction);
      // @ts-ignore
      return Buffer.from(signedTransaction.serialize()).toString('base64');
    }

    throw new Error('Unsupported transaction type');
  }

  sendTransaction(transaction: SolanaTransaction): Promise<string> {
    return this.walletClient.sendTransaction(transaction, this.chain.provider);
  }
  sendRawTransaction(transaction: string): Promise<string> {
    return this.chain.provider.sendRawTransaction(Buffer.from(transaction, 'base64'));
  }

  async signAllTransactions(transactions: SolanaTransaction[]): Promise<string[]> {
    const signedTransactions = await this.walletClient.signAllTransactions(transactions);
    // @ts-ignore
    return signedTransactions.map((transaction) => Buffer.from(transaction.serialize()).toString('base64'));
  }

  get address(): string {
    return this._address;
  }

  async getBalance(): Promise<{ amount: string; uiAmount: string; decimals: number; symbol: string; name: string }> {
    const balance = await this.chain.provider.getBalance(new PublicKey(this._address));
    const nativeCurrency = this.chain.nativeCurrency;
    const uiAmount = ethers.formatUnits(balance, nativeCurrency.decimals);
    return {
      amount: balance.toString(),
      uiAmount: uiAmount,
      decimals: nativeCurrency.decimals,
      symbol: nativeCurrency.symbol,
      name: nativeCurrency.name,
    };
  }
}
