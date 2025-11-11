import { AdapterWallet, Network, WalletCore, WalletReadyState } from '@aptos-labs/wallet-adapter-core';
import { DappMetadata } from '@phoenix-wallet/core';
import { AptosConnector } from './AptosConnector';

export class OKXAptosConnector extends AptosConnector {
  private sdk: AdapterWallet | null = null;
  constructor(dappMetadata: DappMetadata, cluster: Network, supportedChains: string[]) {
    super(
      {
        name: 'OKX Wallet',
        logo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMwAAADACAMAAAB/Pny7AAAAWlBMVEWa7SwAAACh9y40UQ90siGJ1CdOeRZqoh6Q3ymc8C1YhxlilxxbjRuN2yhekRqN2Sh9wSOW5is9XhFwrB8HCwAsRAspQAoNFAMOFwOEzCVCZhF4uCIuSAyAxiTE40MlAAABqUlEQVR4nO3dYVbiQBCF0RBR0oJIFFFwsv9tzhLyPGfaNJn7LaDiPYp/qoxdJ0mSJEmSJEmSJOl/rkQtM+3Hlu7lcbYhfX4pw/y0l66SpgyHh/ne3kNNeX8Lxh2GSprdeRP0MfXJsH66JNM2+yqUMj5FT9/sMswum/ZU51szLISpYYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYH5XUxZClNjc1a6Q/T0z22G2X5F4w5jlTVgud4Sy3Hs+/n1ft+Px2Tfe5tq7c5fv7ezfY/96fg82/HUj8m013pXDX3S9SH58fkzRcOqWUJx+MneL/x1RpV9hjnUuiT5l8G0GkyrwbQaTKvBtBpMq8G0GkyrwbQaTKvBtBpMq8G0GkyrwbQaTKutC3Mna8BsQTtFC9rLadkFbbo6n+5gdV6m5KjhnB81fAbjbtc6Bxpjdm7ylZ6bJJZavydWdQi0qhMtGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYmN/FLLU5q/NX5112rXBJXwv+kUw776pQ8he2h+OWfWH7ml6lv65/ciBJkiRJkiRJkiTpLvoLy35JXDZOeCMAAAAASUVORK5CYII=',
      },
      dappMetadata,
      cluster,
      supportedChains
    );
  }

  async init(): Promise<void> {
    if (this.sdk) {
      return;
    }
    this.sdk = new WalletCore(['OKX Wallet']).wallets.find((e) => e?.name === 'OKX Wallet')!;
    super.init();
  }

  get adapter(): AdapterWallet {
    return this.sdk!;
  }

  async onDisconnect(): Promise<void> {
    window.okxwallet.aptos.onDisconnect(() => {
      if (typeof localStorage !== 'undefined') {
        if (this.storageConnectionStatusKey) {
          localStorage.removeItem(this.storageConnectionStatusKey);
        }
      }
      if (this.activeAddress) {
        this.handleEventDisconnect(this.activeAddress);
        this.activeAddress = undefined;
      }
    });
  }

  async isInstalled(): Promise<boolean> {
    // await this.init();
    if (this.sdk?.readyState === WalletReadyState.Installed) {
      return true;
    }

    if (typeof window !== 'undefined') {
      return Boolean(window.okxwallet || window.aptos?.isOKXWallet);
    }
    return false;
  }

  get installLink(): string {
    return 'https://web3.okx.com/download';
  }
}
