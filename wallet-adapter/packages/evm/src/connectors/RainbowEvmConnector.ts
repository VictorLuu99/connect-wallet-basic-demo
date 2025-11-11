import { DappMetadata } from '@phoenix-wallet/core';
import { EvmConnector } from './EvmConnector';

export class RainbowEvmConnector extends EvmConnector {
  constructor(dappMetadata: DappMetadata, supportedChains: string[]) {
    super(
      'rainbowevm',
      {
        name: 'Rainbow',
        logo: 'https://rainbowkit.com/rainbow.svg',
      },
      dappMetadata,
      supportedChains
    );
  }

  get provider(): any {
    if (typeof window !== 'undefined' && window.rainbow) {
      return window.rainbow;
    } else if (typeof window !== 'undefined' && window.ethereum?.isRainbow) {
      // Fallback to window.ethereum if it has isPhantom property
      return window.ethereum;
    }
  }

  async isInstalled(): Promise<boolean> {
    // Check if Rainbow's Ethereum provider exists
    if (typeof window !== 'undefined') {
      return Boolean(window.rainbow || window.ethereum?.isRainbow);
    }
    return false;
  }

  get installLink(): string {
    return 'https://rainbow.me/';
  }
}

