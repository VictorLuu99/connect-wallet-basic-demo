import { IWallet } from '@phoenix-wallet/core';

export interface ResponseTransacton {
  txHash: string;
  wait(): Promise<void>;
}
export interface ITokenContract {
  set wallet(wallet: IWallet<any, any, any, any> | undefined); // always defined in Contract
  getBalance(address: string): Promise<{ amount: string; uiAmount: string }>;
  getAllowance(address: string, spender: string): Promise<string>;
  getDecimals(): Promise<number>;
  getSymbol(): Promise<string>;
  getTotalSupply(): Promise<string>;
  transfer(to: string, amount: string): Promise<ResponseTransacton>;
}
