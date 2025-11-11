// Global type definitions for wallet providers on window object

declare global {
  interface Window {
    ethereum?: any;
    bitkeep?: {
      ethereum?: any;
    };
    magicEden?: {
      ethereum?: any;
    };
    okxwallet?: any;
    phantom?: {
      ethereum?: any;
    };
    rabby?: any;
    rainbow?: any;
    trustwallet?: any;
    coinbaseWalletExtension?: any;
    zerionWallet?: any;
  }
}

export {};
