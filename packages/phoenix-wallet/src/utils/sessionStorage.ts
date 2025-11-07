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
 * Session storage key
 */
const STORAGE_KEY = 'phoenix_wallet_session';

/**
 * Session storage manager
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
   */
  async saveSession(
    session: Session,
    serverUrl: string,
    encryption: EncryptionManager
  ): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      const data: StoredSessionData = {
        session,
        serverUrl,
        keyPair: encryption.exportKeyPair(),
        peerPublicKey: encryption.getPeerPublicKey(),
      };

      await this.storage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('[Phoenix Wallet] Failed to save session:', error);
    }
  }

  /**
   * Load session data
   */
  async loadSession(): Promise<StoredSessionData | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      const data = await this.storage.getItem(STORAGE_KEY);
      if (!data) {
        return null;
      }

      return JSON.parse(data) as StoredSessionData;
    } catch (error) {
      console.warn('[Phoenix Wallet] Failed to load session:', error);
      return null;
    }
  }

  /**
   * Clear session data
   */
  async clearSession(): Promise<void> {
    try {
      await this.storage.removeItem(STORAGE_KEY);
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

