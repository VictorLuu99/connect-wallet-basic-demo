import { Connection } from '@solana/web3.js';
import { Contract } from '@phoenix-wallet/core';

export class SolanaContract<T> extends Contract {
  protected connection: Connection;
  protected sdk: T;
  constructor(connection: Connection, address: string, sdk: T) {
    super(address);
    this.connection = connection;
    this.sdk = sdk;
  }

  initialize(): Promise<void> {
    return Promise.resolve();
  }

  async waitTransaction(txHash: string, blockhash: string, lastValidBlockHeight: number): Promise<any> {
    return await this.connection.confirmTransaction({
      signature: txHash,
      blockhash,
      lastValidBlockHeight,
    });
  }
}
