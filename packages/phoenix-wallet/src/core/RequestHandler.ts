import {
  SignRequest,
  SignResponse,
  SignResponseResult,
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
      let result: SignResponseResult;

      // Decode payload from JSON string
      const decodedPayload = decodePayload<MessagePayload | TransactionPayload>(request.payload);
      
      if (!decodedPayload) {
        throw new Error('Invalid payload: decoded payload is null');
      }

      // Route to appropriate handler based on request type
      switch (request.type) {
        case 'sign_message':
          result = await this.handleSignMessage(decodedPayload);
          break;
        case 'sign_transaction':
          result = await this.handleSignTransaction(decodedPayload);
          break;
        case 'sign_all_transactions':
          result = await this.handleSignAllTransactions(decodedPayload);
          break;
        case 'send_transaction':
          result = await this.handleSendTransaction(decodedPayload);
          break;
        default:
          throw new Error(`Unsupported request type: ${(request as SignRequest).type}`);
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

  /**
   * Handle sign message request
   */
  private async handleSignMessage(
    decodedPayload: MessagePayload | TransactionPayload
  ): Promise<SignResponseResult> {
    if (!this.signer) {
      throw new Error('No signer configured');
    }

    const signature = await this.signer.signMessage(decodedPayload as MessagePayload);
    const message = this.extractMessageFromPayload(decodedPayload);

    return {
      signature,
      message,
      from: this.signer.address,
    };
  }

  /**
   * Handle sign transaction request
   */
  private async handleSignTransaction(
    decodedPayload: MessagePayload | TransactionPayload
  ): Promise<SignResponseResult> {
    if (!this.signer) {
      throw new Error('No signer configured');
    }

    const signature = await this.signer.signTransaction(decodedPayload as TransactionPayload);

    return {
      signature,
      from: this.signer.address,
    };
  }

  /**
   * Handle sign all transactions request (batch signing)
   */
  private async handleSignAllTransactions(
    decodedPayload: MessagePayload | TransactionPayload
  ): Promise<SignResponseResult> {
    if (!this.signer) {
      throw new Error('No signer configured');
    }

    if (!this.signer.signAllTransactions) {
      throw new Error('Batch transaction signing not supported by signer');
    }

    const transactions = this.extractTransactionsArray(decodedPayload);
    const signatures = await this.signer.signAllTransactions(transactions);

    return {
      signatures,
      from: this.signer.address,
    };
  }

  /**
   * Handle send transaction request (sign and broadcast)
   */
  private async handleSendTransaction(
    decodedPayload: MessagePayload | TransactionPayload
  ): Promise<SignResponseResult> {
    if (!this.signer) {
      throw new Error('No signer configured');
    }

    // Prefer direct send if available (e.g., EVM)
    if (this.signer.sendTransaction) {
      const txHash = await this.signer.sendTransaction(decodedPayload as TransactionPayload);
      return {
        txHash,
        from: this.signer.address,
      };
    }

    // Fallback: sign only (wallet can broadcast separately)
    const signature = await this.signer.signTransaction(decodedPayload as TransactionPayload);
    return {
      signature,
      from: this.signer.address,
    };
  }

  /**
   * Extract message string from payload
   */
  private extractMessageFromPayload(payload: MessagePayload | TransactionPayload): string {
    if (typeof payload === 'string') {
      return payload;
    }

    if (payload instanceof Uint8Array) {
      return new TextDecoder().decode(payload);
    }

    if (typeof payload === 'object' && payload !== null) {
      if ('message' in payload) {
        const message = (payload as { message?: unknown }).message;
        if (typeof message === 'string') {
          return message;
        }
        if (message instanceof Uint8Array) {
          return new TextDecoder().decode(message);
        }
      }
      // Fallback: stringify the entire payload
      return JSON.stringify(payload);
    }

    return String(payload);
  }

  /**
   * Extract transactions array from payload
   */
  private extractTransactionsArray(
    payload: MessagePayload | TransactionPayload
  ): TransactionPayload[] {
    if (Array.isArray(payload)) {
      return payload as TransactionPayload[];
    }

    if (typeof payload === 'object' && payload !== null && 'transactions' in payload) {
      const transactions = (payload as { transactions?: unknown }).transactions;
      if (Array.isArray(transactions)) {
        return transactions as TransactionPayload[];
      }
    }

    throw new Error('Invalid payload: sign_all_transactions requires an array of transactions');
  }
}
