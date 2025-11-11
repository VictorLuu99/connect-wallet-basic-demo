import { Connection } from '@solana/web3.js';
import { Chain, ChainType, IChain } from '@phoenix-wallet/core';

export class SolanaChain extends Chain<Connection> {
  private _chainName: string;
  private _provider: Connection;

  constructor(chainName: string, config: IChain<Connection>) {
    super(config);
    this._chainName = chainName;
    this._provider = new Connection(config.privateRpcUrl);
  }

  get chainName(): string {
    return this._chainName;
  }

  get chainType(): ChainType {
    return ChainType.SOLANA;
  }

  get provider(): Connection {
    return this._provider;
  }
}
