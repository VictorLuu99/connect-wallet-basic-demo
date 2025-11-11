import { Chain, ChainType, IChain } from '@phoenix-wallet/core';
import { SuiClient } from '@mysten/sui/client';

export class SuiChain extends Chain<SuiClient> {
  private _chainName: string;
  private _provider: SuiClient;

  constructor(chainName: string, config: IChain<SuiClient>) {
    super(config);
    this._chainName = chainName;
    if (!config.publicRpcUrl) {
      throw new Error(`RPC URL is required for ${chainName}`);
    }
    // Initialize official SuiClient
    this._provider = new SuiClient({
      url: config.publicRpcUrl,
    });
  }

  get chainName(): string {
    return this._chainName;
  }

  get chainType(): ChainType {
    return ChainType.SUI;
  }

  get provider(): SuiClient {
    return this._provider;
  }
}
