import { ethers } from 'ethers';
import { Wallet } from '@phoenix-wallet/core';
import { EvmChain } from '../chains/EvmChain';
import { EvmConnector } from '../connectors/EvmConnector';
import { WalletClient } from 'viem';

export interface EvmTransaction {
  to: string;
  value: string;
  data: string;
  gasLimit?: string;
  gasPrice?: string;
}

export class EvmWallet extends Wallet<EvmTransaction, EvmChain, EvmConnector, WalletClient> {
  constructor(_address: string, chain: EvmChain, connector: EvmConnector, walletClient: WalletClient) {
    super(_address, chain, connector, walletClient);
  }

  async signTransaction(transaction: EvmTransaction): Promise<string> {
    const request = await this.walletClient.prepareTransactionRequest({
      account: this._address as `0x${string}`,
      to: transaction.to as `0x${string}`,
      value: BigInt(transaction.value),
      chain: this.walletClient.chain,
    });

    return await this.walletClient.signTransaction({
      ...request,
      account: this._address as `0x${string}`,
    });
  }
  async signMessage(message: string | Uint8Array): Promise<string> {
    return await this.walletClient.signMessage({
      account: this._address as `0x${string}`,
      message: typeof message === 'string' ? message : { raw: message },
    });
  }
  get address(): string {
    return this._address;
  }

  sendTransaction(transaction: EvmTransaction): Promise<string> {
    return this.walletClient.sendTransaction({
      account: this._address as `0x${string}`,
      to: transaction.to as `0x${string}`,
      value: BigInt(transaction.value),
      chain: this.walletClient.chain,
    });
  }

  sendRawTransaction(transaction: string): Promise<string> {
    return this.walletClient.sendRawTransaction({
      serializedTransaction: transaction as `0x${string}`,
    });
  }

  signAllTransactions(transactions: EvmTransaction[]): Promise<string[]> {
    throw new Error('Method not supported');
  }

  get walletClient(): WalletClient {
    return this._walletClient;
  }

  async getBalance(): Promise<{ amount: string; uiAmount: string; decimals: number; symbol: string; name: string }> {
    const balance = await this.chain.provider.getBalance(this._address as `0x${string}`);

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
