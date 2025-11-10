import { Session, SignRequest } from './protocol';

/**
 * Wallet client events
 * All events include sessionUuid to identify which dApp session they belong to
 */
export interface PhoenixWalletEvents {
  session_connected: (session: Session, sessionUuid: string) => void;
  session_disconnected: (sessionUuid: string) => void;
  session_restored: (session: Session, sessionUuid: string) => void;
  sign_request: (request: SignRequest, sessionUuid: string) => void;
  request_approved: (requestId: string, sessionUuid: string) => void;
  request_rejected: (requestId: string, sessionUuid: string) => void;
  error: (error: Error, sessionUuid?: string) => void;
}

/**
 * Event names
 */
export type PhoenixWalletEventName = keyof PhoenixWalletEvents;
