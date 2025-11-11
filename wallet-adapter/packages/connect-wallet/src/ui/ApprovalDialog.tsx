/**
 * Approval Dialog Component
 * Displays sign request approval UI (wallet side)
 */

import React from 'react';
import { PhoenixSignRequest } from '../types';

export interface ApprovalDialogProps {
  /**
   * Sign request to approve/reject
   */
  request: PhoenixSignRequest | null;

  /**
   * Whether dialog is open
   */
  isOpen: boolean;

  /**
   * Callback when user approves
   */
  onApprove: (requestId: string) => void;

  /**
   * Callback when user rejects
   */
  onReject: (requestId: string, reason?: string) => void;

  /**
   * Connected dApp information
   */
  dappInfo?: {
    name?: string;
    url?: string;
    icon?: string;
  };

  /**
   * Custom styles
   */
  containerStyle?: React.CSSProperties;
}

/**
 * Approval Dialog Component
 * Shows sign request details and approval buttons
 */
export const ApprovalDialog: React.FC<ApprovalDialogProps> = ({
  request,
  isOpen,
  onApprove,
  onReject,
  dappInfo,
  containerStyle,
}) => {
  if (!isOpen || !request) {
    return null;
  }

  const handleApprove = () => {
    onApprove(request.id);
  };

  const handleReject = () => {
    onReject(request.id, 'User rejected');
  };

  const getRequestTitle = () => {
    switch (request.type) {
      case 'sign_message':
        return 'Sign Message';
      case 'sign_transaction':
        return 'Sign Transaction';
      case 'sign_all_transactions':
        return 'Sign Multiple Transactions';
      case 'send_transaction':
        return 'Send Transaction';
      default:
        return 'Sign Request';
    }
  };

  const getRequestDescription = () => {
    switch (request.type) {
      case 'sign_message':
        return 'The dApp is requesting you to sign a message';
      case 'sign_transaction':
        return 'The dApp is requesting you to sign a transaction';
      case 'sign_all_transactions':
        return 'The dApp is requesting you to sign multiple transactions';
      case 'send_transaction':
        return 'The dApp is requesting you to sign and send a transaction';
      default:
        return 'The dApp is making a signing request';
    }
  };

  const renderPayload = () => {
    try {
      const payload = typeof request.payload === 'string'
        ? JSON.parse(request.payload)
        : request.payload;

      return (
        <pre
          style={{
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            padding: '12px',
            fontSize: '12px',
            overflow: 'auto',
            maxHeight: '200px',
            fontFamily: 'monospace',
            margin: 0,
          }}
        >
          {JSON.stringify(payload, null, 2)}
        </pre>
      );
    } catch {
      return (
        <div
          style={{
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            padding: '12px',
            fontSize: '12px',
            overflow: 'auto',
            maxHeight: '200px',
            wordBreak: 'break-all',
          }}
        >
          {String(request.payload)}
        </div>
      );
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        ...containerStyle,
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '480px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          {dappInfo && (
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', gap: '12px' }}>
              {dappInfo.icon && (
                <img
                  src={dappInfo.icon}
                  alt={dappInfo.name || 'dApp'}
                  style={{ width: '48px', height: '48px', borderRadius: '12px' }}
                />
              )}
              <div>
                {dappInfo.name && (
                  <div style={{ fontSize: '16px', fontWeight: 600, color: '#1a1a1a' }}>
                    {dappInfo.name}
                  </div>
                )}
                {dappInfo.url && (
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {dappInfo.url}
                  </div>
                )}
              </div>
            </div>
          )}
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#1a1a1a' }}>
            {getRequestTitle()}
          </h2>
          <p style={{ margin: '8px 0 0', fontSize: '14px', color: '#666' }}>
            {getRequestDescription()}
          </p>
        </div>

        {/* Request Details */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '4px' }}>
              Chain
            </div>
            <div style={{ fontSize: '14px', color: '#1a1a1a' }}>
              {request.chainType.toUpperCase()} - {request.chainId}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '4px' }}>
              Request Data
            </div>
            {renderPayload()}
          </div>
        </div>

        {/* Warning */}
        <div
          style={{
            backgroundColor: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '24px',
          }}
        >
          <div style={{ fontSize: '12px', color: '#856404' }}>
            ⚠️ Only approve if you trust this dApp and understand what you're signing.
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleReject}
            style={{
              flex: 1,
              padding: '14px 24px',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#e5e7eb')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
          >
            Reject
          </button>
          <button
            onClick={handleApprove}
            style={{
              flex: 1,
              padding: '14px 24px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#3b82f6')}
          >
            Approve & Sign
          </button>
        </div>

        {/* Request ID (for debugging) */}
        <div
          style={{
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: '1px solid #e5e7eb',
            fontSize: '11px',
            color: '#9ca3af',
            fontFamily: 'monospace',
          }}
        >
          Request ID: {request.id}
        </div>
      </div>
    </div>
  );
};
