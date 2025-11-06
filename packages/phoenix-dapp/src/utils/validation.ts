import { ChainType } from '../types';

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate chain type
 */
export function isValidChainType(chainType: string): chainType is ChainType {
  return chainType === 'evm' || chainType === 'solana';
}

/**
 * Validate EVM address
 */
export function isValidEvmAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate Solana address
 */
export function isValidSolanaAddress(address: string): boolean {
  // Base58 check - simplified
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

/**
 * Validate address based on chain type
 */
export function isValidAddress(address: string, chainType: ChainType): boolean {
  switch (chainType) {
    case 'evm':
      return isValidEvmAddress(address);
    case 'solana':
      return isValidSolanaAddress(address);
    default:
      return false;
  }
}

/**
 * Validate timestamp (not too old, not in future)
 */
export function isValidTimestamp(timestamp: number, maxAge: number = 5 * 60 * 1000): boolean {
  const now = Date.now();
  const age = now - timestamp;

  // Not in future (allow 1 min clock skew)
  if (age < -60000) {
    return false;
  }

  // Not too old
  if (age > maxAge) {
    return false;
  }

  return true;
}
