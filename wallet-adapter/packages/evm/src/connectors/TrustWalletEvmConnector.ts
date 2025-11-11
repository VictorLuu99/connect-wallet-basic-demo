import { DappMetadata, logger } from '@phoenix-wallet/core';
import { EvmConnector } from './EvmConnector';

export class TrustWalletEvmConnector extends EvmConnector {
  constructor(dappMetadata: DappMetadata, supportedChains: string[]) {
    super(
      'trustwallevm',
      {
        name: 'Trust Wallet',
        logo: 'https://developer.trustwallet.com/~gitbook/image?url=https%3A%2F%2F2889587170-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Fspaces%252F-LeGDgApX5LA1FGVGo-z%252Ficon%252FpYYXKlOGhRo1zDk5LwLt%252Fimage%2520%285%29.png%3Falt%3Dmedia%26token%3Db088d715-3766-46ba-b1de-ee6cb5401403&width=32&dpr=2&quality=100&sign=685d269f&sv=2',
      },
      dappMetadata,
      supportedChains
    );
  }

  get provider(): any {
    if (typeof window !== 'undefined' && window.trustwallet) {
      logger.debug('trustwallet', window.trustwallet);
      return window.trustwallet;
    } else if (typeof window !== 'undefined' && window.ethereum?.isTrust) {
      // Fallback to window.ethereum if it has isTrust property
      return window.ethereum;
    }
  }

  async isInstalled(): Promise<boolean> {
    // Check if Trust Wallet's Ethereum provider exists
    if (typeof window !== 'undefined') {
      return Boolean(window.trustwallet);
    }
    return false;
  }

  get installLink(): string {
    return 'https://trustwallet.com/';
  }
}

