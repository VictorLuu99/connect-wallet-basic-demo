export interface IChainConfig {
  id: string;
  name: string;
  publicRpcUrl: string;
  privateRpcUrl: string;
  explorerUrl: string;
  chainId: number;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  chainType: ChainType;
}

export interface IChain<T> extends IChainConfig {
  get chainName(): string;
  get chainType(): ChainType;
  get provider(): T;
}

export enum ChainType {
  EVM = 'EVM',
  SOLANA = 'SOLANA',
  SUI = 'SUI',
  APTOS = 'APTOS',
}

export abstract class Chain<T> implements IChain<T> {
  id: string;
  name: string;
  publicRpcUrl: string;
  privateRpcUrl: string;
  explorerUrl: string;
  chainId: number;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  protected _chainType: ChainType;

  constructor(config: IChain<T>) {
    this.id = config.id;
    this.name = config.name;
    this.publicRpcUrl = config.publicRpcUrl;
    this.privateRpcUrl = config.privateRpcUrl;
    this.explorerUrl = config.explorerUrl;
    this.chainId = config.chainId;
    this.nativeCurrency = config.nativeCurrency;
    this._chainType = config.chainType;
  }

  get chainType(): ChainType {
    return this._chainType;
  }

  abstract get chainName(): string;
  abstract get provider(): T;
}

