import { Chain } from './Chain';
import { IConnector } from './IConnector';

export interface IWallet<T, K extends Chain<any>, Q extends IConnector, M> {
  chain: K;
  connector: Q;
  _walletClient: M;
  signMessage(message: string | Uint8Array): Promise<string>;
  signTransaction(transaction: T): Promise<string | { transaction: string; signature: string }>;
  sendTransaction(transaction: T): Promise<string>;
  sendRawTransaction(data: string | { transaction: string; signature: string }): Promise<string>;
  signAllTransactions(transactions: T[]): Promise<(string | { transaction: T; signature: string })[]>;
  getBalance(): Promise<{ amount: string; uiAmount: string; decimals: number; symbol: string; name: string }>;
  get address(): string;
  get walletClient(): M;
}

export abstract class Wallet<T, K extends Chain<any>, Q extends IConnector, M> implements IWallet<T, K, Q, M> {
  chain: K;
  connector: Q;
  _address: string;
  _walletClient: M;

  constructor(_address: string, chain: K, connector: Q, walletClient: M) {
    this._address = _address;
    this.chain = chain;
    this.connector = connector;
    this._walletClient = walletClient;
  }

  abstract signMessage(message: string | Uint8Array): Promise<string>;
  abstract signTransaction(transaction: T): Promise<string | { transaction: string; signature: string }>;
  abstract sendTransaction(transaction: T): Promise<string>;
  abstract sendRawTransaction(data: string | { transaction: string; signature: string }): Promise<string>;
  abstract signAllTransactions(transactions: T[]): Promise<(string | { transaction: T; signature: string })[]>;
  abstract getBalance(): Promise<{ amount: string; uiAmount: string; decimals: number; symbol: string; name: string }>;
  abstract get address(): string;

  get walletClient(): M {
    return this._walletClient;
  }
}

