import {
  Wallet,
  WalletAccount,
  SuiSignTransactionFeature,
  SuiChain,
  SignedTransaction,
  SuiSignAndExecuteTransactionFeature,
  SuiSignAndExecuteTransactionOutput,
  SuiSignPersonalMessageFeature,
  SuiSignPersonalMessageOutput,
  IdentifierArray,
  SuiSignPersonalMessageInput,
  SuiSignTransactionInput,
  SuiSignAndExecuteTransactionInput,
} from '@mysten/wallet-standard';

export class SuiWalletClientStandard {
  private _provider: Wallet;

  constructor(suiProvider: Wallet) {
    this._provider = suiProvider;
  }

  signTransaction(data: SuiSignTransactionInput): Promise<SignedTransaction> {
    return (this._provider.features as SuiSignTransactionFeature)['sui:signTransaction'].signTransaction(data);
  }

  signAndExecuteTransaction(data: SuiSignAndExecuteTransactionInput): Promise<SuiSignAndExecuteTransactionOutput> {
    return (this._provider.features as SuiSignAndExecuteTransactionFeature)[
      'sui:signAndExecuteTransaction'
    ].signAndExecuteTransaction(data);
  }

  signMessage(data: SuiSignPersonalMessageInput): Promise<SuiSignPersonalMessageOutput> {
    return (this._provider.features as SuiSignPersonalMessageFeature)['sui:signPersonalMessage'].signPersonalMessage({
      message: data.message,
      account: data.account,
    });
  }

  // Get accounts from provider
  getAccounts(): WalletAccount[] {
    return Array.from(this._provider.accounts);
  }

  // Get current chain
  getChain(): IdentifierArray {
    return this._provider.chains;
  }

  // Request account connection
  // requestAccount() {
  //   return this._provider.requestAccount();
  // }

  // // Disconnect from wallet
  // disconnect(): Promise<void> {
  //   return this._provider.disconnect();
  // }
}
