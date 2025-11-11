// Type definitions for Privy integration
export interface PrivyWallet {
  address: string;
  chainId?: number;
  walletClient?: any;
  // Add other Privy wallet properties as needed
}

export interface PrivyUser {
  id: string;
  wallet?: PrivyWallet;
  email?: {
    address: string;
  };
  phone?: {
    number: string;
  };
  // Add other Privy user properties as needed
}

export interface PrivyContext {
  // Authentication state
  ready: boolean;
  authenticated: boolean;
  user: PrivyUser | null;

  // Authentication methods
  login: () => Promise<void>;
  logout: () => Promise<void>;

  // Wallet methods
  connectWallet?: () => Promise<void>;
  disconnectWallet?: () => Promise<void>;

  // Chain methods
  switchChain?: (chainId: number) => Promise<void>;
}
