import { ChainType, IChain, Connector, DappMetadata, logger } from '@phoenix-wallet/core';
import { SolanaPrivyContext, SolanaPrivyWallet } from './SolanaPrivyContext';

export interface SolanaPrivyConnectorConfig {
  id: string;
  name: string;
  logo: string;
  dappMetadata: DappMetadata;
  chainId: string;
  rpcUrl: string;
}

export class SolanaPrivyConnector extends Connector {
  private solanaPrivyContext: SolanaPrivyContext | null = null;
  private activeAddress: string | null = null;
  private activeWalletIndex: number = 0;
  private isInitialized: boolean = false;
  chainId: string;
  private rpcUrl: string;

  constructor(config: SolanaPrivyConnectorConfig, supportedChains: string[]) {
    super(config.id, config.name, config.logo, config.dappMetadata, supportedChains);
    this.chainId = config.chainId;
    this.rpcUrl = config.rpcUrl;
  }

  getRpcUrl() {
    return this.rpcUrl;
  }

  // Initialize Solana Privy context - will be set by SolanaPrivyBridge
  setSolanaPrivyContext(context: SolanaPrivyContext) {
    this.solanaPrivyContext = context;
    this.isInitialized = true;

    // Set up event listeners when context is available
    this.setupEventListeners();
  }

  get chainType(): ChainType {
    return ChainType.SOLANA;
  }

  get installLink(): string {
    // Privy doesn't require installation
    return '';
  }

  async setupEventListeners(): Promise<void> {
    if (!this.solanaPrivyContext) return;

    // Listen to Solana wallet events
    // The actual event handling will be done in the SolanaPrivyBridge
  }

  async connect(): Promise<{ address: string; chainId: string }> {
    if (!this.solanaPrivyContext) {
      throw new Error(
        'Solana Privy context not initialized. Make sure to use PhoenixPrivyProvider with Solana enabled.'
      );
    }

    try {
      // If no wallets exist, connect a new one
      if (!this.solanaPrivyContext.wallets || this.solanaPrivyContext.wallets.length === 0) {
        await this.solanaPrivyContext.connectWallet();
      }

      // Wait for wallets to be available
      if (!this.solanaPrivyContext.wallets || this.solanaPrivyContext.wallets.length === 0) {
        throw new Error('No Solana wallets available after connection attempt');
      }

      // Use the first available wallet
      const wallet = this.solanaPrivyContext.wallets[0];
      if (!wallet?.address) {
        throw new Error('No valid Solana wallet address found');
      }

      this.activeAddress = wallet.address;
      this.activeWalletIndex = 0;

      // Solana typically uses cluster names, default to solana_mainnet_beta
      const chainId = wallet.chainId || this.chainId;

      // Notify connection - activeAddress is guaranteed to be non-null here
      if (this.activeAddress) {
        await this.handleEventConnect(this.activeAddress, chainId);
      }

      return {
        address: this.activeAddress,
        chainId,
      };
    } catch (error) {
      logger.error('Failed to connect Solana wallet with Privy:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.solanaPrivyContext) {
      throw new Error('Solana Privy context not initialized');
    }

    try {
      // Disconnect the active wallet
      if (this.activeAddress && this.solanaPrivyContext.wallets[this.activeWalletIndex]) {
        await this.solanaPrivyContext.wallets[this.activeWalletIndex].disconnect();
      }

      if (this.activeAddress) {
        await this.handleEventDisconnect(this.activeAddress);
        this.activeAddress = null;
        this.activeWalletIndex = 0;
      }
    } catch (error) {
      logger.error('Failed to disconnect Solana wallet from Privy:', error);
      throw error;
    }
  }

  async getConnectedAddresses(): Promise<string[]> {
    if (!this.solanaPrivyContext?.wallets) {
      return [];
    }

    // Return addresses of all connected Solana wallets
    return this.solanaPrivyContext.wallets
      .filter((wallet: SolanaPrivyWallet) => wallet.address)
      .map((wallet: SolanaPrivyWallet) => wallet.address);
  }

  async getChainId(): Promise<string> {
    return this.chainId;
  }

  async isInstalled(): Promise<boolean> {
    // Privy is web-based, no installation required
    return true;
  }

  async isConnected(): Promise<boolean> {
    return !!(this.solanaPrivyContext?.wallets && this.solanaPrivyContext.wallets.length > 0 && this.activeAddress);
  }

  createWalletClient(): unknown {
    if (!this.solanaPrivyContext?.wallets || this.activeWalletIndex >= this.solanaPrivyContext.wallets.length) {
      throw new Error('No active Solana wallet');
    }

    // Return Privy's Solana wallet client
    return this.solanaPrivyContext.wallets[this.activeWalletIndex];
  }

  createPublicClient(chain: IChain<unknown>): unknown {
    // For Solana chains, return the chain's connection/provider
    if (chain.chainType === ChainType.SOLANA) {
      return chain.provider; // This should be a Solana Connection
    }

    throw new Error(`Unsupported chain type for Solana connector: ${chain.chainType}`);
  }

  async switchChainId(chainId: string): Promise<void> {
    if (!this.solanaPrivyContext?.wallets || this.activeWalletIndex >= this.solanaPrivyContext.wallets.length) {
      throw new Error('No active Solana wallet');
    }

    try {
      // Solana typically uses cluster switching
      // This depends on Privy's Solana API implementation
      const activeWallet = this.solanaPrivyContext.wallets[this.activeWalletIndex];

      // If wallet supports cluster switching
      if (activeWallet.switchCluster) {
        await activeWallet.switchCluster(chainId);
      }

      // Trigger chain changed event
      await this.handleEventChainChanged(chainId);
    } catch (error) {
      logger.error('Failed to switch Solana cluster:', error);
      throw error;
    }
  }

  async addChain(): Promise<void> {
    // Solana cluster management is typically handled by the RPC endpoint
    // This might not be directly supported for Solana
    logger.warn('Adding chains through Solana Privy connector is not directly supported');
  }

  // Helper methods
  isPrivyReady(): boolean {
    return this.isInitialized && this.solanaPrivyContext !== null;
  }

  getActiveSolanaWallet() {
    if (!this.solanaPrivyContext?.wallets || this.activeWalletIndex >= this.solanaPrivyContext.wallets.length) {
      return null;
    }
    return this.solanaPrivyContext.wallets[this.activeWalletIndex];
  }

  getAllSolanaWallets() {
    return this.solanaPrivyContext?.wallets || [];
  }

  // Switch between multiple Solana wallets if user has multiple
  async switchToWallet(walletIndex: number): Promise<void> {
    if (!this.solanaPrivyContext?.wallets || walletIndex >= this.solanaPrivyContext.wallets.length) {
      throw new Error(`Invalid wallet index: ${walletIndex}`);
    }

    const newWallet = this.solanaPrivyContext.wallets[walletIndex];
    if (!newWallet.address) {
      throw new Error('Selected wallet has no address');
    }

    // Update active wallet
    this.activeWalletIndex = walletIndex;
    this.activeAddress = newWallet.address;

    // Trigger account changed event - activeAddress is guaranteed to be non-null here
    if (this.activeAddress) {
      await this.handleEventAccountChanged([this.activeAddress]);
    }

    // Also trigger chain changed if different
    const newChainId = newWallet.chainId || this.chainId;
    await this.handleEventChainChanged(newChainId);
  }
}
