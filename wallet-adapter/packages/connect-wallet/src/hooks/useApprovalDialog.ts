/**
 * React hook for managing approval dialog state (wallet side)
 */

import { useState, useCallback } from 'react';
import { PhoenixSignRequest } from '../types';

/**
 * Hook for managing approval dialog state and actions
 */
export function useApprovalDialog(
  onApprove?: (requestId: string) => void | Promise<void>,
  onReject?: (requestId: string, reason?: string) => void | Promise<void>
) {
  const [currentRequest, setCurrentRequest] = useState<PhoenixSignRequest | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const showRequest = useCallback((request: PhoenixSignRequest) => {
    setCurrentRequest(request);
    setIsProcessing(false);
  }, []);

  const handleApprove = useCallback(
    async (requestId: string) => {
      setIsProcessing(true);
      try {
        if (onApprove) {
          await onApprove(requestId);
        }
        setCurrentRequest(null);
      } catch (error) {
        console.error('Failed to approve request:', error);
        throw error;
      } finally {
        setIsProcessing(false);
      }
    },
    [onApprove]
  );

  const handleReject = useCallback(
    async (requestId: string, reason?: string) => {
      setIsProcessing(true);
      try {
        if (onReject) {
          await onReject(requestId, reason);
        }
        setCurrentRequest(null);
      } catch (error) {
        console.error('Failed to reject request:', error);
        throw error;
      } finally {
        setIsProcessing(false);
      }
    },
    [onReject]
  );

  const clearRequest = useCallback(() => {
    setCurrentRequest(null);
    setIsProcessing(false);
  }, []);

  return {
    currentRequest,
    isProcessing,
    isOpen: currentRequest !== null,
    showRequest,
    handleApprove,
    handleReject,
    clearRequest,
  };
}
