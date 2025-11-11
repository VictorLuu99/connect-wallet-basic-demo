import { getProvider } from '@binance/w3w-ethereum-provider';
import { DappMetadata } from '@phoenix-wallet/core';
import { EvmConnector } from './EvmConnector';

export class BinanceEvmConnector extends EvmConnector {
  private binanceProvider: any;
  constructor(dappMetadata: DappMetadata, supportedChains: string[]) {
    super(
      'binanceevm',
      {
        name: 'Binance',
        logo: 'https://static.bnbchain.org/home-ui/static/images/wallets/logo_binance-web3-wallet.svg?v=1',
      },
      dappMetadata,
      supportedChains
    );
  }
  get provider(): any {
    return this.binanceProvider;
  }

  get installLink(): string {
    return 'https://www.binance.com';
  }

  async init(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.isInitialized = true;
    this.binanceProvider = getProvider();

    if (!this.provider) {
      throw new Error(this.name + ' provider not found');
    }

    this.setupEventListeners();

    // Check if we have a stored connection
    this.checkStoredConnection();
  }

  async disconnect(): Promise<void> {
    await this.provider.disconnect();
    await super.disconnect();
  }

  get storageConnectionStatusKey(): string | null {
    return null;
  }

  async isInstalled(): Promise<boolean> {
    return true;
  }
}
