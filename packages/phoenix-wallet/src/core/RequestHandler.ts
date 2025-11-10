import {
  SignRequest,
  SignResponse,
  WalletSigner,
} from '../types';
import { isValidTimestamp } from '../utils/validation';
import { decodePayload, MessagePayload, TransactionPayload } from '../utils/payload';

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
      let result: import('../types').SignResponseResult;

      // Decode payload from JSON string
      const decodedPayload = decodePayload<MessagePayload | TransactionPayload>(request.payload);
      
      if (!decodedPayload) {
        throw new Error('Invalid payload: decoded payload is null');
      }

      if (request.type === 'sign_message') {
        const signature = await this.signer.signMessage(decodedPayload as MessagePayload);
        result = { 
          signature, 
          message: typeof decodedPayload === 'object' && decodedPayload !== null && 'message' in decodedPayload 
            ? String((decodedPayload as { message?: unknown }).message || decodedPayload)
            : String(decodedPayload)
        };
      } else if (request.type === 'sign_transaction') {
        const signature = await this.signer.signTransaction(decodedPayload as TransactionPayload);
        result = {
          signature,
          from: this.signer.address,
        };
      } else if (request.type === 'sign_all_transactions') {
        // Handle batch signing (e.g., Solana)
        if (!this.signer.signAllTransactions) {
          throw new Error('signAllTransactions not supported by signer');
        }
        const transactions = (typeof decodedPayload === 'object' && decodedPayload !== null && 'transactions' in decodedPayload)
          ? (decodedPayload as { transactions?: unknown }).transactions
          : decodedPayload;
        if (!Array.isArray(transactions)) {
          throw new Error('sign_all_transactions requires array of transactions');
        }
        const signatures = await this.signer.signAllTransactions(transactions as TransactionPayload[]);
        result = {
          signatures,
          from: this.signer.address,
        };
      } else if (request.type === 'send_transaction') {
        // Handle direct send (e.g., EVM)
        if (this.signer.sendTransaction) {
          const txHash = await this.signer.sendTransaction(decodedPayload as TransactionPayload);
          result = {
            txHash,
            from: this.signer.address,
          };
        } else {
          // Fallback: sign and return signature (wallet can broadcast separately)
          const signature = await this.signer.signTransaction(decodedPayload as TransactionPayload);
          result = {
            signature,
            from: this.signer.address,
          };
        }
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
