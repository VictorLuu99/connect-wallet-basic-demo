import { EvmConnector } from './EvmConnector';
import { DappMetadata } from '@phoenix-wallet/core';

interface CoinbaseProvider {
  isCoinbaseWallet?: boolean;
  isCoinbaseBrowser?: boolean;
}

interface WindowWithCoinbase extends Window {
  coinbaseWalletExtension?: CoinbaseProvider;
  ethereum?: CoinbaseProvider & {
    providers?: CoinbaseProvider[];
  };
}

export class CoinbaseEvmConnector extends EvmConnector {
  constructor(dappMetadata: DappMetadata, supportedChains: string[]) {
    super(
      'coinbaseevm',
      {
        name: 'Coinbase',
        logo: 'https://images.ctfassets.net/q5ulk4bp65r7/3TBS4oVkD1ghowTqVQJlqj/2dfd4ea3b623a7c0d8deb2ff445dee9e/Consumer_Wordmark.svg',
      },
      dappMetadata,
      supportedChains
    );
  }

  private get windowWithCoinbase(): WindowWithCoinbase | undefined {
    return typeof window !== 'undefined' ? (window as WindowWithCoinbase) : undefined;
  }

  private findCoinbaseProvider(): CoinbaseProvider | null {
    const win = this.windowWithCoinbase;
    if (!win) return null;


    // Check dedicated extension
    if (win.coinbaseWalletExtension) {
      return win.coinbaseWalletExtension;
    }

    // Check main ethereum object
    if (win.ethereum?.isCoinbaseWallet) {
      return win.ethereum;
    }

    // Check browser integration
    const ethereumProvider = win.ethereum ?? (win.top as WindowWithCoinbase)?.ethereum;
    if (ethereumProvider?.isCoinbaseBrowser) {
      return ethereumProvider;
    }

    return null;
  }

  get provider(): CoinbaseProvider | null {
    return this.findCoinbaseProvider();
  }

  async isInstalled(): Promise<boolean> {
    return this.findCoinbaseProvider() !== null;
  }

  get installLink(): string {
    return 'https://www.coinbase.com/wallet';
  }
}

