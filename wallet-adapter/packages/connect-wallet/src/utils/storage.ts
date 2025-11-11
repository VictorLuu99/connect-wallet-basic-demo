/**
 * Storage adapters for session persistence
 * Supports both browser localStorage and React Native AsyncStorage
 */

import { StorageAdapter } from '../types';

/**
 * LocalStorage adapter for web browsers
 */
export class LocalStorageAdapter implements StorageAdapter {
  getItem(key: string): string | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    return localStorage.getItem(key);
  }

  setItem(key: string, value: string): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.setItem(key, value);
  }

  removeItem(key: string): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.removeItem(key);
  }
}

/**
 * AsyncStorage adapter for React Native
 * Usage: new AsyncStorageAdapter(AsyncStorage)
 */
export class AsyncStorageAdapter implements StorageAdapter {
  constructor(private asyncStorage: any) {}

  async getItem(key: string): Promise<string | null> {
    return await this.asyncStorage.getItem(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    await this.asyncStorage.setItem(key, value);
  }

  async removeItem(key: string): Promise<void> {
    await this.asyncStorage.removeItem(key);
  }
}

/**
 * Memory storage adapter (fallback when no storage available)
 */
export class MemoryStorageAdapter implements StorageAdapter {
  private storage: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.storage.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.storage.set(key, value);
  }

  removeItem(key: string): void {
    this.storage.delete(key);
  }
}

/**
 * Auto-detect and return appropriate storage adapter
 */
export function getDefaultStorageAdapter(): StorageAdapter {
  if (typeof localStorage !== 'undefined') {
    return new LocalStorageAdapter();
  }
  return new MemoryStorageAdapter();
}
