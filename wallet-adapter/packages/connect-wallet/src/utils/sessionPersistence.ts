/**
 * Session persistence utilities
 * Handles saving/restoring phoenix sessions across page reloads
 */

import { StorageAdapter, PhoenixSession } from '../types';

const STORAGE_KEY_PREFIX = 'phoenix_qr_session_';

export class SessionPersistence {
  constructor(
    private storage: StorageAdapter,
    private enabled: boolean = true
  ) {}

  /**
   * Save session to storage
   */
  async saveSession(connectorId: string, session: PhoenixSession): Promise<void> {
    if (!this.enabled) return;

    const key = this.getStorageKey(connectorId);
    const data = JSON.stringify(session);

    try {
      await this.storage.setItem(key, data);
    } catch (error) {
      console.error('[Phoenix] Failed to save session:', error);
    }
  }

  /**
   * Load session from storage
   */
  async loadSession(connectorId: string): Promise<PhoenixSession | null> {
    if (!this.enabled) return null;

    const key = this.getStorageKey(connectorId);

    try {
      const data = await this.storage.getItem(key);
      if (!data) return null;

      const session = JSON.parse(data) as PhoenixSession;

      // Validate session is not expired (24 hours)
      if (session.connectedAt) {
        const age = Date.now() - session.connectedAt;
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        if (age > maxAge) {
          await this.clearSession(connectorId);
          return null;
        }
      }

      return session;
    } catch (error) {
      console.error('[Phoenix] Failed to load session:', error);
      return null;
    }
  }

  /**
   * Clear session from storage
   */
  async clearSession(connectorId: string): Promise<void> {
    if (!this.enabled) return;

    const key = this.getStorageKey(connectorId);

    try {
      await this.storage.removeItem(key);
    } catch (error) {
      console.error('[Phoenix] Failed to clear session:', error);
    }
  }

  /**
   * Check if connector has stored session
   */
  async hasStoredSession(connectorId: string): Promise<boolean> {
    if (!this.enabled) return false;

    const session = await this.loadSession(connectorId);
    return session !== null && session.connected;
  }

  /**
   * Get storage key for connector
   */
  private getStorageKey(connectorId: string): string {
    return `${STORAGE_KEY_PREFIX}${connectorId}`;
  }
}
