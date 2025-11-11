import { DappMetadata } from '@phoenix-wallet/core';
import { EvmConnector } from './EvmConnector';

export class MagicEdenEvmConnector extends EvmConnector {
  constructor(dappMetadata: DappMetadata, supportedChains: string[]) {
    super(
      'magicedenevm',
      {
        name: 'Magic Eden',
        logo: 'data:image/jpeg;base64,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',
      },
      dappMetadata, 
      supportedChains
    );
  }

  get provider(): any {
    if (typeof window !== 'undefined' && window.magicEden?.ethereum) {
      return window.magicEden.ethereum;
    } else if (typeof window !== 'undefined' && window.ethereum?.isMagicEden) {
      // Fallback to window.ethereum if it has isPhantom property
      return window.ethereum;
    }
  }

  async isInstalled(): Promise<boolean> {
    // Check if Magic Eden's Ethereum provider exists
    if (typeof window !== 'undefined') {
      return Boolean(window.magicEden?.ethereum || window.ethereum?.isMagicEden);
    }
    return false;
  }

  get installLink(): string {
    return 'https://docs-wallet.magiceden.io/';
  }
}

