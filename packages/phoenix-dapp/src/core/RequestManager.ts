import { SignRequest, SignResponse, SignRequestType } from '../types';

/**
 * Pending request tracking
 */
interface PendingRequest {
  id: string;
  type: SignRequestType;
  timestamp: number;
  resolve: (response: SignResponse) => void;
  reject: (error: Error) => void;
  timeoutId?: NodeJS.Timeout;
}

/**
 * Request manager for tracking pending requests
 */
export class RequestManager {
  private pendingRequests = new Map<string, PendingRequest>();
  private requestTimeout: number;

  constructor(requestTimeout: number = 60000) {
    this.requestTimeout = requestTimeout;
  }

  /**
   * Generate unique request ID
   */
  generateRequestId(type: SignRequestType): string {
    const prefixMap: Record<SignRequestType, string> = {
      'sign_message': 'msg',
      'sign_transaction': 'tx',
      'sign_all_transactions': 'txs',
      'send_transaction': 'send',
    };
    const prefix = prefixMap[type] || 'req';
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Add pending request
   */
  addRequest(
    id: string,
    type: SignRequestType,
    resolve: (response: SignResponse) => void,
    reject: (error: Error) => void
  ): void {
    // Set timeout
    const timeoutId = setTimeout(() => {
      this.rejectRequest(id, new Error('Request timeout'));
    }, this.requestTimeout);

    this.pendingRequests.set(id, {
      id,
      type,
      timestamp: Date.now(),
      resolve,
      reject,
      timeoutId,
    });
  }

  /**
   * Resolve pending request
   */
  resolveRequest(id: string, response: SignResponse): void {
    const request = this.pendingRequests.get(id);
    if (!request) {
      console.warn(`No pending request found for ID: ${id}`);
      return;
    }

    if (request.timeoutId) {
      clearTimeout(request.timeoutId);
    }

    request.resolve(response);
    this.pendingRequests.delete(id);
  }

  /**
   * Reject pending request
   */
  rejectRequest(id: string, error: Error): void {
    const request = this.pendingRequests.get(id);
    if (!request) {
      console.warn(`No pending request found for ID: ${id}`);
      return;
    }

    if (request.timeoutId) {
      clearTimeout(request.timeoutId);
    }

    request.reject(error);
    this.pendingRequests.delete(id);
  }

  /**
   * Check if request exists
   */
  hasRequest(id: string): boolean {
    return this.pendingRequests.has(id);
  }

  /**
   * Clear all pending requests
   */
  clearAll(): void {
    this.pendingRequests.forEach((request) => {
      if (request.timeoutId) {
        clearTimeout(request.timeoutId);
      }
      request.reject(new Error('Connection closed'));
    });
    this.pendingRequests.clear();
  }

  /**
   * Get pending request count
   */
  getPendingCount(): number {
    return this.pendingRequests.size;
  }
}
