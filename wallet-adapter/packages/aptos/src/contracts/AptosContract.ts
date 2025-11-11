import { Aptos } from '@aptos-labs/ts-sdk';
import { Contract } from '@phoenix-wallet/core';

export class AptosContract<T> extends Contract {
  protected aptosClient: Aptos;
  protected sdk: T;

  constructor(aptosClient: Aptos, address: string, sdk: T) {
    super(address);
    this.aptosClient = aptosClient;
    this.sdk = sdk;
  }

  initialize(): Promise<void> {
    return Promise.resolve();
  }

  async waitTransaction(txHash: string): Promise<any> {
    return await this.aptosClient.waitForTransaction({
      transactionHash: txHash,
    });
  }
}
