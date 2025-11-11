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
export declare enum ChainType {
    EVM = "EVM",
    SOLANA = "SOLANA",
    SUI = "SUI",
    APTOS = "APTOS"
}
export declare abstract class Chain<T> implements IChain<T> {
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
    protected _chainType: ChainType;
    constructor(config: IChain<T>);
    get chainType(): ChainType;
    abstract get chainName(): string;
    abstract get provider(): T;
}
//# sourceMappingURL=Chain.d.ts.map