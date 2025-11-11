import { AccountAuthenticator, AdapterWallet, AnyRawTransaction } from '@aptos-labs/wallet-adapter-core';
import {
  AptosSignAndSubmitTransactionInput,
  AptosSignAndSubmitTransactionOutput,
  UserResponse,
  UserResponseStatus,
} from '@aptos-labs/wallet-standard';
export class AptosWalletClient {
  private _adapter: AdapterWallet;
  constructor(adapter: AdapterWallet) {
    this._adapter = adapter;
  }

  signAndSubmitTransaction = async (
    transaction: AptosSignAndSubmitTransactionInput
  ): Promise<UserResponse<AptosSignAndSubmitTransactionOutput> | undefined> => {
    if (!this._adapter) {
      throw new Error('WalletCore is not initialized');
    }
    return await this._adapter.features['aptos:signAndSubmitTransaction']?.signAndSubmitTransaction(transaction);
  };

  signTransaction = async (transactionOrPayload: AnyRawTransaction): Promise<UserResponse<AccountAuthenticator>> => {
    if (!this._adapter) {
      throw new Error('WalletCore is not initialized');
    }
    return await this._adapter.features['aptos:signTransaction'].signTransaction(transactionOrPayload);
  };

  signMessage = async (message: string): Promise<string> => {
    if (!this._adapter) {
      throw new Error('WalletCore is not initialized');
    }
    const signedMessage = await this._adapter.features['aptos:signMessage'].signMessage({
      address: true,
      application: true,
      chainId: true,
      message,
      nonce: (Math.floor(Math.random() * 100) + 1).toString(),
    });
    if (signedMessage.status === UserResponseStatus.APPROVED) {
      return signedMessage.args.signature.toString();
    } else {
      throw new Error('User rejected the request');
    }
  };
}
