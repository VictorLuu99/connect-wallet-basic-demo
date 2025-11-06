/**
 * Protocol constants
 */
export const PROTOCOL_VERSION = '1';

/**
 * Socket.io event names
 */
export const SOCKET_EVENTS = {
  // Connection events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',

  // Room events
  JOIN: 'join',
  LEAVE: 'leave',

  // Protocol events
  CONNECTED_UUID: 'connected_uuid',
  DAPP_REQUEST: 'dapp:request',
  DAPP_RESPONSE: 'dapp:response',
  WALLET_REQUEST: 'wallet:request',
  WALLET_RESPONSE: 'wallet:response',
} as const;

/**
 * Timeout values (ms)
 */
export const TIMEOUTS = {
  REQUEST_TIMEOUT: 60000, // 1 minute
  CONNECTION_TIMEOUT: 30000, // 30 seconds
  RECONNECT_DELAY: 2000, // 2 seconds
  MAX_REQUEST_AGE: 300000, // 5 minutes
} as const;

/**
 * Reconnection settings
 */
export const RECONNECT_CONFIG = {
  MAX_ATTEMPTS: 5,
  DELAY: 2000,
  BACKOFF_MULTIPLIER: 1.5,
} as const;
