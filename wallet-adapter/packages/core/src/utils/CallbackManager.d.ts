import { IConnectorCallback } from '../interfaces/IConnector';
export declare class CallbackManager {
    private connectorCallbacks;
    private connectorId;
    constructor(connectorId: string);
    registerConnectorCallback(callback: IConnectorCallback): void;
    unregisterConnectorCallback(callback: IConnectorCallback): void;
    notifyConnect(address: string, chainId?: string): void;
    notifyDisconnect(address: string): void;
    notifyChainChanged(chainId: string): void;
    notifyAccountChanged(address: string[]): void;
}
//# sourceMappingURL=CallbackManager.d.ts.map