import { DappMetadata } from '@phoenix-wallet/core';
import { EvmConnector } from './EvmConnector';

export class PhantomEvmConnector extends EvmConnector {
  constructor(dappMetadata: DappMetadata, supportedChains: string[]) {
    super(
      'phantomevm',
      {
        name: 'Phantom',
        logo: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDgiIGhlaWdodD0iMTA4IiB2aWV3Qm94PSIwIDAgMTA4IDEwOCIgZmlsbD0ibm9uZSI+CjxyZWN0IHdpZHRoPSIxMDgiIGhlaWdodD0iMTA4IiByeD0iMjYiIGZpbGw9IiNBQjlGRjIiLz4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik00Ni41MjY3IDY5LjkyMjlDNDIuMDA1NCA3Ni44NTA5IDM0LjQyOTIgODUuNjE4MiAyNC4zNDggODUuNjE4MkMxOS41ODI0IDg1LjYxODIgMTUgODMuNjU2MyAxNSA3NS4xMzQyQzE1IDUzLjQzMDUgNDQuNjMyNiAxOS44MzI3IDcyLjEyNjggMTkuODMyN0M4Ny43NjggMTkuODMyNyA5NCAzMC42ODQ2IDk0IDQzLjAwNzlDOTQgNTguODI1OCA4My43MzU1IDc2LjkxMjIgNzMuNTMyMSA3Ni45MTIyQzcwLjI5MzkgNzYuOTEyMiA2OC43MDUzIDc1LjEzNDIgNjguNzA1MyA3Mi4zMTRDNjguNzA1MyA3MS41NzgzIDY4LjgyNzUgNzAuNzgxMiA2OS4wNzE5IDY5LjkyMjlDNjUuNTg5MyA3NS44Njk5IDU4Ljg2ODUgODEuMzg3OCA1Mi41NzU0IDgxLjM4NzhDNDcuOTkzIDgxLjM4NzggNDUuNjcxMyA3OC41MDYzIDQ1LjY3MTMgNzQuNDU5OEM0NS42NzEzIDcyLjk4ODQgNDUuOTc2OCA3MS40NTU2IDQ2LjUyNjcgNjkuOTIyOVpNODMuNjc2MSA0Mi41Nzk0QzgzLjY3NjEgNDYuMTcwNCA4MS41NTc1IDQ3Ljk2NTggNzkuMTg3NSA0Ny45NjU4Qzc2Ljc4MTYgNDcuOTY1OCA3NC42OTg5IDQ2LjE3MDQgNzQuNjk4OSA0Mi41Nzk0Qzc0LjY5ODkgMzguOTg4NSA3Ni43ODE2IDM3LjE5MzEgNzkuMTg3NSAzNy4xOTMxQzgxLjU1NzUgMzcuMTkzMSA4My42NzYxIDM4Ljk4ODUgODMuNjc2MSA0Mi41Nzk0Wk03MC4yMTAzIDQyLjU3OTVDNzAuMjEwMyA0Ni4xNzA0IDY4LjA5MTYgNDcuOTY1OCA2NS43MjE2IDQ3Ljk2NThDNjMuMzE1NyA0Ny45NjU4IDYxLjIzMyA0Ni4xNzA0IDYxLjIzMyA0Mi41Nzk1QzYxLjIzMyAzOC45ODg1IDYzLjMxNTcgMzcuMTkzMSA2NS43MjE2IDM3LjE5MzFDNjguMDkxNiAzNy4xOTMxIDcwLjIxMDMgMzguOTg4NSA3MC4yMTAzIDQyLjU3OTVaIiBmaWxsPSIjRkZGREY4Ii8+Cjwvc3ZnPg==',
      },
      dappMetadata,
      supportedChains
    );
  }

  get provider(): any {
    if (typeof window !== 'undefined' && window.phantom?.ethereum) {
      return window.phantom.ethereum;
    } else if (typeof window !== 'undefined' && window.ethereum?.isPhantom) {
      // Fallback to window.ethereum if it has isPhantom property
      return window.ethereum;
    }
  }

  protected checkStoredConnection(): void {
    if (typeof localStorage !== 'undefined' && this.storageConnectionStatusKey) {
      const storedStatus = localStorage.getItem(this.storageConnectionStatusKey);
      if (storedStatus === 'connected') {
        // Attempt to reconnect based on stored state
        this.getConnectedAddresses()
          .then((addresses) => {
            if (addresses.length > 0) {
              this.activeAddress = addresses[0];

              //get localstorage chainId
              const storedChainId = localStorage.getItem(this.storageConnectionStatusKey + '_chainId');
              if (storedChainId) {
                this.activeChainId = storedChainId;
                this.handleEventConnect(this.activeAddress!, this.activeChainId);
              } else {
                this.getChainId().then((chainId) => {
                  this.activeChainId = chainId;
                  this.handleEventConnect(this.activeAddress!, this.activeChainId);
                });
              }
            } else {
              // Clear stored connection if no addresses found
              localStorage.removeItem(this.storageConnectionStatusKey!);
            }
          })
          .catch(() => {
            localStorage.removeItem(this.storageConnectionStatusKey!);
          });
      }
    }
  }

  async handleEventChainChanged(chainId: string): Promise<void> {
    super.handleEventChainChanged(chainId);
    //save chainId to localstorage

    const formattedChainId = chainId?.toString()?.startsWith('0x') ? parseInt(chainId, 16).toString() : chainId;
    localStorage.setItem(this.storageConnectionStatusKey + '_chainId', formattedChainId);
  }

  async isInstalled(): Promise<boolean> {
    // Check if Phantom's Ethereum provider exists
    if (typeof window !== 'undefined') {
      return Boolean(window.phantom?.ethereum || window.ethereum?.isPhantom);
    }
    return false;
  }

  get installLink(): string {
    return 'https://phantom.app/';
  }
}
