import { SuiClient } from '@mysten/sui/client';
import { IChain, logger } from '@phoenix-wallet/core';
import { DappMetadata } from '@phoenix-wallet/core';
import { SuiConnector, SuiProvider } from './SuiConnector';

export enum SuiCluster {
  MAINNET = 'mainnet',
  DEVNET = 'devnet',
  TESTNET = 'testnet',
}
export class PhantomSuiConnector extends SuiConnector {
  get installLink(): string {
    return 'https://phantom.com/download';
  }
  createPublicClient(chain: IChain<any>) {
    const client = new SuiClient({ url: chain.provider });
    return client;
  }
  switchChainId(chainId: string): Promise<void> {
    throw new Error('Method not supported.');
  }
  addChain(chain: IChain<any>): Promise<void> {
    throw new Error('Method not supported.');
  }
  // private suiProvider: SuiProvider | null = null;
  private eventListenersSetup = false;

  constructor(dappMetadata: DappMetadata, cluster: SuiCluster = SuiCluster.MAINNET, supportedChains: string[]) {
    super(
      'phantom_sui',
      {
        name: 'Phantom',
        logo: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDgiIGhlaWdodD0iMTA4IiB2aWV3Qm94PSIwIDAgMTA4IDEwOCIgZmlsbD0ibm9uZSI+CjxyZWN0IHdpZHRoPSIxMDgiIGhlaWdodD0iMTA4IiByeD0iMjYiIGZpbGw9IiNBQjlGRjIiLz4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik00Ni41MjY3IDY5LjkyMjlDNDIuMDA1NCA3Ni44NTA5IDM0LjQyOTIgODUuNjE4MiAyNC4zNDggODUuNjE4MkMxOS41ODI0IDg1LjYxODIgMTUgODMuNjU2MyAxNSA3NS4xMzQyQzE1IDUzLjQzMDUgNDQuNjMyNiAxOS44MzI3IDcyLjEyNjggMTkuODMyN0M4Ny43NjggMTkuODMyNyA5NCAzMC42ODQ2IDk0IDQzLjAwNzlDOTQgNTguODI1OCA4My43MzU1IDc2LjkxMjIgNzMuNTMyMSA3Ni45MTIyQzcwLjI5MzkgNzYuOTEyMiA2OC43MDUzIDc1LjEzNDIgNjguNzA1MyA3Mi4zMTRDNjguNzA1MyA3MS41NzgzIDY4LjgyNzUgNzAuNzgxMiA2OS4wNzE5IDY5LjkyMjlDNjUuNTg5MyA3NS44Njk5IDU4Ljg2ODUgODEuMzg3OCA1Mi41NzU0IDgxLjM4NzhDNDcuOTkzIDgxLjM4NzggNDUuNjcxMyA3OC41MDYzIDQ1LjY3MTMgNzQuNDU5OEM0NS42NzEzIDcyLjk4ODQgNDUuOTc2OCA3MS40NTU2IDQ2LjUyNjcgNjkuOTIyOVpNODMuNjc2MSA0Mi41Nzk0QzgzLjY3NjEgNDYuMTcwNCA4MS41NTc1IDQ3Ljk2NTggNzkuMTg3NSA0Ny45NjU4Qzc2Ljc4MTYgNDcuOTY1OCA3NC42OTg5IDQ2LjE3MDQgNzQuNjk4OSA0Mi41Nzk0Qzc0LjY5ODkgMzguOTg4NSA3Ni43ODE2IDM3LjE5MzEgNzkuMTg3NSAzNy4xOTMxQzgxLjU1NzUgMzcuMTkzMSA4My42NzYxIDM4Ljk4ODUgODMuNjc2MSA0Mi41Nzk0Wk03MC4yMTAzIDQyLjU3OTVDNzAuMjEwMyA0Ni4xNzA0IDY4LjA5MTYgNDcuOTY1OCA2NS43MjE2IDQ3Ljk2NThDNjMuMzE1NyA0Ny45NjU4IDYxLjIzMyA0Ni4xNzA0IDYxLjIzMyA0Mi41Nzk1QzYxLjIzMyAzOC45ODg1IDYzLjMxNTcgMzcuMTkzMSA2NS43MjE2IDM3LjE5MzFDNjguMDkxNiAzNy4xOTMxIDcwLjIxMDMgMzguOTg4NSA3MC4yMTAzIDQyLjU3OTVaIiBmaWxsPSIjRkZGREY4Ii8+Cjwvc3ZnPg==',
      },
      dappMetadata,
      cluster,
      supportedChains
    );
    this.provider = this.getPhantomSuiProvider();
  }

  // Check if Phantom wallet with Sui support is installed
  async isInstalled(): Promise<boolean> {
    try {
      if (typeof window === 'undefined') {
        return false;
      }

      // Check for Phantom provider with Sui support
      const hasPhantomSui = !!(
        (window.phantom as any)?.sui ||
        // Check if Phantom is available and has Sui support
        (window.phantom && typeof window.phantom === 'object' && 'sui' in window.phantom)
      );

      return hasPhantomSui;
    } catch (error) {
      logger.error('Error checking Phantom Sui installation:', error);
      return false;
    }
  }

  // Initialize connection to Phantom Sui wallet
  async connect(): Promise<{ address: string; chainId: string }> {
    try {
      if (!(await this.isInstalled())) {
        throw new Error('Phantom wallet with Sui support is not installed. Please install Phantom wallet extension.');
      }

      // Get Phantom Sui provider
      // this.suiProvider = this.getPhantomSuiProvider();
      if (!this.provider) {
        throw new Error('Failed to access Phantom Sui provider');
      }

      // this.provider = this.suiProvider;
      await this.init();

      // Request connection
      const connectResult = await this.provider.requestAccount();

      // Handle both Phantom Sui and standard response structures
      let address: string;

      if (connectResult.address) {
        // Phantom Sui format: direct address field
        address = connectResult.address;
      } else if (connectResult.accounts && connectResult.accounts.length > 0) {
        // Standard Sui wallet format: accounts array
        address = connectResult.accounts[0];
      } else {
        throw new Error('No address or accounts returned from Phantom Sui wallet');
      }

      this.storageConnect(address);

      return {
        address: address,
        chainId: await this.getChainId(),
      };
    } catch (error) {
      logger.error('Error connecting to Phantom Sui:', { error });
      throw error;
    }
  }

  // Disconnect from Phantom Sui wallet
  async disconnect(): Promise<void> {
    try {
      await this.init();
      if (this.provider && 'disconnect' in this.provider) {
        await this.provider.disconnect();
      }

      // Clear state
      this.activeAddress = undefined;
      // this.provider = null;
      // this.suiProvider = null;

      this.disconnectStorage();
    } catch (error) {
      logger.error('Error disconnecting from Phantom Sui:', error);
      throw error;
    }
  }

  // Get connected addresses
  async getConnectedAddresses(): Promise<string[]> {
    try {
      if (!this.provider) {
        return [];
      }

      const connectResult = await this.provider.requestAccount();
      return [connectResult.address || ''];
    } catch (error) {
      logger.error('Error getting connected addresses:', error);
      return [];
    }
  }

  // Setup event listeners for Phantom Sui wallet
  async setupEventListeners(): Promise<void> {
    if (!(await this.isInstalled()) || this.eventListenersSetup || !this.provider) {
      return;
    }

    try {
      const chainId = await this.getChainId();
      // Account changed events
      this.provider.on('accountChanged', (...args: unknown[]) => {
        const event = args[0] as {
          address: string;
          publicKey: { [key: number]: number };
        };
        this.handleEventAccountChanged([event.address]);

        this.handleEventConnect(event.address, chainId);
      });

      // Account change events
      this.provider.on('accountChange', (...args: unknown[]) => {
        const event = args[0] as {
          address: string;
          publicKey: { [key: number]: number };
        };
        this.handleEventAccountChanged([event.address]);
      });

      // Chain/Network change events
      // this.suiProvider.on('chainChange', (...args: unknown[]) => {
      //   const event = args[0] as { chain: string };
      //   this.handleChainChange(event);
      // });

      // Connect events
      this.provider.on('connect', (...args: unknown[]) => {
        logger.info('Connect event: ===================', args);
        const event = args[0] as {
          address: string;
          publicKey: { [key: number]: number };
        };
        this.handleEventConnect(event.address, chainId);
      });
      // Disconnect events
      this.provider.on('disconnect', () => {
        this.handleDisconnect();
      });
      this.eventListenersSetup = true;

      logger.info('Event listeners setup: ===================');
    } catch (error) {
      logger.error('Error setting up Phantom Sui event listeners:', error);
    }
  }

  // Get Phantom Sui provider from window
  private getPhantomSuiProvider(): SuiProvider | null {
    try {
      if (typeof window === 'undefined') {
        return null;
      }

      // Check for Phantom Sui provider
      if ((window.phantom as any)?.sui) {
        return (window.phantom as any).sui;
      }

      // Fallback: check if phantom object has sui property
      if (window.phantom && 'sui' in window.phantom) {
        const suiProvider = (window.phantom as Record<string, unknown>).sui;
        if (suiProvider && typeof suiProvider === 'object' && 'connect' in suiProvider) {
          return suiProvider as unknown as SuiProvider;
        }
      }

      return null;
    } catch (error) {
      logger.error('Error accessing Phantom Sui provider:', error);
      return null;
    }
  }

  // private async handleChainChange(event: { chain: string }): Promise<void> {
  //   try {
  //     const chainId = event.chain || 'sui:mainnet';
  //     await this.handleEventChainChanged(chainId);
  //   } catch (error) {
  //     console.error('Error handling chain change:', error);
  //   }
  // }

  private async handleDisconnect(): Promise<void> {
    try {
      if (this.activeAddress) {
        await this.handleEventDisconnect(this.activeAddress);
      }

      this.disconnectStorage();
      // Clear state
      this.activeAddress = undefined;
      // this.provider = null;
      // this.suiProvider = null;
    } catch (error) {
      logger.error('Error handling disconnect event:', error);
    }
  }

  // Additional Phantom Sui-specific methods

  // Get Phantom wallet info
  getWalletInfo(): { name: string; icon?: string } {
    return {
      name: this.provider?.name || 'Phantom (Sui)',
      icon: this.provider?.icon || this.logo,
    };
  }
}
