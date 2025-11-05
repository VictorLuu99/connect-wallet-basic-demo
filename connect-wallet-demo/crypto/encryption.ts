/**
 * End-to-End Encryption Utilities using TweetNaCl (Curve25519)
 * React Native / Expo compatible
 *
 * Provides authenticated encryption for WalletConnect demo.
 * Backend cannot read message content - zero-trust architecture.
 */

import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';
import * as Crypto from 'expo-crypto';

// Configure TweetNaCl to use Expo's crypto for random number generation
// This is required for React Native as it doesn't have built-in crypto.getRandomValues()
nacl.setPRNG((x: Uint8Array, n: number) => {
  // Use Expo's crypto to fill the array with random bytes
  const randomBytes = Crypto.getRandomBytes(n);
  for (let i = 0; i < n; i++) {
    x[i] = randomBytes[i];
  }
});

/**
 * Key pair type for TypeScript
 */
export interface KeyPair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

/**
 * Encrypted message format
 */
export interface EncryptedMessage {
  encryptedPayload: string;
  nonce: string;
}

/**
 * Generate ephemeral Curve25519 key pair for this session
 * @returns Key pair with public and secret keys
 */
export function generateKeyPair() {
  return nacl.box.keyPair();
}


/**
 * Encrypt message with authenticated encryption (nacl.box)
 * @param message - Plain message object to encrypt
 * @param peerPublicKey - Recipient's public key
 * @param mySecretKey - My secret key
 * @returns Encrypted payload and nonce (base64-encoded)
 */
export function encryptMessage(
  message: any,
  peerPublicKey: Uint8Array,
  mySecretKey: Uint8Array
): EncryptedMessage {
  // Generate random nonce (24 bytes)
  const nonce = nacl.randomBytes(nacl.box.nonceLength);

  // Convert message to Uint8Array
  const messageString = JSON.stringify(message);
  const messageUint8 = new TextEncoder().encode(messageString);

  // Encrypt with nacl.box (Curve25519 + XSalsa20-Poly1305)
  const encrypted = nacl.box(messageUint8, nonce, peerPublicKey, mySecretKey);

  if (!encrypted) {
    throw new Error('Encryption failed');
  }

  // Return base64-encoded encrypted data and nonce
  return {
    encryptedPayload: encodeBase64(encrypted),
    nonce: encodeBase64(nonce)
  };
}

/**
 * Decrypt message with authenticated encryption (nacl.box.open)
 * @param encryptedPayload - Base64-encoded encrypted data
 * @param nonce - Base64-encoded nonce
 * @param peerPublicKey - Sender's public key
 * @param mySecretKey - My secret key
 * @returns Decrypted message object
 * @throws Error if decryption fails (wrong key or tampered data)
 */
export function decryptMessage(
  encryptedPayload: string,
  nonce: string,
  peerPublicKey: Uint8Array,
  mySecretKey: Uint8Array
): any {
  // Decode base64 to Uint8Array
  const encryptedUint8 = decodeBase64(encryptedPayload);
  const nonceUint8 = decodeBase64(nonce);

  // Decrypt with nacl.box.open
  const decrypted = nacl.box.open(encryptedUint8, nonceUint8, peerPublicKey, mySecretKey);

  if (!decrypted) {
    throw new Error('Decryption failed - invalid key or tampered data');
  }

  // Convert Uint8Array back to string and parse JSON
  const messageString = new TextDecoder().decode(decrypted);
  return JSON.parse(messageString);
}

/**
 * Verify message timestamp for replay protection
 * @param timestamp - Message timestamp in milliseconds
 * @param maxAgeMs - Maximum allowed age (default: 5 minutes)
 * @returns True if timestamp is valid
 */
export function verifyTimestamp(timestamp: number, maxAgeMs: number = 5 * 60 * 1000): boolean {
  const now = Date.now();
  const age = now - timestamp;

  // Check if timestamp is not too old
  if (age > maxAgeMs) {
    return false;
  }

  // Check if timestamp is not from the future (allow 1 min clock skew)
  if (age < -60 * 1000) {
    return false;
  }

  return true;
}

/**
 * Convert Uint8Array public key to base64 string (for QR code)
 * @param publicKey - Public key bytes
 * @returns Base64-encoded public key
 */
export function publicKeyToBase64(publicKey: Uint8Array): string {
  return encodeBase64(publicKey);
}

/**
 * Convert base64 string to Uint8Array public key (from QR code)
 * @param base64PublicKey - Base64-encoded public key
 * @returns Public key bytes
 */
export function base64ToPublicKey(base64PublicKey: string): Uint8Array {
  return decodeBase64(base64PublicKey);
}

/**
 * Generate cryptographically secure random bytes
 * @param length - Number of bytes to generate
 * @returns Random bytes
 */
export function randomBytes(length: number): Uint8Array {
  return nacl.randomBytes(length);
}

/**
 * Generate cryptographically secure UUID v4 (for session identification)
 * @returns UUID v4 string
 */
export function generateUUID(): string {
  // Generate 16 random bytes
  const bytes = nacl.randomBytes(16);

  // Set version (4) and variant bits
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10

  // Convert to UUID string format
  const hex = Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
