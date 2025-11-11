/**
 * @phoenix-wallet/connect-wallet
 * QR-code based wallet connector using phoenix-dapp and phoenix-wallet SDKs
 */

// Connectors
export { PhoenixQREvmConnector } from './connectors/PhoenixQREvmConnector';
export { PhoenixQRSolanaConnector } from './connectors/PhoenixQRSolanaConnector';
export { PhoenixQRAptosConnector } from './connectors/PhoenixQRAptosConnector';
export { PhoenixQRSuiConnector } from './connectors/PhoenixQRSuiConnector';
export { PhoenixDappClientWrapper } from './connectors/PhoenixDappClientWrapper';

// Adapters
export { WalletSignerAdapter, createWalletSigner } from './adapters/WalletSignerAdapter';

// UI Components
export { QRCodeModal } from './ui/QRCodeModal';
export { ApprovalDialog } from './ui/ApprovalDialog';
export type { QRCodeModalProps } from './ui/QRCodeModal';
export type { ApprovalDialogProps } from './ui/ApprovalDialog';

// React Hooks
export { usePhoenixQR, useQRModal } from './hooks/usePhoenixQR';
export { useApprovalDialog } from './hooks/useApprovalDialog';

// Utilities
export {
  LocalStorageAdapter,
  AsyncStorageAdapter,
  MemoryStorageAdapter,
  getDefaultStorageAdapter,
} from './utils/storage';
export { SessionPersistence } from './utils/sessionPersistence';
export { EventBridge } from './utils/eventBridge';

// Types
export type {
  PhoenixConnectorConfig,
  QRCodeOptions,
  PhoenixSession,
  StorageAdapter,
  PhoenixConnectorEvents,
  PhoenixSignRequest,
  PhoenixSignResponse,
  PhoenixVirtualProvider,
  WalletSigner,
} from './types';
