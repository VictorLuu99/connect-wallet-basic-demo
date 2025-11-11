import { IWallet } from './IWallet';
export interface IContract {
    wallet: IWallet<any, any, any, any> | undefined;
    initialize(): Promise<void>;
    get address(): string;
}
export declare abstract class Contract implements IContract {
    protected _address: string;
    wallet: IWallet<any, any, any, any> | undefined;
    constructor(address: string);
    abstract initialize(): Promise<void>;
    get address(): string;
}
//# sourceMappingURL=IContract.d.ts.map