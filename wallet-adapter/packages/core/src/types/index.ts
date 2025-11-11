import { IChainConfig } from '../interfaces/Chain';
import { IConnector } from '../interfaces/IConnector';
import { LoggerConfig } from '../utils/Logger';

export interface ConnectorConfig {
  name: string;
  logo: string;
}

export enum ConnectorStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
}

export interface ConnectorState {
  connecting: boolean;
  connected: boolean;
  address: string | null;
  chain: null;
  error: Error | null;
}

export interface ConnectorInterface<T> {
  id: string;
  name: string;
  config: ConnectorConfig;
  connect: () => Promise<null>;
  disconnect: () => Promise<void>;
  getState: () => ConnectorState;
}

export interface WalletProviderProps {
  children: React.ReactNode;
  connectors: IConnector[];
  chainConfigs: IChainConfig[];
  reconnect?: 'none' | 'auto';
  loggerConfig?: LoggerConfig;
}

export interface WalletContextState {
  connectors: IConnector[];
  chainConfigs: IChainConfig[];
  activeConnectors: { [key: string]: IConnector };
  connectorStatuses: { [key: string]: ConnectorStatus };
  reconnect: 'none' | 'auto';
}

export interface DappMetadata {
  name: string;
  url: string;
  icon?: string;
}

