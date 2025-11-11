// Export main provider
export { EvmPhoenixPrivyProvider } from './EvmPhoenixPrivyProvider';
export type { EvmPhoenixPrivyProviderProps } from './EvmPhoenixPrivyProvider';

// Export enhanced provider (multi-chain support)
export { PhoenixPrivyProvider } from './PhoenixPrivyProvider';
export type { PhoenixPrivyProviderProps } from './PhoenixPrivyProvider';

// Export connector
export { PrivyConnector } from './PrivyConnector';
export type { PrivyConnectorConfig } from './PrivyConnector';

// Export bridge components
export { PrivyBridge, usePrivyBridge } from './PrivyBridge';

// Export types
export type { PrivyContext, PrivyWallet, PrivyUser } from './PrivyContext';

// Export Solana components
export * from './solana';

// Re-export logger utilities from core for convenience
export { logger, LogLevel } from '@phoenix-wallet/core';
export type { LoggerConfig } from '@phoenix-wallet/core';
