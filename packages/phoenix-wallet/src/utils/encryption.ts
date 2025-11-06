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

  constructor() {
    // Generate ephemeral key pair
    this.keyPair = nacl.box.keyPair();
  }

  /**
   * Get public key as base64 string
   */
  getPublicKey(): string {
    return uint8ArrayToBase64(this.keyPair.publicKey);
  }

  /**
   * Set peer's public key
   */
  setPeerPublicKey(publicKeyBase64: string): void {
    this.peerPublicKey = base64ToUint8Array(publicKeyBase64);
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
