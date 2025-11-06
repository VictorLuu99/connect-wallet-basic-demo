import {
  SignRequest,
  SignResponse,
  SignMessagePayload,
  SignTransactionPayload,
  WalletSigner,
} from '../types';
import { isValidTimestamp } from '../utils/validation';

/**
 * Request handler for processing sign requests
 */
export class RequestHandler {
  private signer?: WalletSigner;
  private pendingRequest?: SignRequest;

  /**
   * Set wallet signer
   */
  setSigner(signer: WalletSigner): void {
    this.signer = signer;
  }

  /**
   * Validate and store incoming request
   */
  validateRequest(request: SignRequest): void {
    // Validate timestamp
    if (!isValidTimestamp(request.timestamp)) {
      throw new Error('Request expired or invalid timestamp');
    }

    // Validate chain type matches signer
    if (this.signer && request.chainType !== this.signer.chainType) {
      throw new Error(
        `Chain type mismatch - signer supports ${this.signer.chainType}, request is for ${request.chainType}`
      );
    }

    // Store as pending
    this.pendingRequest = request;
  }

  /**
   * Get pending request
   */
  getPendingRequest(): SignRequest | undefined {
    return this.pendingRequest;
  }

  /**
   * Clear pending request
   */
  clearPendingRequest(): void {
    this.pendingRequest = undefined;
  }

  /**
   * Approve request and sign
   */
  async approveRequest(requestId: string): Promise<SignResponse> {
    if (!this.signer) {
      throw new Error('No signer configured');
    }

    if (!this.pendingRequest || this.pendingRequest.id !== requestId) {
      throw new Error('No matching pending request');
    }

    const request = this.pendingRequest;

    try {
      let result: any;

      if (request.type === 'sign_message') {
        const payload = request.payload as SignMessagePayload;
        const signature = await this.signer.signMessage(payload);
        result = { signature, message: payload.message };
      } else if (request.type === 'sign_transaction') {
        const payload = request.payload as SignTransactionPayload;
        const txHash = await this.signer.signTransaction(payload);
        result = {
          txHash,
          to: payload.to,
          value: payload.value,
          from: this.signer.address,
        };
      } else {
        throw new Error(`Unsupported request type: ${request.type}`);
      }

      const response: SignResponse = {
        id: request.id,
        type: request.type,
        status: 'success',
        result,
        timestamp: Date.now(),
      };

      // Clear pending request
      this.clearPendingRequest();

      return response;
    } catch (error) {
      // Clear pending request
      this.clearPendingRequest();

      const response: SignResponse = {
        id: request.id,
        type: request.type,
        status: 'error',
        error: error instanceof Error ? error.message : 'Signing failed',
        timestamp: Date.now(),
      };

      return response;
    }
  }

  /**
   * Reject request
   */
  async rejectRequest(requestId: string, reason?: string): Promise<SignResponse> {
    if (!this.pendingRequest || this.pendingRequest.id !== requestId) {
      throw new Error('No matching pending request');
    }

    const request = this.pendingRequest;

    const response: SignResponse = {
      id: request.id,
      type: request.type,
      status: 'error',
      error: reason || 'User rejected request',
      timestamp: Date.now(),
    };

    // Clear pending request
    this.clearPendingRequest();

    return response;
  }
}
