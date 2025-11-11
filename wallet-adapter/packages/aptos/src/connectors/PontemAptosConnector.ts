import { AdapterWallet, Network } from '@aptos-labs/wallet-adapter-core';
import { DappMetadata } from '@phoenix-wallet/core';
import { AptosConnector } from './AptosConnector';

export class PontemAptosConnector extends AptosConnector {
  private sdk: AdapterWallet | null = null;
  constructor(dappMetadata: DappMetadata, cluster: Network, supportedChains: string[]) {
    super(
      {
        name: 'Pontem Wallet',
        logo: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzYiIGhlaWdodD0iMzYiIHZpZXdCb3g9IjAgMCAzNiAzNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE4IDBDOC4wNzMwNCAwIDAgOC4wNzEzOSAwIDE3Ljk5NjNDMCAyNS4xMjk4IDQuMTczMTYgMzEuMzEwOCAxMC4yMDc2IDM0LjIyMDNWMzQuMjM1MUgxMC4yMzcyQzEyLjU4NiAzNS4zNjQ5IDE1LjIyMjggMzYgMTggMzZDMjcuOTI3IDM2IDM2IDI3LjkyODYgMzYgMTguMDAzN0MzNiA4LjA3MTM4IDI3LjkyNyAwIDE4IDBaTTE4IDEuNDc2OTJDMjcuMTA3MSAxLjQ3NjkyIDM0LjUyMjggOC44OTEwOCAzNC41MjI4IDE3Ljk5NjNDMzQuNTIyOCAyMC42MTA1IDMzLjkwOTcgMjMuMDkxNyAzMi44MjQgMjUuMjkyM0MzMC40NDU2IDI0LjE0MDMgMjguMDMwNCAyMy4yODM3IDI1LjU5MjkgMjIuNzAwM1Y4LjkyMDYyQzI1LjU5MjkgOC40NDA2MiAyNS4yMTYyIDguMDU2NjIgMjQuNzQzNSA4LjA1NjYySDIxLjcxNTJIMTQuMDg1NEgxMS4wNTdDMTAuNTkxNyA4LjA1NjYyIDEwLjIwNzYgOC40NDA2MiAxMC4yMDc2IDguOTIwNjJWMjIuNzY2OEM3Ljg0NDA3IDIzLjM1MDIgNS40OTUyOCAyNC4xOTIgMy4xODM0MiAyNS4yOTk3QzIuMDkwMjcgMjMuMDkxNyAxLjQ3NzIzIDIwLjYxNzggMS40NzcyMyAxNy45OTYzQzEuNDc3MjMgOC44OTEwOCA4Ljg5MjkgMS40NzY5MiAxOCAxLjQ3NjkyWk00LjEzNjIzIDI2Ljk2MTJDNi4wOTM1NiAyNS45OTM4IDguMTI0NzQgMjUuMjQ4IDEwLjIxNSAyNC43MzExVjMyLjU1ODhDNy43NDA2NiAzMS4yMzY5IDUuNjUwMzkgMjkuMzAyMiA0LjEzNjIzIDI2Ljk2MTJaTTE0LjA4NTQgMzQuMDQzMVYxNS42MDM3QzE0LjA4NTQgMTMuNDY5NSAxNS44MzU5IDExLjcwNDYgMTcuOTI2MSAxMS43MDQ2QzIwLjAxNjQgMTEuNzA0NiAyMS43MTUyIDEzLjQzMjYgMjEuNzE1MiAxNS41NTk0QzIxLjcxNTIgMTUuNTc0MiAyMS43MDc4IDE1LjU4ODkgMjEuNzA3OCAxNS42MDM3SDIxLjcxNTJWMjIuMDIwOUMxOS45MzUyIDIxLjgxNDIgMTguMTQ3NyAyMS43NDc3IDE2LjM2MDMgMjEuODQzN0wxNC44OTA0IDIzLjk3NzhDMTcuMTgwMSAyMy43ODU4IDE5LjQxMDcgMjMuODAwNiAyMS42MTE4IDI0LjA1MTdDMjEuNjM0IDI0LjA1MTcgMjEuNjQ4NyAyNC4wNTE3IDIxLjY3MDkgMjQuMDU5MUMyMS42ODU3IDI0LjA1OTEgMjEuNzAwNSAyNC4wNTkxIDIxLjcyMjYgMjQuMDY2NUMyMi4xMDY3IDI0LjExMDggMjMuNTAyNyAyNC4yODggMjQuNzgwNSAyNC42MDU1TDIxLjcyMjYgMjUuNjQ2OFYzNC4xMDIyQzIwLjUyNjEgMzQuMzc1NCAxOS4yODUyIDM0LjUzMDUgMTguMDE0OCAzNC41MzA1QzE2LjY0ODMgMzQuNTE1NyAxNS4zNDEgMzQuMzQ1OCAxNC4wODU0IDM0LjA0MzFaTTI1LjU4NTYgMzIuNjYyMlYyNC43NjhDMjcuNjY4NCAyNS4yOTIzIDI5LjcyOTIgMjYuMDYwMyAzMS43OTczIDI3LjA2NDZDMzAuMjQ2MiAyOS40MjAzIDI4LjEwNDIgMzEuMzU1MSAyNS41ODU2IDMyLjY2MjJaIiBmaWxsPSJ1cmwoI3BhaW50MF9saW5lYXJfMjIyXzE2NzApIi8+CjxkZWZzPgo8bGluZWFyR3JhZGllbnQgaWQ9InBhaW50MF9saW5lYXJfMjIyXzE2NzAiIHgxPSIxNy45OTk3IiB5MT0iMzYuNzc4OSIgeDI9IjE3Ljk5OTciIHkyPSItNS41MTk3OCIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPgo8c3RvcCBvZmZzZXQ9IjAuMDg1OCIgc3RvcC1jb2xvcj0iIzhEMjlDMSIvPgo8c3RvcCBvZmZzZXQ9IjAuMjM4MyIgc3RvcC1jb2xvcj0iIzk0MkJCQiIvPgo8c3RvcCBvZmZzZXQ9IjAuNDY2NyIgc3RvcC1jb2xvcj0iI0E5MkZBQyIvPgo8c3RvcCBvZmZzZXQ9IjAuNzQxMyIgc3RvcC1jb2xvcj0iI0NBMzc5MyIvPgo8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNGMDNGNzciLz4KPC9saW5lYXJHcmFkaWVudD4KPC9kZWZzPgo8L3N2Zz4K',
      },
      dappMetadata,
      cluster,
      supportedChains
    );
  }

  async onDisconnect(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  get adapter(): AdapterWallet {
    return this.sdk!;
  }

  // async isConnected(): Promise<boolean> {
  //   return this._provider?.isConnected() ?? false;
  // }

  // async connect(): Promise<{ address: string; chainId: string }> {
  //   await this.init();
  //   console.log('Connecting to Aptos pontem');
  //   const chainId = await this.getChainId();
  //   try {
  //     const response = await this._provider?.connect();
  //     this.activeAddress = response.address;
  //     console.log('esponse.address', response.address);

  //     this.handleEventConnect(response.address, chainId);
  //   } catch (error) {
  //     if (this.activeAddress) {
  //       this.handleEventDisconnect(this.activeAddress);
  //       this.activeAddress = undefined;
  //     }
  //     throw new Error('something went wrong');
  //   }
  //   console.log('this.activeAddress return', this.activeAddress);
  //   return {
  //     address: this.activeAddress ?? '',
  //     chainId: chainId,
  //   };
  // }

  // async disconnect(): Promise<void> {
  //   await this.init();
  //   console.log('Disconnecting from Aptos pontem');
  //   try {
  //     await this._provider?.disconnect();
  //     if (this.activeAddress) {
  //       this.handleEventDisconnect(this.activeAddress);
  //       this.activeAddress = undefined;
  //     }
  //   } catch (error: any) {
  //     console.log('Error disconnecting from Aptos pontem', { error });
  //     if (this.activeAddress) {
  //       this.handleEventDisconnect(this.activeAddress);
  //     }
  //   }
  // }

  get installLink(): string {
    return 'https://pontem.network/pontem-wallet';
  }
}
