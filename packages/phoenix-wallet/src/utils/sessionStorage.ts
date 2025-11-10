import { StorageAdapter } from './storage';
import { Session } from '../types';
import { EncryptionManager } from './encryption';

/**
 * Stored session data structure
 */
export interface StoredSessionData {
  session: Session;
  serverUrl: string;
  keyPair: {
    publicKey: string;
    secretKey: string;
  };
  peerPublicKey?: string;
}

/**
 * Session storage key (plural for multiple sessions)
 */
const STORAGE_KEY = 'phoenix_wallet_sessions';

/**
 * Session storage manager
 * Supports multiple simultaneous sessions
 */
export class SessionStorage {
  private storage: StorageAdapter;
  private enabled: boolean;

  constructor(storage: StorageAdapter, enabled: boolean = true) {
    this.storage = storage;
    this.enabled = enabled;
  }

  /**
   * Save session data
   * @param session - Session to save
   * @param serverUrl - Server URL
   * @param encryption - Encryption manager
   * @param uuid - Optional UUID (uses session.uuid if not provided)
   */
  async saveSession(
    session: Session,
    serverUrl: string,
    encryption: EncryptionManager,
    uuid?: string
  ): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      const sessionUuid = uuid || session.uuid;
      const data: StoredSessionData = {
        session,
        serverUrl,
        keyPair: encryption.exportKeyPair(),
        peerPublicKey: encryption.getPeerPublicKey(),
      };

      // Load existing sessions
      const allSessions = await this.loadSessions();
      
      // Update or add this session
      allSessions.set(sessionUuid, data);

      // Save all sessions
      const sessionsObj = Object.fromEntries(allSessions);
      await this.storage.setItem(STORAGE_KEY, JSON.stringify(sessionsObj));
    } catch (error) {
      console.warn('[Phoenix Wallet] Failed to save session:', error);
    }
  }

  /**
   * Load all sessions
   * @returns Map of UUID to StoredSessionData
   */
  async loadSessions(): Promise<Map<string, StoredSessionData>> {
    if (!this.enabled) {
      return new Map();
    }

    try {
      const data = await this.storage.getItem(STORAGE_KEY);
      if (!data) {
        return new Map();
      }

      const sessionsObj = JSON.parse(data) as Record<string, StoredSessionData>;
      return new Map(Object.entries(sessionsObj));
    } catch (error) {
      console.warn('[Phoenix Wallet] Failed to load sessions:', error);
      return new Map();
    }
  }

  /**
   * Load single session (backward compatibility)
   * @deprecated Use loadSessions() instead
   */
  async loadSession(): Promise<StoredSessionData | null> {
    const sessions = await this.loadSessions();
    if (sessions.size === 0) {
      return null;
    }
    // Return first session for backward compatibility
    const firstValue = sessions.values().next().value;
    return firstValue || null;
  }

  /**
   * Clear session data
   * @param uuid - Optional UUID (clears all if not provided)
   */
  async clearSession(uuid?: string): Promise<void> {
    try {
      if (uuid) {
        // Clear specific session
        const allSessions = await this.loadSessions();
        allSessions.delete(uuid);
        
        if (allSessions.size === 0) {
          // Remove storage key if no sessions left
          await this.storage.removeItem(STORAGE_KEY);
        } else {
          // Save remaining sessions
          const sessionsObj = Object.fromEntries(allSessions);
          await this.storage.setItem(STORAGE_KEY, JSON.stringify(sessionsObj));
        }
      } else {
        // Clear all sessions
        await this.storage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      console.warn('[Phoenix Wallet] Failed to clear session:', error);
    }
  }

  /**
   * Restore encryption manager from stored session
   */
  restoreEncryption(storedData: StoredSessionData): EncryptionManager {
    const keyPair = EncryptionManager.importKeyPair(storedData.keyPair);
    const encryption = new EncryptionManager(keyPair);

    if (storedData.peerPublicKey) {
      encryption.setPeerPublicKey(storedData.peerPublicKey);
    }

    return encryption;
  }
}

