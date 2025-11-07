import nacl from 'tweetnacl';
import * as naclUtil from 'tweetnacl-util';

/**
 * Helper function to convert Uint8Array to base64
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  if (typeof window !== 'undefined' && window.btoa) {
    // Browser environment - handle large arrays by chunking
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    return window.btoa(binary);
  }
  // Node.js environment (fallback)
  return Buffer.from(bytes).toString('base64');
}

/**
 * Helper function to convert base64 to Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array {
  if (typeof window !== 'undefined' && window.atob) {
    // Browser environment
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  // Node.js environment (fallback)
  return new Uint8Array(Buffer.from(base64, 'base64'));
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
   */
  encrypt(message: any): { encrypted: string; nonce: string } {
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
   */
  decrypt(encryptedBase64: string, nonceBase64: string): any {
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
    return JSON.parse(messageStr);
  }
}
