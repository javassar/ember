// Cryptographic utilities using standard WebCrypto for salted PBKDF2-SHA256 PIN hashing.

import { PBKDF2_ITERATIONS } from '../config';
import type { PinConfig } from '../types';

// Converts a byte buffer to a hexadecimal string.
export function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

// Converts a hexadecimal string back to a Uint8Array byte buffer.
export function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

// Generates a random salt buffer of specified byte length.
export function generateSalt(length = 16): string {
  const salt = new Uint8Array(length);
  crypto.getRandomValues(salt);
  return bufferToHex(salt);
}

// Hashes a numeric PIN using salted PBKDF2-SHA256 with at least 200,000 iterations.
export async function hashPin(
  pin: string,
  saltHex?: string,
  iterations = PBKDF2_ITERATIONS
): Promise<PinConfig> {
  const salt = saltHex || generateSalt();
  const saltBuffer = hexToBuffer(salt);

  const encoder = new TextEncoder();
  const pinBuffer = encoder.encode(pin);

  // Import raw PIN as key material
  const baseKey = await crypto.subtle.importKey(
    'raw',
    pinBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  // Derive 256 bits (32 bytes) of hash using PBKDF2
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer as unknown as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    baseKey,
    256
  );

  return {
    salt,
    hash: bufferToHex(derivedBits),
    iterations,
    length: pin.length,
  };
}

// Verifies whether a candidate PIN matches the stored salt and hash.
export async function verifyPin(pin: string, config: PinConfig): Promise<boolean> {
  if (pin.length !== config.length) {
    return false;
  }
  const candidate = await hashPin(pin, config.salt, config.iterations);
  return candidate.hash === config.hash;
}
