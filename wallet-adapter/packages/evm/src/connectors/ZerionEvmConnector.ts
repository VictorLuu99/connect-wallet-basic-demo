import { EvmConnector } from './EvmConnector';
import { DappMetadata } from '@phoenix-wallet/core';

export class ZerionEvmConnector extends EvmConnector {
  constructor(dappMetadata: DappMetadata, supportedChains: string[]) {
    super(
      'zerionevm',
      {
        name: 'Zerion',
        logo: "data:image/svg+xml,%3csvg%20width='512'%20height='512'%20viewBox='0%200%20512%20512'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3cg%20clip-path='url(%23clip0_1_14)'%3e%3cpath%20d='M367.223%20512H144.777C64.8348%20512%200%20447.194%200%20367.223V144.777C0%2064.8349%2064.8057%200%20144.777%200H367.223C447.165%200%20512%2064.8057%20512%20144.777V367.223C512%20447.194%20447.165%20512%20367.223%20512Z'%20fill='%232461ED'/%3e%3cpath%20fill-rule='evenodd'%20clip-rule='evenodd'%20d='M292.851%20249.19C242.657%20222.066%20181.584%20186.893%20135.62%20158.223C122.058%20148.453%20128.941%20127.716%20145.332%20127.716H372.764C385.451%20127.716%20393.938%20141.861%20387.58%20152.565C372.297%20178.96%20349.986%20212.471%20331.349%20239.041C321.345%20253.302%20305.042%20255.752%20292.851%20249.19ZM219.645%20257.998C268.177%20283.868%20336.191%20323.212%20384.518%20352.961C399.451%20362.177%20393.501%20384.284%20376.06%20384.284C347.52%20384.284%20301.144%20384.292%20255.009%20384.299C209.35%20384.306%20163.926%20384.313%20136.261%20384.313C122.32%20384.313%20115.175%20369.847%20121.095%20359.756C141.103%20325.662%20163.589%20291.246%20182.284%20265.552C190.597%20254.09%20207.513%20251.523%20219.645%20257.998Z'%20fill='white'/%3e%3c/g%3e%3cdefs%3e%3cclipPath%20id='clip0_1_14'%3e%3crect%20width='512'%20height='512'%20fill='white'/%3e%3c/clipPath%3e%3c/defs%3e%3c/svg%3e",
      },
      dappMetadata,
      supportedChains
    );
  }

  get provider(): any {
    if (typeof window !== 'undefined' && window.zerionWallet) {
      return window.zerionWallet;
    }
    if (typeof window !== 'undefined' && window.ethereum?.isZerion) {
      return window.ethereum;
    }
    if (typeof window !== 'undefined' && window.ethereum?.providers) {
      const zerionProvider = window.ethereum.providers.find(
        (provider: any) => provider.isZerion
      );
      if (zerionProvider) {
        return zerionProvider;
      }
    }
    return null;
  }

  async isInstalled(): Promise<boolean> {
    const provider = this.provider;
    return provider !== null;
  }

  get installLink(): string {
    return 'https://zerion.io/download';
  }
}

