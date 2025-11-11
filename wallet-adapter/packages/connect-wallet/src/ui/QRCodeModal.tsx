/**
 * QR Code Modal Component
 * Displays QR code for wallet scanning (dApp side)
 */

import React, { useEffect, useState } from 'react';

export interface QRCodeModalProps {
  /**
   * Phoenix connection URI to encode in QR code
   */
  uri: string;

  /**
   * Whether modal is open
   */
  isOpen: boolean;

  /**
   * Callback when modal is closed
   */
  onClose: () => void;

  /**
   * QR code size in pixels
   * @default 300
   */
  size?: number;

  /**
   * Modal title
   * @default "Scan QR Code"
   */
  title?: string;

  /**
   * Instructions text
   * @default "Open your wallet app and scan this QR code to connect"
   */
  instructions?: string;

  /**
   * Custom styles for modal container
   */
  containerStyle?: React.CSSProperties;

  /**
   * Custom styles for QR code container
   */
  qrStyle?: React.CSSProperties;
}

/**
 * QR Code Modal Component
 *
 * Note: This component requires QR code generation.
 * Install one of these libraries:
 * - qrcode.react (recommended): npm install qrcode.react
 * - qrcode: npm install qrcode
 * - react-qr-code: npm install react-qr-code
 *
 * For now, we show a placeholder with the URI text.
 * Replace with actual QR code library in production.
 */
export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  uri,
  isOpen,
  onClose,
  size = 300,
  title = 'Scan QR Code',
  instructions = 'Open your wallet app and scan this QR code to connect',
  containerStyle,
  qrStyle,
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setCopied(false);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleCopyURI = () => {
    navigator.clipboard.writeText(uri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
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
      onClick={handleBackdropClick}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '480px',
          width: '90%',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: '24px', textAlign: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600, color: '#1a1a1a' }}>
            {title}
          </h2>
          <p style={{ margin: '8px 0 0', fontSize: '14px', color: '#666' }}>
            {instructions}
          </p>
        </div>

        {/* QR Code Container */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: '24px',
            ...qrStyle,
          }}
        >
          {/* Placeholder for QR Code */}
          <div
            style={{
              width: size,
              height: size,
              backgroundColor: '#f5f5f5',
              border: '2px dashed #d0d0d0',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              textAlign: 'center',
              marginBottom: '16px',
            }}
          >
            <div>
              <div style={{ fontSize: '48px', marginBottom: '8px' }}>📱</div>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
                QR Code Placeholder
              </div>
              <div style={{ fontSize: '12px', color: '#999', wordBreak: 'break-all' }}>
                {uri.substring(0, 50)}...
              </div>
              <div style={{ fontSize: '11px', color: '#999', marginTop: '12px', fontStyle: 'italic' }}>
                Install qrcode.react to display actual QR code
              </div>
            </div>
          </div>

          {/* URI Info */}
          <div style={{ width: '100%', marginTop: '8px' }}>
            <div
              style={{
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '12px',
                color: '#666',
                wordBreak: 'break-all',
                fontFamily: 'monospace',
                maxHeight: '80px',
                overflow: 'auto',
              }}
            >
              {uri}
            </div>
            <button
              onClick={handleCopyURI}
              style={{
                marginTop: '8px',
                width: '100%',
                padding: '8px',
                backgroundColor: copied ? '#10b981' : '#f3f4f6',
                color: copied ? 'white' : '#374151',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {copied ? '✓ Copied!' : 'Copy URI'}
            </button>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px 24px',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Example usage with actual QR code library (qrcode.react):
 *
 * ```tsx
 * import { QRCodeSVG } from 'qrcode.react';
 *
 * // Replace placeholder with:
 * <QRCodeSVG
 *   value={uri}
 *   size={size}
 *   level="M"
 *   includeMargin={true}
 * />
 * ```
 */
