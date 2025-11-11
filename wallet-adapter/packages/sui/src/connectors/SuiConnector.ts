import { SuiClient } from '@mysten/sui/client';
import { ChainType, IChain, logger } from '@phoenix-wallet/core';
import { SuiChain } from '../chains/SuiChain';
import {
  SuiConnectResult,
  SuiSignAndExecuteTransactionBlockInput,
  SuiSignedMessage,
  SuiSignedTransaction,
  SuiSignTransactionBlockInput,
  SuiTransactionResponse,
  SuiWalletEventType,
} from '../types/sui';
import { Connector } from '@phoenix-wallet/core';
import { ConnectorConfig, DappMetadata } from '@phoenix-wallet/core';
import { SuiCluster } from './PhantomSuiConnector';
import { SuiWalletClient } from './SuiWalletClient';

// Sui Provider Interface - Standard Sui Wallet Interface
export interface SuiProvider {
  // Standard connection methods
  requestAccount(): Promise<SuiConnectResult>;
  disconnect(): Promise<void>;
  getAccounts(): Promise<string[]>;

  // Network methods
  getChain(): Promise<string>;

  // Transaction methods
  signAndExecuteTransaction(input: SuiSignAndExecuteTransactionBlockInput): Promise<SuiTransactionResponse>;
  signTransaction(input: SuiSignTransactionBlockInput): Promise<SuiSignedTransaction>;
  signMessage(message: Uint8Array<ArrayBufferLike>, account?: string): Promise<SuiSignedMessage>;

  // Event methods
  on(event: SuiWalletEventType, callback: (...args: unknown[]) => void): void;
  off(event: SuiWalletEventType, callback: (...args: unknown[]) => void): void;

  // Wallet info
  name?: string;
  icon?: string;
}

export abstract class SuiConnector extends Connector {
  protected activeAddress: string | undefined = undefined;
  protected provider: SuiProvider | null = null;
  protected isInitialized: boolean = false;
  cluster: SuiCluster;
  // abstract get provider(): SuiProvider;

  constructor(
    id: string,
    config: ConnectorConfig,
    dappMetadata: DappMetadata,
    cluster: SuiCluster,
    supportedChains: string[]
  ) {
    super(id, config.name, config.logo, dappMetadata, supportedChains);
    this.cluster = cluster;
  }

  async init(): Promise<void> {
    if (!this.provider) {
      throw new Error(this.name + ' provider not found');
    }

    if (this.isInitialized) {
      return;
    }

    this.isInitialized = true;

    this.setupEventListeners();

    // Check if we have a stored connection
    this.checkStoredConnection();
  }

  get chainType(): ChainType {
    return ChainType.SUI;
  }

  private get _chainId(): string {
    return 'sui_' + this.cluster.toLowerCase().replace('-', '_');
  }

  async getChainId(): Promise<string> {
    return this._chainId;
  }
  // Handle account change events (similar to EvmConnector pattern)
  async handleEventAccountChanged(addresses: string[]): Promise<void> {
    if (addresses.length === 0) {
      // No accounts connected - handle disconnect
      if (this.activeAddress) {
        this.handleEventDisconnect(this.activeAddress);
        this.activeAddress = undefined;
      }
    } else {
      // Account connected or changed
      if (this.activeAddress !== addresses[0]) {
        this.activeAddress = addresses[0];
        this.handleEventConnect(this.activeAddress, this._chainId);
      }
    }
    super.handleEventAccountChanged(addresses);
  }

  // Handle chain/network change events
  async switchChainId(chainId: SuiCluster): Promise<void> {
    this.cluster = chainId;
    this.handleEventChainChanged(chainId);
  }

  createPublicClient(chain: IChain<any>) {
    return new SuiClient({ url: chain.publicRpcUrl });
  }

  // Create wallet client for Sui operations (similar to EvmConnector.createWalletClient)
  createWalletClient(chain: SuiChain): SuiWalletClient {
    if (!this.provider) {
      throw new Error('Sui provider not available');
    }

    return new SuiWalletClient(this.provider);
  }

  // Abstract methods that must be implemented by concrete connectors
  abstract connect(): Promise<{ address: string; chainId: string }>;
  abstract disconnect(): Promise<void>;
  abstract getConnectedAddresses(): Promise<string[]>;
  abstract setupEventListeners(): Promise<void>;
  abstract isInstalled(): Promise<boolean>;

  storageConnect(address: string): void {
    this.activeAddress = address;

    // Store connection status in localStorage
    if (typeof localStorage !== 'undefined') {
      if (this.storageConnectionStatusKey) {
        localStorage.setItem(this.storageConnectionStatusKey, 'connected');
      }
      if (this.storageAddressKey && this.activeAddress) {
        localStorage.setItem(this.storageAddressKey, this.activeAddress);
      }
    }
  }

  disconnectStorage(): void {
    if (typeof localStorage !== 'undefined') {
      if (this.storageConnectionStatusKey) {
        localStorage.removeItem(this.storageConnectionStatusKey);
      }
      if (this.storageAddressKey) {
        localStorage.removeItem(this.storageAddressKey);
      }
    }
  }

  // Get current provider (public getter for wallet access)
  getProvider(): SuiProvider | null {
    return this.provider;
  }

  // Get active account address
  protected getActiveAddress(): string | undefined {
    return this.activeAddress;
  }

  //This function should check if the wallet is connected to the chain, and when application is reloaded, it should check if the wallet is connected to the chain
  async isConnected(): Promise<boolean> {
    try {
      if (this.storageConnectionStatusKey) {
        const storedStatus = localStorage.getItem(this.storageConnectionStatusKey);
        if (!storedStatus) {
          return false;
        }
      }

      if (this.activeAddress) {
        return true;
      }
      return !!this.provider;
    } catch (error) {
      logger.error(`Error checking if ${this.id} is connected:`, error);
      return false;
    }
  }

  protected get storageConnectionStatusKey(): string | null {
    return `phoenix_${this.id}_sui_connection_status`;
  }

  protected get storageAddressKey(): string | null {
    return `phoenix_${this.id}_sui_address`;
  }

  protected checkStoredConnection(): void {
    if (typeof localStorage !== 'undefined' && this.storageConnectionStatusKey) {
      const storedStatus = localStorage.getItem(this.storageConnectionStatusKey);
      if (storedStatus === 'connected') {
        // Check if we have a stored address
        if (this.storageAddressKey) {
          const storedAddress = localStorage.getItem(this.storageAddressKey);
          if (storedAddress) {
            this.activeAddress = storedAddress;
            this.handleEventConnect(this.activeAddress, this._chainId);
          } else {
            localStorage.removeItem(this.storageConnectionStatusKey);
          }
        }
      }
    }
  }
}
