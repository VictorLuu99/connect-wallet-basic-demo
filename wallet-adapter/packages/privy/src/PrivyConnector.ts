import { ChainType, IChain, Connector, DappMetadata, logger } from '@phoenix-wallet/core';
import { PrivyContext } from './PrivyContext';

export interface PrivyConnectorConfig {
  id: string;
  name: string;
  logo: string;
  dappMetadata: DappMetadata;
}

export class PrivyConnector extends Connector {
  private privyContext: PrivyContext | null = null;
  private activeAddress: string | null = null;
  private isInitialized: boolean = false;

  constructor(config: PrivyConnectorConfig, supportedChains: string[]) {
    super(config.id, config.name, config.logo, config.dappMetadata, supportedChains);
  }

  // Initialize Privy context - will be set by PrivyContext hook
  setPrivyContext(context: PrivyContext) {
    this.privyContext = context;
    this.isInitialized = true;

    // Set up event listeners when context is available
    this.setupEventListeners();
  }

  get chainType(): ChainType {
    // Privy supports multiple chains, default to EVM
    return ChainType.EVM;
  }

  get installLink(): string {
    // Privy doesn't require installation
    return '';
  }

  async setupEventListeners(): Promise<void> {
    if (!this.privyContext) return;

    // Listen to Privy authentication events
    // Note: Privy handles this through React hooks, so we'll manage this differently
    // The actual event handling will be done in the PrivyContext wrapper
  }

  async connect(): Promise<{ address: string; chainId: string }> {
    if (!this.privyContext) {
      throw new Error('Privy context not initialized. Make sure to use PhoenixPrivyProvider.');
    }

    try {
      // Use Privy's login method
      await this.privyContext.login();

      // Wait for authentication
      if (!this.privyContext.user || !this.privyContext.authenticated) {
        throw new Error('Failed to authenticate with Privy');
      }

      // Get the wallet address
      const wallet = this.privyContext.user.wallet;
      if (!wallet?.address) {
        throw new Error('No wallet found after Privy authentication');
      }

      this.activeAddress = wallet.address;

      // Get current chain ID (default to mainnet if not available)
      const chainId = wallet.chainId?.toString() || '1';

      // Notify connection - activeAddress is guaranteed to be non-null here
      if (this.activeAddress) {
        await this.handleEventConnect(this.activeAddress, chainId);
      }

      return {
        address: this.activeAddress,
        chainId,
      };
    } catch (error) {
      logger.error('Failed to connect with Privy:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.privyContext) {
      throw new Error('Privy context not initialized');
    }

    try {
      await this.privyContext.logout();

      if (this.activeAddress) {
        await this.handleEventDisconnect(this.activeAddress);
        this.activeAddress = null;
      }
    } catch (error) {
      logger.error('Failed to disconnect from Privy:', error);
      throw error;
    }
  }

  async getConnectedAddresses(): Promise<string[]> {
    if (!this.privyContext?.user?.wallet?.address) {
      return [];
    }
    return [this.privyContext.user.wallet.address];
  }

  async getChainId(): Promise<string> {
    if (!this.privyContext?.user?.wallet) {
      throw new Error('No wallet connected');
    }

    return this.privyContext.user.wallet.chainId?.toString() || '1';
  }

  async isInstalled(): Promise<boolean> {
    // Privy is web-based, no installation required
    return true;
  }

  async isConnected(): Promise<boolean> {
    return this.privyContext?.authenticated || false;
  }

  createWalletClient(_chain: IChain<unknown>): unknown {
    if (!this.privyContext?.user?.wallet) {
      throw new Error('No wallet connected');
    }

    // Return Privy's wallet client
    return this.privyContext.user.wallet.walletClient;
  }

  createPublicClient(chain: IChain<unknown>): unknown {
    // For EVM chains, create a public client using the chain's RPC
    if (chain.chainType === ChainType.EVM) {
      // This would need to be implemented based on your public client creation logic
      // For now, return the chain's provider
      return chain.provider;
    }

    throw new Error(`Unsupported chain type: ${chain.chainType}`);
  }

  async switchChainId(chainId: string): Promise<void> {
    if (!this.privyContext?.user?.wallet) {
      throw new Error('No wallet connected');
    }

    try {
      const wallet = this.privyContext.user.wallet;
      if (!wallet) {
        throw new Error('No wallet connected');
      }

      await wallet.walletClient!.switchChain(chainId as `0x${string}`);

      await this.handleEventChainChanged(chainId);
    } catch (error) {
      logger.error('Failed to switch chain:', error);
      throw error;
    }
  }

  async addChain(_chain: IChain<unknown>): Promise<void> {
    // Privy handles chain management internally
    // This might not be directly supported
    logger.warn('Adding chains through Privy connector is not directly supported');
  }

  // Helper method to check if Privy context is ready
  isPrivyReady(): boolean {
    return this.isInitialized && this.privyContext !== null;
  }

  // Get Privy user data
  getPrivyUser() {
    return this.privyContext?.user || null;
  }
}
