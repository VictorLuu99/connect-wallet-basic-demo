import { DappMetadata, logger } from '@phoenix-wallet/core';
import { Connector } from '@phoenix-wallet/core';
import { ChainType, IChain } from '@phoenix-wallet/core';
import { BaseMessageSignerWalletAdapter, BaseWalletAdapter, WalletReadyState } from '@solana/wallet-adapter-base';
import { SolanaWalletClient } from './SolanaWalletClient';
import { Connection } from '@solana/web3.js';

function convertWalletNameToId(name: string) {
  return (name + '_solana').toLowerCase().replace(' ', '_');
}

export enum SolanaCluster {
  MAINNET = 'mainnet-beta',
  DEVNET = 'devnet',
  TESTNET = 'testnet',
  LOCALNET = 'localnet',
}

export class SolanaConnector extends Connector {
  protected activeAddress: string | undefined = undefined;
  protected isInitialized: boolean = false;
  adapter: BaseWalletAdapter;
  cluster: SolanaCluster;
  constructor(
    dappMetadata: DappMetadata,
    adapter: BaseWalletAdapter,
    defaultCluster: SolanaCluster = SolanaCluster.MAINNET,
    supportedChains: string[]
  ) {
    super(convertWalletNameToId(adapter.name), adapter.name, adapter.icon, dappMetadata, supportedChains);
    this.adapter = adapter;
    this.cluster = defaultCluster;
  }

  async init(): Promise<void> {
    if (!this.adapter) {
      throw new Error(this.name + ' adapter not found');
    }

    if (this.isInitialized) {
      return;
    }

    this.isInitialized = true;

    this.setupEventListeners();

    // Check if we have a stored connection
    this.checkStoredConnection();
  }

  async isInstalled(): Promise<boolean> {
    await this.init();
    logger.debug('Checking if Solana is installed', this.adapter.readyState);
    return this.adapter.readyState == WalletReadyState.Installed;
  }

  get chainType(): ChainType {
    return ChainType.SOLANA;
  }

  async connect(): Promise<{ address: string; chainId: string }> {
    await this.init();
    logger.info('Connecting to Solana');
    try {
      await this.adapter.connect();
    } catch (error) {
      await this.disconnect();
      throw error;
    }

    //check wallet standard 
    if (('wallet' in this.adapter)) {
      try {
        //Setup to devnet for metamask
        if ((this.adapter as any).wallet.name === 'MetaMask' && 'updateSession' in (this.adapter as any).wallet) {
          const wallet = this.adapter.wallet;
          if (this.cluster === SolanaCluster.DEVNET) {
            const session = await (wallet as any).client.getSession();
            //remove mainnet config in metamask when use devnet
            delete session.sessionScopes['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'];
            await (wallet as any).updateSession(session);
          }
        }
      } catch (error) {
        logger.error('Error setting up metamask wallet standard for solana', error);
      }
    }

    this.activeAddress = this.adapter.publicKey?.toBase58() ?? '';

    // Store connection status in localStorage
    if (typeof localStorage !== 'undefined') {
      if (this.storageConnectionStatusKey) {
        localStorage.setItem(this.storageConnectionStatusKey, 'connected');
      }
      if (this.storageAddressKey && this.activeAddress) {
        localStorage.setItem(this.storageAddressKey, this.activeAddress);
      }
    }

    return {
      address: this.activeAddress ?? '',
      chainId: this._chainId,
    };
  }

  async disconnect(): Promise<void> {
    await this.init();

    // Store the current address before clearing it
    const currentAddress = this.activeAddress;

    // Clear the active address
    this.activeAddress = undefined;

    // Remove stored connection info
    if (typeof localStorage !== 'undefined') {
      if (this.storageConnectionStatusKey) {
        localStorage.removeItem(this.storageConnectionStatusKey);
      }
      if (this.storageAddressKey) {
        localStorage.removeItem(this.storageAddressKey);
      }
    }

    await this.adapter.disconnect();

    // Emit disconnect event if we had an active address
    if (currentAddress) {
      this.handleEventDisconnect(currentAddress);
    }
  }

  async getConnectedAddresses(): Promise<string[]> {
    await this.init();
    return [this.adapter.publicKey?.toBase58() ?? ''];
  }

  private get _chainId(): string {
    return 'solana_' + this.cluster.toLowerCase().replace('-', '_');
  }

  async getChainId(): Promise<string> {
    return this._chainId;
  }

  async setupEventListeners(): Promise<void> {
    if (!(await this.isInstalled())) return;

    this.adapter.on('connect', () => {
      logger.info('Solana connector connect event', this.adapter.publicKey?.toBase58());
      if (this.activeAddress != this.adapter.publicKey?.toBase58() && this.adapter.publicKey?.toBase58()) {
        this.activeAddress = this.adapter.publicKey?.toBase58();
        this.handleEventConnect(this.activeAddress ?? '', this._chainId);
      }
    });

    this.adapter.on('disconnect', () => {
      if (this.activeAddress) {
        this.handleEventDisconnect(this.activeAddress);
        this.activeAddress = undefined;
      }
      if (typeof localStorage !== 'undefined') {
        if (this.storageConnectionStatusKey) {
          localStorage.removeItem(this.storageConnectionStatusKey);
        }
        if (this.storageAddressKey) {
          localStorage.removeItem(this.storageAddressKey);
        }
      }
    });
  }

  //This function should check if the wallet is connected to the chain, and when application is reloaded, it should check if the wallet is connected to the chain
  async isConnected(): Promise<boolean> {
    try {
      await this.init();

      if (this.storageConnectionStatusKey) {
        const storedStatus = localStorage.getItem(this.storageConnectionStatusKey);
        if (!storedStatus) {
          return false;
        }
      }

      if (this.activeAddress) {
        return true;
      }

      return !!this.adapter.publicKey;
    } catch (error) {
      logger.error(`Error checking if ${this.id} is connected:`, error);
      return false;
    }
  }

  createWalletClient(chain: IChain<any>) {
    if (!this.adapter) {
      throw new Error('Solana adapter not found');
    }
    //check adapter has signTransaction method
    if (!('signTransaction' in this.adapter)) {
      throw new Error('Solana adapter does not have signTransaction method');
    }
    //check adapter has signAllTransactions method
    if (!('signAllTransactions' in this.adapter)) {
      throw new Error('Solana adapter does not have signAllTransactions method');
    }
    //check adapter has signMessage method
    if (!('signMessage' in this.adapter)) {
      throw new Error('Solana adapter does not have signMessage method');
    }
    //check adapter has sendTransaction method
    if (!('sendTransaction' in this.adapter)) {
      throw new Error('Solana adapter does not have sendTransaction method');
    }
    return new SolanaWalletClient(this.adapter as BaseMessageSignerWalletAdapter);
  }

  createPublicClient(chain: IChain<any>) {
    return new Connection(chain.publicRpcUrl);
  }

  get installLink(): string {
    if (!this.adapter) {
      throw new Error('Solana adapter not found');
    }
    return this.adapter.url;
  }

  async switchChainId(chainId: SolanaCluster): Promise<void> {
    if (!Object.values(SolanaCluster).includes(chainId)) {
      throw new Error('Invalid chainId');
    }

    this.cluster = chainId;
    this.handleEventChainChanged(chainId);
  }

  async addChain(chain: IChain<any>): Promise<void> {
    throw new Error('Method not supported for Solana.');
  }

  protected get storageConnectionStatusKey(): string | null {
    return `phoenix_${this.id}_solana_connection_status`;
  }

  protected get storageAddressKey(): string | null {
    return `phoenix_${this.id}_solana_address`;
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

