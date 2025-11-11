import { EvmConnector } from './EvmConnector';
import { DappMetadata, logger } from '@phoenix-wallet/core';

export class RabbyEvmConnector extends EvmConnector {
  constructor(dappMetadata: DappMetadata, supportedChains: string[]) {
    super(
      'rabbyevm',
      {
        name: 'Rabby',
        logo: 'data:image/jpeg;base64,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',
      },
      dappMetadata,
      supportedChains
    );
  }

  get provider(): any {
    if (typeof window !== 'undefined' && window.rabby) {
      return window.rabby;
    } else if (typeof window !== 'undefined' && window.ethereum?.isRabby) {
      // Fallback to window.ethereum if it has isRabby property
      return window.ethereum;
    }
  }

  async isInstalled(): Promise<boolean> {
    logger.debug('window.ethereum', window.rabby);
    // Check if window.ethereum exists and if it has the isRabby property

    if (typeof window !== 'undefined' && window.rabby) {
      logger.debug('window.rabby', window.rabby);
      return Boolean(window.rabby);
    }
    return false;
  }

  get installLink(): string {
    return 'https://rabby.io/';
  }
}

