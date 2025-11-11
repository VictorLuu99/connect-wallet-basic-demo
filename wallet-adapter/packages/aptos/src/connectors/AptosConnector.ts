import { Connector, logger } from '@phoenix-wallet/core';
import { AdapterWallet, WalletReadyState } from '@aptos-labs/wallet-adapter-core';
import { ConnectorConfig, DappMetadata } from '@phoenix-wallet/core';
import { ChainType, IChain } from '@phoenix-wallet/core';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { AptosWalletClient } from './AptosWalletClient';
function convertWalletNameToId(name: string) {
  return (name + '_aptos').toLowerCase().replace(' ', '_');
}

export { Network as AptosNetwork } from '@aptos-labs/ts-sdk';

export abstract class AptosConnector extends Connector {
  protected activeAddress: string | undefined = undefined;
  protected isInitialized: boolean = false;
  abstract get adapter(): AdapterWallet;
  cluster: Network;
  constructor(
    config: ConnectorConfig,
    dappMetadata: DappMetadata,
    defaultCluster: Network = Network.MAINNET,
    supportedChains: string[]
  ) {
    super(convertWalletNameToId(config.name), config.name, config.logo, dappMetadata, supportedChains);
    this.cluster = defaultCluster;
  }

  async init(): Promise<void> {
    if (!this.adapter) {
      throw new Error(this?.name + ' adapter not found');
    }

    if (this.isInitialized) {
      return;
    }

    this.isInitialized = true;

    this.setupEventListeners();
  }

  async isInstalled(): Promise<boolean> {
    await this.init();
    return this.adapter.readyState === WalletReadyState.Installed;
  }

  get chainType(): ChainType {
    return ChainType.APTOS;
  }

  async connect(): Promise<{ address: string; chainId: string }> {
    await this.init();
    logger.info('Connecting to Aptos');
    try {
      const data = await this.adapter.features['aptos:connect'].connect();
      const account = await this.adapter.features['aptos:account'].account();
      if (data.status === 'Approved') {
        this.activeAddress = account.address.toStringLong();
        this.handleEventConnect(this.activeAddress, this._chainId);

        if (typeof localStorage !== 'undefined') {
          if (this.storageConnectionStatusKey) {
            localStorage.setItem(this.storageConnectionStatusKey, 'connected');
          }
        }
      } else {
        if (this.activeAddress) {
          this.handleEventDisconnect(this.activeAddress);
          this.activeAddress = undefined;
          if (typeof localStorage !== 'undefined') {
            if (this.storageConnectionStatusKey) {
              localStorage.removeItem(this.storageConnectionStatusKey);
            }
          }
        }
        throw new Error('User rejected the request');
      }
    } catch (error) {
      logger.error('Error connecting to Aptos', { error });

      throw error;
    }

    return {
      address: this.activeAddress ?? '',
      chainId: this._chainId,
    };
  }

  async disconnect(): Promise<void> {
    await this.init();
    logger.info('Disconnecting from Aptos');

    // Store the current address before clearing it
    const currentAddress = this.activeAddress;

    // Clear the active address
    this.activeAddress = undefined;

    await this.adapter.features['aptos:disconnect'].disconnect();

    if (typeof localStorage !== 'undefined') {
      if (this.storageConnectionStatusKey) {
        localStorage.removeItem(this.storageConnectionStatusKey);
      }
    }

    // Emit disconnect event if we had an active address
    if (currentAddress) {
      this.handleEventDisconnect(currentAddress);
    }
  }

  async getConnectedAddresses(): Promise<string[]> {
    await this.init();
    try {
      const account = await this.adapter.features['aptos:account'].account();
      return [account.address.toStringLong()];
    } catch (error) {
      logger.error('Error getting connected addresses', error);
      return [];
    }
  }

  private get _chainId(): string {
    return 'aptos_' + this.cluster.toLowerCase().replace('-', '_');
  }

  async getChainId(): Promise<string> {
    return this._chainId;
  }

  abstract onDisconnect(): Promise<void>;

  async setupEventListeners(): Promise<void> {
    this.adapter.features['aptos:onNetworkChange'].onNetworkChange((network) => {
      logger.info('network', network);
      this.switchChainId(network.name);
    });

    this.adapter.features['aptos:onAccountChange'].onAccountChange(async (account) => {
      logger.info('New account changed', account);
      try {
        if (!account) {
          const account = await this.adapter.features['aptos:account'].account();
          this.activeAddress = account.address.toStringLong();
          this.handleEventConnect(this.activeAddress, this._chainId);
          return;
        }
        if (this.activeAddress != account.address.toStringLong()) {
          this.activeAddress = account.address.toStringLong();
          this.handleEventConnect(this.activeAddress, this._chainId);
          return;
        }
        this.handleEventAccountChanged([this.activeAddress]);
      } catch (error) {
        logger.error('Error connecting to Aptos', { error });
        if (this.activeAddress) {
          this.handleEventDisconnect(this.activeAddress);
          this.activeAddress = undefined;
          if (typeof localStorage !== 'undefined') {
            if (this.storageConnectionStatusKey) {
              localStorage.removeItem(this.storageConnectionStatusKey);
            }
          }
        }
        throw error;
      }
    });
    this.onDisconnect();
  }

  //This function should check if the wallet is connected to the chain, and when application is reloaded, it should check if the wallet is connected to the chain
  async isConnected(): Promise<boolean> {
    try {
      if (this.storageConnectionStatusKey) {
        const storedStatus = localStorage.getItem(this.storageConnectionStatusKey);
        if (!storedStatus) {
          return false;
        } else {
          return true;
        }
      }
      if (this.activeAddress) {
        return true;
      }
      return !!this.adapter?.accounts[0]?.address;
    } catch (error) {
      logger.error(`Error checking if ${this.id} is connected:`, error);
      return false;
    }
  }

  createWalletClient(chain: IChain<any>) {
    if (!this.adapter) {
      throw new Error('Aptos adapter not found');
    }
    return new AptosWalletClient(this.adapter);
  }

  createPublicClient(chain: IChain<any>) {
    return new Aptos(new AptosConfig({ network: this.cluster || Network.MAINNET }));
  }

  get installLink(): string {
    if (!this.adapter) {
      throw new Error('Aptos adapter not found');
    }
    return this.adapter.url;
  }

  async switchChainId(chainId: Network): Promise<void> {
    if (!Object.values(Network).includes(chainId)) {
      throw new Error('Invalid chainId');
    }

    this.cluster = chainId;
    this.handleEventChainChanged(this._chainId);
  }

  async addChain(chain: IChain<any>): Promise<void> {
    throw new Error('Method not supported for Aptos.');
  }

  protected get storageConnectionStatusKey(): string | null {
    return `phoenix_${this.id}_aptos_connection_status`;
  }
}
