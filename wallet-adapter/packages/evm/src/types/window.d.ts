// Type definitions for wallet providers on window object

interface EthereumProvider {
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
  isPhantom?: boolean;
  isOkx?: boolean;
  isBitget?: boolean;
  isMagicEden?: boolean;
  isRainbow?: boolean;
  isTrust?: boolean;
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (event: string, callback: (...args: any[]) => void) => void;
  removeListener: (event: string, callback: (...args: any[]) => void) => void;
}

interface WindowWithWallets extends Window {
  ethereum?: EthereumProvider;
  phantom?: {
    ethereum?: EthereumProvider;
  };
  okxwallet?: EthereumProvider;
  bitkeep?: {
    ethereum?: EthereumProvider;
  };
  magicEden?: {
    ethereum?: EthereumProvider;
  };
  rabby?: EthereumProvider;
  rainbow?: EthereumProvider;
  trustwallet?: EthereumProvider;
  coinbaseWalletExtension?: EthereumProvider;
}

declare global {
  interface Window extends WindowWithWallets {}
}

export {};

