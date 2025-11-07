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
    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
      const storage = (globalThis as any).localStorage;
      if (storage) {
        try {
          return storage.getItem(key);
        } catch (error) {
          console.warn('[Phoenix] Failed to read from localStorage:', error);
          return null;
        }
      }
    }
    return null;
  }

  async setItem(key: string, value: string): Promise<void> {
    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
      const storage = (globalThis as any).localStorage;
      if (storage) {
        try {
          storage.setItem(key, value);
          return;
        } catch (error) {
          console.warn('[Phoenix] Failed to write to localStorage:', error);
          throw error;
        }
      }
    }
    throw new Error('localStorage is not available');
  }

  async removeItem(key: string): Promise<void> {
    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
      const storage = (globalThis as any).localStorage;
      if (storage) {
        try {
          storage.removeItem(key);
        } catch (error) {
          console.warn('[Phoenix] Failed to remove from localStorage:', error);
        }
      }
    }
  }
}

/**
 * React Native AsyncStorage adapter
 * Requires @react-native-async-storage/async-storage to be installed
 */
export class AsyncStorageAdapter implements StorageAdapter {
  private asyncStorage: any;

  constructor(asyncStorage: any) {
    if (!asyncStorage) {
      throw new Error('AsyncStorage instance is required');
    }
    this.asyncStorage = asyncStorage;
  }

  async getItem(key: string): Promise<string | null> {
    try {
      return await this.asyncStorage.getItem(key);
    } catch (error) {
      console.warn('[Phoenix] Failed to read from AsyncStorage:', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      await this.asyncStorage.setItem(key, value);
    } catch (error) {
      console.warn('[Phoenix] Failed to write to AsyncStorage:', error);
      throw error;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await this.asyncStorage.removeItem(key);
    } catch (error) {
      console.warn('[Phoenix] Failed to remove from AsyncStorage:', error);
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
 * For React Native, user must provide AsyncStorage instance
 */
export function getDefaultStorageAdapter(): StorageAdapter {
  // Browser environment - use localStorage
  if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
    const storage = (globalThis as any).localStorage;
    if (storage) {
      return new LocalStorageAdapter();
    }
  }
  
  // Fallback to memory storage
  return new MemoryStorageAdapter();
}

