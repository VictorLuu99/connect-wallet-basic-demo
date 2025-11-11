// Sui Transaction Types
export interface SuiTransactionBlock {
  kind: 'TransactionBlock';
  inputs: Array<{
    type: string;
    value?: unknown;
  }>;
  transactions: Array<{
    kind: string;
    [key: string]: unknown;
  }>;
}

export interface SuiTransactionResponse {
  digest: string;
  effects?: {
    status: {
      status: 'success' | 'failure';
      error?: string;
    };
    gasUsed: {
      computationCost: string;
      storageCost: string;
      storageRebate: string;
    };
  };
  timestamp?: string;
  checkpoint?: string;
}

export interface SuiSignedTransaction {
  transaction: string;
  signature: string;
}

export interface SuiSignedMessage {
  messageBytes: string;
  signature: string;
}

// Sui Transaction Input Types
export interface SuiSignAndExecuteTransactionBlockInput {
  transaction: SuiTransactionBlock;
  networkID?: string;
  address?: string;
  requestType?: 'WaitForEffectsCert' | 'WaitForLocalExecution';
}

export interface SuiSignTransactionBlockInput {
  transaction: SuiTransactionBlock;
  networkID?: string;
  address?: string;
}

export interface SuiSignMessageInput {
  message: string;
  account?: string;
}

// Sui Connection Types
export interface SuiConnectResult {
  accounts?: string[];
  // Phantom Sui specific fields
  address?: string;
  publicKey?: {
    [key: number]: number;
  };
}

// Sui Chain Identifiers
export type SuiNetwork = 'mainnet' | 'testnet' | 'devnet';
export type SuiChainIdentifier = `sui:${SuiNetwork}`;

// Sui Wallet Events
export type SuiWalletEventType = 'connect' | 'disconnect' | 'accountChange' | 'chainChange' | 'accountChanged';

export interface SuiAccountChangeEvent {
  accounts: string[];
}

export interface SuiChainChangeEvent {
  chain: string;
}
