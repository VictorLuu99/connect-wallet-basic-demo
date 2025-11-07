import { Session, SignRequest } from './protocol';

/**
 * Wallet client events
 */
export interface PhoenixWalletEvents {
  session_connected: (session: Session) => void;
  session_disconnected: () => void;
  session_restored: (session: Session) => void;
  sign_request: (request: SignRequest) => void;
  request_approved: (requestId: string) => void;
  request_rejected: (requestId: string) => void;
  error: (error: Error) => void;
}

/**
 * Event names
 */
export type PhoenixWalletEventName = keyof PhoenixWalletEvents;
