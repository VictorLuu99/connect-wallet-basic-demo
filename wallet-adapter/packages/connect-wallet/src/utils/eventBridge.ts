/**
 * Event bridge between phoenix-dapp SDK and wallet-adapter system
 * Translates phoenix events to connector callbacks
 */

import { EventEmitter } from 'eventemitter3';
import { PhoenixSession, PhoenixConnectorEvents } from '../types';

export class EventBridge extends EventEmitter<PhoenixConnectorEvents> {
  /**
   * Bridge phoenix-dapp session_connected event
   */
  emitSessionConnected(session: PhoenixSession): void {
    this.emit('session_connected', session);
  }

  /**
   * Bridge phoenix-dapp session_disconnected event
   */
  emitSessionDisconnected(): void {
    this.emit('session_disconnected');
  }

  /**
   * Bridge phoenix-dapp session restored from storage
   */
  emitSessionRestored(session: PhoenixSession): void {
    this.emit('session_restored', session);
  }

  /**
   * Emit QR code generated event
   */
  emitQRGenerated(uri: string): void {
    this.emit('qr_generated', uri);
  }

  /**
   * Emit QR code scanned event
   */
  emitQRScanned(): void {
    this.emit('qr_scanned');
  }

  /**
   * Emit error event
   */
  emitError(error: Error): void {
    this.emit('error', error);
  }

  /**
   * Clean up all listeners
   */
  cleanup(): void {
    this.removeAllListeners();
  }
}
