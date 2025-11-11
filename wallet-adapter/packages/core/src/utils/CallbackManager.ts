import { IConnectorCallback } from '../interfaces/IConnector';

export class CallbackManager {
  private connectorCallbacks: IConnectorCallback[] = [];
  private connectorId: string;

  constructor(connectorId: string) {
    this.connectorId = connectorId;
  }

  registerConnectorCallback(callback: IConnectorCallback): void {
    this.connectorCallbacks.push(callback);
  }

  unregisterConnectorCallback(callback: IConnectorCallback): void {
    this.connectorCallbacks = this.connectorCallbacks.filter((cb) => cb !== callback);
  }

  public notifyConnect(address: string, chainId?: string): void {
    this.connectorCallbacks.forEach((callback) => callback.onConnect(this.connectorId, address, chainId));
  }

  public notifyDisconnect(address: string): void {
    this.connectorCallbacks.forEach((callback) => callback.onDisconnect(this.connectorId, address));
  }

  public notifyChainChanged(chainId: string): void {
    this.connectorCallbacks.forEach((callback) => callback.onChainChanged(this.connectorId, chainId));
  }

  public notifyAccountChanged(address: string[]): void {
    this.connectorCallbacks.forEach((callback) => callback.onAccountChanged(this.connectorId, address));
  }
}

