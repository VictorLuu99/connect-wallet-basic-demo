type ConnectHandler = (connectorId: string, address: string, chainId?: string) => void | Promise<void>;
type DisconnectHandler = (connectorId: string, address: string) => void | Promise<void>;
type ChainChangedHandler = (connectorId: string, chainId: string) => void | Promise<void>;
type AccountChangedHandler = (connectorId: string, addresses: string[]) => void | Promise<void>;
interface WalletConnectorEventProps {
    onConnect?: ConnectHandler;
    onDisconnect?: DisconnectHandler;
    onChainChanged?: ChainChangedHandler;
    onAccountChanged?: AccountChangedHandler;
}
/**
 * Hook to handle wallet connector events
 *
 * @param props Event handlers for wallet connector events
 */
export declare function useWalletConnectorEvent({ onConnect, onDisconnect, onChainChanged, onAccountChanged, }: WalletConnectorEventProps): void;
export {};
//# sourceMappingURL=useWalletConnectorEvent.d.ts.map