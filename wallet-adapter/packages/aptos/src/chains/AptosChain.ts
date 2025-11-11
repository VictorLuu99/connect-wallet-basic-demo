import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { Chain, ChainType, IChain } from '@phoenix-wallet/core';

export class AptosChain extends Chain<Aptos> {
  private _chainName: string;
  private _provider: Aptos;

  constructor(chainName: string, config: IChain<Aptos>) {
    super(config);
    this._chainName = chainName;
    if (!config.privateRpcUrl) {
      throw new Error(`RPC URL is required for ${chainName}`);
    }
    this._provider = new Aptos(new AptosConfig({ fullnode: config.privateRpcUrl, network: this.getNetwork() }));
  }

  get chainName(): string {
    return this._chainName;
  }

  get chainType(): ChainType {
    return ChainType.APTOS;
  }

  get provider(): Aptos {
    return this._provider;
  }

  private getNetwork(): Network {
    if (this.id.includes('mainnet')) return Network.MAINNET;
    if (this.id.includes('testnet')) return Network.TESTNET;
    if (this.id.includes('devnet')) return Network.DEVNET;
    return Network.MAINNET;
  }
}
