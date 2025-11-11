import { ChainType, IChain } from './Chain';
import { CallbackManager } from '../utils/CallbackManager';
import { DappMetadata } from '../types';

export interface IConnector {
  id: string;
  name: string;
  logo: string;
  dappMetadata: DappMetadata;
  connect(): Promise<{ address: string; chainId: string }>;
  disconnect(): Promise<void>;
  getConnectedAddresses(): Promise<string[]>;
  getChainId(): Promise<string>;
  handleEventConnect(address: string, chainId: string): Promise<void>;
  handleEventDisconnect(address: string): Promise<void>;
  handleEventChainChanged(chainId: string): Promise<void>;
  handleEventAccountChanged(address: string[]): Promise<void>;
  registerConnectorCallback(callback: IConnectorCallback): void;
  unregisterConnectorCallback(callback: IConnectorCallback): void;
  createWalletClient(chain: IChain<any>): any;
  createPublicClient(chain: IChain<any>): any;
  isInstalled(): Promise<boolean>;
  isConnected(): Promise<boolean>;
  get chainType(): ChainType;
  get installLink(): string;
  switchChainId(chainId: string): Promise<void>;
  addChain(chain: IChain<any>): Promise<void>;
  isSupportChain(chainId: string): boolean;
}

export abstract class Connector implements IConnector {
  id: string;
  name: string;
  logo: string;
  supportedChains: string[];
  dappMetadata: DappMetadata;
  protected callbackManager: CallbackManager;

  constructor(id: string, name: string, logo: string, dappMetadata: DappMetadata, supportedChains: string[]) {
    this.id = id;
    this.name = name;
    this.logo = logo;
    this.dappMetadata = dappMetadata;
    this.supportedChains = supportedChains;
    this.callbackManager = new CallbackManager(id);
  }

  abstract getChainId(): Promise<string>;
  abstract connect(): Promise<{ address: string; chainId: string }>;
  abstract disconnect(): Promise<void>;
  abstract getConnectedAddresses(): Promise<string[]>;
  abstract get chainType(): ChainType;
  abstract get installLink(): string;
  abstract setupEventListeners(): Promise<void>;
  abstract isInstalled(): Promise<boolean>;
  abstract isConnected(): Promise<boolean>;
  abstract createWalletClient(chain: IChain<any>): any;
  abstract createPublicClient(chain: IChain<any>): any;
  abstract switchChainId(chainId: string): Promise<void>;
  abstract addChain(chain: IChain<any>): Promise<void>;

  isSupportChain(chainId: string): boolean {
    return this.supportedChains.includes(chainId);
  }

  async handleEventConnect(address: string, chainId?: string): Promise<void> {
    this.callbackManager.notifyConnect(address, chainId);
  }

  async handleEventDisconnect(address: string): Promise<void> {
    this.callbackManager.notifyDisconnect(address);
  }

  async handleEventChainChanged(chainId: string): Promise<void> {
    const formattedChainId = chainId?.toString()?.startsWith('0x') ? parseInt(chainId, 16).toString() : chainId;
    this.callbackManager.notifyChainChanged(formattedChainId);
  }

  async handleEventAccountChanged(addresses: string[]): Promise<void> {
    this.callbackManager.notifyAccountChanged(addresses);
  }

  registerConnectorCallback(callback: IConnectorCallback): void {
    this.callbackManager.registerConnectorCallback(callback);
  }

  unregisterConnectorCallback(callback: IConnectorCallback): void {
    this.callbackManager.unregisterConnectorCallback(callback);
  }
}

export interface IConnectorCallback {
  onConnect(connectorId: string, address: string, chainId?: string): Promise<void>;
  onDisconnect(connectorId: string, address: string): Promise<void>;
  onChainChanged(connectorId: string, chainId: string): Promise<void>;
  onAccountChanged(connectorId: string, address: string[]): Promise<void>;
}

