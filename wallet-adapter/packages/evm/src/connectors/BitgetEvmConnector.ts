import { DappMetadata } from '@phoenix-wallet/core';
import { EvmConnector } from './EvmConnector';

export class BitgetEvmConnector extends EvmConnector {
  get installLink(): string {
    throw new Error('Method not implemented.');
  }
  constructor(dappMetadata: DappMetadata, supportedChains: string[]) {
    super(
      'bitgetevm',
      {
        name: 'Bitget',
        logo: 'https://www.google.com/url?sa=i&url=https%3A%2F%2Fbitkeep.en.uptodown.com%2Fandroid&psig=AOvVaw0Kzz95JeD51hidVwQ5IpLm&ust=1749269077044000&source=images&cd=vfe&opi=89978449&ved=0CBQQjRxqFwoTCMDUvKH1240DFQAAAAAdAAAAABAE',
      },
      dappMetadata,
      supportedChains
    );
  }

  get provider(): any {
    if (typeof window !== 'undefined' && window.bitkeep?.ethereum) {
      return window.bitkeep.ethereum;
    }
  }

  async isInstalled(): Promise<boolean> {
    // Check if Phantom's Ethereum provider exists
    if (typeof window !== 'undefined') {
      return Boolean(window.bitkeep?.ethereum || window.ethereum?.isBitget);
    }
    return false;
  }
}

