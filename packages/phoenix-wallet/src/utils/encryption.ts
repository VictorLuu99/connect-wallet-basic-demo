import nacl from 'tweetnacl';
import * as naclUtil from 'tweetnacl-util';

/**
 * Helper function to convert Uint8Array to base64
 * Works in browser, Node.js, and React Native environments
 * Uses tweetnacl-util which is compatible with all environments
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  // Use tweetnacl-util for cross-platform compatibility
  // It works in browser, Node.js, and React Native
  return naclUtil.encodeBase64(bytes);
}

/**
 * Helper function to convert base64 to Uint8Array
 * Works in browser, Node.js, and React Native environments
 * Uses tweetnacl-util which is compatible with all environments
 */
function base64ToUint8Array(base64: string): Uint8Array {
  // Use tweetnacl-util for cross-platform compatibility
  // It works in browser, Node.js, and React Native
  return naclUtil.decodeBase64(base64);
}

/**
 * Encryption manager using TweetNaCl (Curve25519)
 */
export class EncryptionManager {
  private keyPair: nacl.BoxKeyPair;
  private peerPublicKey?: Uint8Array;

  constructor(keyPair?: nacl.BoxKeyPair) {
    // Use provided key pair or generate new one
    this.keyPair = keyPair || nacl.box.keyPair();
  }

  /**
   * Get public key as base64 string
   */
  getPublicKey(): string {
    return uint8ArrayToBase64(this.keyPair.publicKey);
  }

  /**
   * Get secret key as base64 string (for persistence)
   */
  getSecretKey(): string {
    return uint8ArrayToBase64(this.keyPair.secretKey);
  }

  /**
   * Export key pair for persistence
   */
  exportKeyPair(): { publicKey: string; secretKey: string } {
    return {
      publicKey: this.getPublicKey(),
      secretKey: this.getSecretKey(),
    };
  }

  /**
   * Import key pair from persistence
   */
  static importKeyPair(keyPairData: { publicKey: string; secretKey: string }): nacl.BoxKeyPair {
    return {
      publicKey: base64ToUint8Array(keyPairData.publicKey),
      secretKey: base64ToUint8Array(keyPairData.secretKey),
    };
  }

  /**
   * Set peer's public key
   */
  setPeerPublicKey(publicKeyBase64: string): void {
    this.peerPublicKey = base64ToUint8Array(publicKeyBase64);
  }

  /**
   * Get peer's public key (for persistence)
   */
  getPeerPublicKey(): string | undefined {
    return this.peerPublicKey ? uint8ArrayToBase64(this.peerPublicKey) : undefined;
  }

  /**
   * Check if peer public key is set
   */
  hasPeerPublicKey(): boolean {
    return this.peerPublicKey !== undefined;
  }

  /**
   * Encrypt message
   * @param message - JSON-serializable message object
   */
  encrypt(message: Record<string, unknown>): { encrypted: string; nonce: string } {
    if (!this.peerPublicKey) {
      throw new Error('Peer public key not set');
    }

    const nonce = nacl.randomBytes(24);
    const messageStr = JSON.stringify(message);
    const messageUint8 = new TextEncoder().encode(messageStr);

    const encrypted = nacl.box(
      messageUint8,
      nonce,
      this.peerPublicKey,
      this.keyPair.secretKey
    );

    return {
      encrypted: uint8ArrayToBase64(encrypted),
      nonce: uint8ArrayToBase64(nonce),
    };
  }

  /**
   * Decrypt message
   * @param encryptedBase64 - Base64-encoded encrypted message
   * @param nonceBase64 - Base64-encoded nonce
   * @returns Decrypted message object
   */
  decrypt<T = Record<string, unknown>>(encryptedBase64: string, nonceBase64: string): T {
    if (!this.peerPublicKey) {
      throw new Error('Peer public key not set');
    }

    const encrypted = base64ToUint8Array(encryptedBase64);
    const nonce = base64ToUint8Array(nonceBase64);

    const decrypted = nacl.box.open(
      encrypted,
      nonce,
      this.peerPublicKey,
      this.keyPair.secretKey
    );

    if (!decrypted) {
      throw new Error('Decryption failed - invalid message or wrong keys');
    }

    const messageStr = new TextDecoder().decode(decrypted);
    return JSON.parse(messageStr) as T;
  }
}
