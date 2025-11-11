import { EvmConnector } from './EvmConnector';
import { DappMetadata } from '@phoenix-wallet/core';

export class OkxEvmConnector extends EvmConnector {
  constructor(dappMetadata: DappMetadata, supportedChains: string[]) {
    super(
      'okxevm',
      {
        name: 'OKX Wallet',
        logo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMwAAADACAMAAAB/Pny7AAAAWlBMVEWa7SwAAACh9y40UQ90siGJ1CdOeRZqoh6Q3ymc8C1YhxlilxxbjRuN2yhekRqN2Sh9wSOW5is9XhFwrB8HCwAsRAspQAoNFAMOFwOEzCVCZhF4uCIuSAyAxiTE40MlAAABqUlEQVR4nO3dYVbiQBCF0RBR0oJIFFFwsv9tzhLyPGfaNJn7LaDiPYp/qoxdJ0mSJEmSJEmSJOl/rkQtM+3Hlu7lcbYhfX4pw/y0l66SpgyHh/ne3kNNeX8Lxh2GSprdeRP0MfXJsH66JNM2+yqUMj5FT9/sMswum/ZU51szLISpYYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYH5XUxZClNjc1a6Q/T0z22G2X5F4w5jlTVgud4Sy3Hs+/n1ft+Px2Tfe5tq7c5fv7ezfY/96fg82/HUj8m013pXDX3S9SH58fkzRcOqWUJx+MneL/x1RpV9hjnUuiT5l8G0GkyrwbQaTKvBtBpMq8G0GkyrwbQaTKvBtBpMq8G0GkyrwbQaTKutC3Mna8BsQTtFC9rLadkFbbo6n+5gdV6m5KjhnB81fAbjbtc6Bxpjdm7ylZ6bJJZavydWdQi0qhMtGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYmN/FLLU5q/NX5112rXBJXwv+kUw776pQ8he2h+OWfWH7ml6lv65/ciBJkiRJkiRJkiTpLvoLy35JXDZOeCMAAAAASUVORK5CYII=',
      },
      dappMetadata,
      supportedChains
    );
  }

  get provider(): any {
    if (typeof window !== 'undefined' && window.okxwallet) {
      return window.okxwallet;
    } else if (typeof window !== 'undefined' && window.ethereum?.isOkx) {
      return window.ethereum;
    }
  }

  async isInstalled(): Promise<boolean> {
    // Check if Phantom's Ethereum provider exists
    if (typeof window !== 'undefined') {
      return Boolean(window.okxwallet || window.ethereum?.isOkx);
    }
    return false;
  }

  get installLink(): string {
    return 'https://web3.okx.com/download';
  }
}

