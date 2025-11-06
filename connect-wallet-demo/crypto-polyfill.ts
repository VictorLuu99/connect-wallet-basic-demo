/**
 * Crypto polyfill for React Native
 * Sets up crypto.getRandomValues for TweetNaCl before SDK usage
 * Also configures TweetNaCl directly using setPRNG
 * 
 * This must be imported BEFORE any SDK imports that use TweetNaCl
 */

import * as Crypto from 'expo-crypto';
import nacl from 'tweetnacl';

// Set up crypto.getRandomValues polyfill for TweetNaCl
// This is required because React Native doesn't have built-in crypto.getRandomValues
if (typeof global.crypto === 'undefined' || !global.crypto.getRandomValues) {
  const getRandomValues = (array: Uint8Array | Int32Array | Uint16Array): Uint8Array | Int32Array | Uint16Array => {
    const bytes = Crypto.getRandomBytes(array.length);
    // Copy random bytes into the array
    for (let i = 0; i < array.length; i++) {
      array[i] = bytes[i];
    }
    return array;
  };

  global.crypto = {
    ...(global.crypto || {}),
    getRandomValues,
  } as any;
  
  console.log('[Crypto Polyfill] crypto.getRandomValues polyfill initialized');
}

// Also configure TweetNaCl directly using setPRNG (more reliable)
// This ensures TweetNaCl uses Expo's crypto even if global.crypto isn't detected
nacl.setPRNG((x: Uint8Array, n: number) => {
  // Use Expo's crypto to fill the array with random bytes
  const randomBytes = Crypto.getRandomBytes(n);
  for (let i = 0; i < n; i++) {
    x[i] = randomBytes[i];
  }
});

console.log('[Crypto Polyfill] TweetNaCl PRNG configured');

// Verify polyfill is set up
if (typeof global.crypto?.getRandomValues === 'function') {
  // Test that it works
  try {
    const testArray = new Uint8Array(10);
    global.crypto.getRandomValues(testArray);
    console.log('[Crypto Polyfill] Polyfill verified and working');
  } catch (error) {
    console.error('[Crypto Polyfill] Polyfill verification failed:', error);
  }
} else {
  console.error('[Crypto Polyfill] WARNING: crypto.getRandomValues not available!');
}
