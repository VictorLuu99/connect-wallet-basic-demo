import { Session, SignRequest, SignResponse } from './protocol';

/**
 * DAPP client events
 */
export interface PhoenixDappEvents {
  session_connected: (session: Session) => void;
  session_disconnected: () => void;
  request_sent: (requestId: string) => void;
  request_response: (response: SignResponse) => void;
  error: (error: Error) => void;
}

/**
 * Event names
 */
export type PhoenixDappEventName = keyof PhoenixDappEvents;
