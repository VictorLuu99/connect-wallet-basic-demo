import { Wallet, logger } from '@phoenix-wallet/core';
import { AptosChain } from '../chains/AptosChain';
import { AptosConnector } from '../connectors/AptosConnector';
import { AptosWalletClient } from '../connectors/AptosWalletClient';
import { APTOS_COIN, AnyRawTransaction, SimpleTransaction } from '@aptos-labs/ts-sdk';
import { AptosSignAndSubmitTransactionInput, UserResponseStatus } from '@aptos-labs/wallet-standard';
import { ethers } from 'ethers';

export type AptosTransaction = SimpleTransaction | AptosSignAndSubmitTransactionInput | AnyRawTransaction;

export class AptosWallet extends Wallet<AptosTransaction, AptosChain, AptosConnector, AptosWalletClient> {
  constructor(_address: string, chain: AptosChain, connector: AptosConnector, walletClient: AptosWalletClient) {
    super(_address, chain, connector, walletClient);
  }

  async signMessage(message: string | Uint8Array): Promise<string> {
    try {
      if (typeof message === 'string') {
        const signedMessage = await this.walletClient.signMessage(message);
        return signedMessage;
      } else {
        throw new Error('Not implemented signMessage with raw');
      }
    } catch (error) {
      logger.error('error signing message', error);
      throw error;
    }
  }

  async signTransaction(transaction: AnyRawTransaction): Promise<string> {
    const signedTx = await this.walletClient.signTransaction(transaction);
    if (signedTx.status === UserResponseStatus.APPROVED) {
      return signedTx.args.toString();
    } else {
      throw new Error('User rejected the request');
    }
  }

  async sendTransaction(transaction: AptosSignAndSubmitTransactionInput): Promise<string> {
    const signedTx = await this.walletClient.signAndSubmitTransaction(transaction);
    if (signedTx?.status === UserResponseStatus.APPROVED) {
      return signedTx.args.hash;
    } else {
      throw new Error('User rejected the request');
    }
  }

  sendRawTransaction(transaction: string): Promise<string> {
    // return this.chain.provider.sendRawTransaction(Buffer.from(transaction, 'base64'));
    return new Promise(() => new Error('Not implemented'));
  }

  async signAllTransactions(transactions: AptosTransaction[]): Promise<string[]> {
    // const signedTransactions = await this.walletClient.signAllTransactions(transactions);
    // @ts-ignore
    // return signedTransactions.map((transaction) => Buffer.from(transaction.serialize()).toString('base64'));
    return new Promise(() => new Error('Not implemented'));
  }

  get address(): string {
    return this._address;
  }
  async getBalance() {
    try {
      const balance = await this.chain.provider.getCurrentFungibleAssetBalances({
        options: {
          where: {
            owner_address: {
              _eq: this._address,
            },
            asset_type: {
              _eq: APTOS_COIN,
            },
          },
        },
      });

      const nativeCurrency = this.chain.nativeCurrency;
      const uiAmount = ethers.formatUnits(balance[0]?.amount, nativeCurrency.decimals);

      return {
        amount: balance[0]?.amount?.toString(),
        uiAmount,
        decimals: nativeCurrency.decimals,
        symbol: nativeCurrency.symbol,
        name: nativeCurrency.name,
      };
    } catch (error) {
      logger.error('Failed to fetch balance:', { error });
      return {
        amount: '0',
        uiAmount: '0',
        decimals: this.chain.nativeCurrency.decimals,
        symbol: this.chain.nativeCurrency.symbol,
        name: this.chain.nativeCurrency.name,
      };
    }
  }
}
