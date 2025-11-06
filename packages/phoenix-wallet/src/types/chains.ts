/**
 * Supported blockchain types
 */
export type ChainType = 'evm' | 'solana';

/**
 * Chain configuration
 */
export interface ChainConfig {
  chainType: ChainType;
  chainId: string;
}

/**
 * EVM chain IDs
 */
export const EVM_CHAINS = {
  ETHEREUM_MAINNET: '1',
  ETHEREUM_GOERLI: '5',
  ETHEREUM_SEPOLIA: '11155111',
  POLYGON_MAINNET: '137',
  POLYGON_MUMBAI: '80001',
  BSC_MAINNET: '56',
  BSC_TESTNET: '97',
} as const;

/**
 * Solana cluster IDs
 */
export const SOLANA_CHAINS = {
  MAINNET: 'mainnet-beta',
  DEVNET: 'devnet',
  TESTNET: 'testnet',
} as const;
