import { IConnector } from '../interfaces/IConnector';
import { IChainConfig } from '../interfaces/Chain';
import { ConnectorStatus } from '../types';
export interface WalletState<W = any> {
    connector: IConnector | null;
    status: ConnectorStatus;
    isConnected: boolean;
    isConnecting: boolean;
    isDisconnected: boolean;
    hasError: boolean;
    isInstalled: boolean | null;
    isWalletReady: boolean;
    address: string | null;
    chainId: string | null;
    connect: () => Promise<any>;
    disconnect: () => Promise<void>;
    switchChain: (chainId: string) => Promise<W>;
    wallet: W | null;
    getWallet: () => W | null;
}
export interface UseWalletCallbacks<W = any> {
    onConnect?: (cId: string, addr: string, wallet: W, chainConfig?: IChainConfig) => void;
    onDisconnect?: (cId: string) => void;
    onAccountChanged?: (cId: string, address: string, wallet: W) => void;
    onChainChanged?: (cId: string, wallet: W, chainConfig?: IChainConfig) => void;
}
/**
 * Base wallet hook - preserves all original logic from phoenix-wallet
 * @internal Use app-specific useWallet wrapper instead
 */
export declare function useWalletBase<W = any>(connectorId: string, createWallet: (connector: IConnector, address: string, chainId: string, chainConfigs: IChainConfig[]) => W | null, callbacks?: UseWalletCallbacks<W>): WalletState<W>;
//# sourceMappingURL=useWalletBase.d.ts.map