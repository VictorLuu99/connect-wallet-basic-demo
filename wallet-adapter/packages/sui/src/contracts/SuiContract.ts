import { SuiClient } from '@mysten/sui/client';
import { Contract } from '@phoenix-wallet/core';

export class SuiContract<T> extends Contract {
  protected suiClient: SuiClient;
  protected sdk: T;

  constructor(suiClient: SuiClient, address: string, sdk: T) {
    super(address);
    this.suiClient = suiClient;
    this.sdk = sdk;
  }

  initialize(): Promise<void> {
    return Promise.resolve();
  }

  async waitTransaction(txHash: string): Promise<any> {
    return await this.suiClient.waitForTransaction({
      digest: txHash,
    });
  }
}
