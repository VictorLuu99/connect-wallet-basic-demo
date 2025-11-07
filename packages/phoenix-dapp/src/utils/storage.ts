/**
 * Storage adapter interface for session persistence
 * Supports both browser (localStorage) and React Native (AsyncStorage) environments
 */
export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/**
 * Browser localStorage adapter
 */
export class LocalStorageAdapter implements StorageAdapter {
  async getItem(key: string): Promise<string | null> {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      console.warn('[Phoenix] Failed to read from localStorage:', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    if (typeof window === 'undefined' || !window.localStorage) {
      throw new Error('localStorage is not available');
    }
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      console.warn('[Phoenix] Failed to write to localStorage:', error);
      throw error;
    }
  }

  async removeItem(key: string): Promise<void> {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.warn('[Phoenix] Failed to remove from localStorage:', error);
    }
  }
}

/**
 * Memory storage adapter (fallback when no persistent storage available)
 */
export class MemoryStorageAdapter implements StorageAdapter {
  private storage: Map<string, string> = new Map();

  async getItem(key: string): Promise<string | null> {
    return this.storage.get(key) || null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.storage.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.storage.delete(key);
  }
}

/**
 * Get default storage adapter based on environment
 */
export function getDefaultStorageAdapter(): StorageAdapter {
  // Browser environment - use localStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    return new LocalStorageAdapter();
  }
  
  // Fallback to memory storage
  return new MemoryStorageAdapter();
}

