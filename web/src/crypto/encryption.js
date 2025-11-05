/**
 * End-to-End Encryption Utilities using TweetNaCl (Curve25519)
 *
 * Provides authenticated encryption for WalletConnect demo.
 * Backend cannot read message content - zero-trust architecture.
 */

import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';

/**
 * Generate ephemeral Curve25519 key pair for this session
 * @returns {{ publicKey: Uint8Array, secretKey: Uint8Array }}
 */
export function generateKeyPair() {
  return nacl.box.keyPair();
}

/**
 * Encrypt message with authenticated encryption (nacl.box)
 * @param {object} message - Plain message object to encrypt
 * @param {Uint8Array} peerPublicKey - Recipient's public key
 * @param {Uint8Array} mySecretKey - My secret key
 * @returns {{ encryptedPayload: string, nonce: string }}
 */
export function encryptMessage(message, peerPublicKey, mySecretKey) {
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
 * @param {string} encryptedPayload - Base64-encoded encrypted data
 * @param {string} nonce - Base64-encoded nonce
 * @param {Uint8Array} peerPublicKey - Sender's public key
 * @param {Uint8Array} mySecretKey - My secret key
 * @returns {object} Decrypted message object
 * @throws {Error} If decryption fails (wrong key or tampered data)
 */
export function decryptMessage(encryptedPayload, nonce, peerPublicKey, mySecretKey) {
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
 * @param {number} timestamp - Message timestamp in milliseconds
 * @param {number} maxAgeMs - Maximum allowed age (default: 5 minutes)
 * @returns {boolean} True if timestamp is valid
 */
export function verifyTimestamp(timestamp, maxAgeMs = 5 * 60 * 1000) {
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
 * @param {Uint8Array} publicKey - Public key bytes
 * @returns {string} Base64-encoded public key
 */
export function publicKeyToBase64(publicKey) {
  return encodeBase64(publicKey);
}

/**
 * Convert base64 string to Uint8Array public key (from QR code)
 * @param {string} base64PublicKey - Base64-encoded public key
 * @returns {Uint8Array} Public key bytes
 */
export function base64ToPublicKey(base64PublicKey) {
  return decodeBase64(base64PublicKey);
}

/**
 * Generate cryptographically secure UUID (for session identification)
 * @returns {string} UUID v4
 */
export function generateUUID() {
  // Use browser's crypto.randomUUID() if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback: generate UUID v4 manually
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
