import { Connector, logger } from '@phoenix-wallet/core';
import { SuiClient } from '@mysten/sui/client';

import { DappMetadata } from '@phoenix-wallet/core';
import { ChainType, IChain } from '@phoenix-wallet/core';
import {
  SUI_DEVNET_CHAIN,
  Wallet,
  SuiChain,
  StandardConnectFeature,
  StandardEventsFeature,
  StandardDisconnectFeature,
  SUI_CHAINS,
} from '@mysten/wallet-standard';
import { SuiWalletClientStandard } from './SuiWalletClientStandard';
function convertWalletNameToId(name: string) {
  return (name + '_sui').toLowerCase().replace(' ', '_');
}

// export { Network as SuiNetwork } from '@mysten/sui/client';

export class SuiStandardConnnector extends Connector {
  protected activeAddress: string | undefined = undefined;
  protected isInitialized: boolean = false;
  adapter: Wallet;
  cluster: SuiChain;
  constructor(
    dappMetadata: DappMetadata,
    adapter: Wallet,
    defaultCluster: SuiChain = SUI_DEVNET_CHAIN,
    supportedChains: string[]
  ) {
    super(convertWalletNameToId(adapter.name), adapter.name, adapter.icon, dappMetadata, supportedChains);
    this.adapter = adapter;
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

    return true;
  }

  get chainType(): ChainType {
    return ChainType.SUI;
  }

  async connect(): Promise<{ address: string; chainId: string }> {
    await this.init();
    logger.info('Connecting to Sui');
    try {
      const connectFeature = this.adapter.features as StandardConnectFeature;
      const { accounts } = await connectFeature['standard:connect'].connect();

      this.activeAddress = accounts[0].address;
      this.handleEventConnect(this.activeAddress ?? '', this._chainId);

      if (typeof localStorage !== 'undefined' && this.storageConnectionStatusKey) {
        localStorage.setItem(this.storageConnectionStatusKey, 'connected');
      }

      return {
        address: this.activeAddress ?? '',
        chainId: this._chainId,
      };
    } catch (error) {
      this.activeAddress = undefined;
      this.handleEventDisconnect(this.activeAddress ?? '');
      if (typeof localStorage !== 'undefined') {
        if (this.storageConnectionStatusKey) {
          localStorage.removeItem(this.storageConnectionStatusKey);
        }
      }

      logger.error('Error connecting to Sui', { error });

      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.init();
    logger.info('Disconnecting from Sui');

    // Store the current address before clearing it
    const currentAddress = this.activeAddress;

    // Clear the active address
    this.activeAddress = undefined;

    // await this.adapter.features['aptos:disconnect'].disconnect();

    if (typeof localStorage !== 'undefined') {
      if (this.storageConnectionStatusKey) {
        localStorage.removeItem(this.storageConnectionStatusKey);
      }
    }

    await (this.adapter.features as StandardDisconnectFeature)['standard:disconnect'].disconnect();

    // Emit disconnect event if we had an active address
    if (currentAddress) {
      this.handleEventDisconnect(currentAddress);
    }
  }

  async getConnectedAddresses(): Promise<string[]> {
    await this.init();
    try {
      //   const account = await this.adapter.features['aptos:account'].account();
      return this.adapter.accounts.map((account) => account.address);
    } catch (error) {
      logger.error('Error getting connected addresses', error);
      return [];
    }
  }

  private get _chainId(): string {
    return this.cluster;
  }

  async getChainId(): Promise<string> {
    return this._chainId;
  }

  async setupEventListeners(): Promise<void> {
    (this.adapter.features as StandardEventsFeature)['standard:events'].on(
      'change',
      ({ accounts, chains, features }) => {
        if (accounts && accounts[0]?.chains[0] !== this._chainId) {
          this.switchChainId(accounts[0]?.chains[0] as SuiChain);
        }

        if (chains && chains[0] !== this._chainId) {
          this.switchChainId(chains[0] as SuiChain);
        }
      }
    );

    if (this.adapter.name === 'Phantom') {
      (window.phantom as any)?.sui?.on('disconnect', (account: string) => {
        if (this.activeAddress) {
          this.handleEventDisconnect(this.activeAddress);
          this.activeAddress = undefined;
        }
        if (typeof localStorage !== 'undefined') {
          if (this.storageConnectionStatusKey) {
            localStorage.removeItem(this.storageConnectionStatusKey);
          }
        }
      });
    }
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
      throw new Error('Sui provider not available');
    }

    return new SuiWalletClientStandard(this.adapter);
  }

  createPublicClient(chain: IChain<any>) {
    return new SuiClient({ url: chain.publicRpcUrl });
  }

  get installLink(): string {
    if (!this.adapter) {
      throw new Error('Sui adapter not found');
    }
    return '';
  }

  async switchChainId(chainId: SuiChain): Promise<void> {
    if (!SUI_CHAINS.includes(chainId)) {
      throw new Error('Invalid chainId');
    }

    this.cluster = chainId;
    this.handleEventChainChanged(chainId);
  }

  async addChain(chain: IChain<any>): Promise<void> {
    throw new Error('Method not supported for Sui.');
  }

  protected get storageConnectionStatusKey(): string | null {
    return `phoenix_${this.id}_sui_connection_status`;
  }
}
