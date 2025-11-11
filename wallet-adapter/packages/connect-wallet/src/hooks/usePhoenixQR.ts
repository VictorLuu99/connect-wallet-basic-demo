/**
 * React hooks for Phoenix QR connector integration
 */

import { useState, useEffect, useCallback } from 'react';
import { PhoenixQREvmConnector } from '../connectors/PhoenixQREvmConnector';
import { PhoenixQRSolanaConnector } from '../connectors/PhoenixQRSolanaConnector';
import { PhoenixSession } from '../types';

/**
 * Hook for managing Phoenix QR connection state
 */
export function usePhoenixQR(
  connector: PhoenixQREvmConnector | PhoenixQRSolanaConnector | null
) {
  const [qrUri, setQrUri] = useState<string>('');
  const [session, setSession] = useState<PhoenixSession | undefined>();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!connector) return;

    const eventBridge = connector.getEventBridge();

    // Handle QR code generation
    const handleQRGenerated = (uri: string) => {
      setQrUri(uri);
      setIsConnecting(true);
      setError(null);
    };

    // Handle successful connection
    const handleSessionConnected = (newSession: PhoenixSession) => {
      setSession(newSession);
      setIsConnecting(false);
      setQrUri(''); // Clear QR code
    };

    // Handle disconnection
    const handleSessionDisconnected = () => {
      setSession(undefined);
      setIsConnecting(false);
      setQrUri('');
    };

    // Handle session restoration
    const handleSessionRestored = (restoredSession: PhoenixSession) => {
      setSession(restoredSession);
    };

    // Handle errors
    const handleError = (err: Error) => {
      setError(err);
      setIsConnecting(false);
    };

    // Register event listeners
    eventBridge.on('qr_generated', handleQRGenerated);
    eventBridge.on('session_connected', handleSessionConnected);
    eventBridge.on('session_disconnected', handleSessionDisconnected);
    eventBridge.on('session_restored', handleSessionRestored);
    eventBridge.on('error', handleError);

    // Check for existing session
    const existingSession = connector.getSession();
    if (existingSession?.connected) {
      setSession(existingSession);
    }

    // Cleanup
    return () => {
      eventBridge.off('qr_generated', handleQRGenerated);
      eventBridge.off('session_connected', handleSessionConnected);
      eventBridge.off('session_disconnected', handleSessionDisconnected);
      eventBridge.off('session_restored', handleSessionRestored);
      eventBridge.off('error', handleError);
    };
  }, [connector]);

  const connect = useCallback(async () => {
    if (!connector) throw new Error('Connector not provided');
    setError(null);
    try {
      await connector.connect();
    } catch (err: any) {
      setError(err);
      throw err;
    }
  }, [connector]);

  const disconnect = useCallback(async () => {
    if (!connector) return;
    setError(null);
    try {
      await connector.disconnect();
    } catch (err: any) {
      setError(err);
      throw err;
    }
  }, [connector]);

  return {
    qrUri,
    session,
    isConnecting,
    isConnected: session?.connected ?? false,
    error,
    connect,
    disconnect,
  };
}

/**
 * Hook for QR modal state management
 */
export function useQRModal() {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return {
    isOpen,
    open,
    close,
    toggle,
  };
}
