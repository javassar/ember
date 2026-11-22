// Unit tests for WebCrypto PBKDF2 PIN hashing, salt generation, and verification.

import { describe, it, expect } from 'vitest';
import { hashPin, verifyPin, generateSalt, bufferToHex, hexToBuffer } from './crypto';

describe('WebCrypto PIN Hashing', () => {
  it('converts byte buffers to and from hex strings accurately', () => {
    const raw = new Uint8Array([0, 15, 255, 128, 42]);
    const hex = bufferToHex(raw);
    expect(hex).toBe('000fff802a');

    const restored = hexToBuffer(hex);
    expect(Array.from(restored)).toEqual(Array.from(raw));
  });

  it('generates unique random salts', () => {
    const salt1 = generateSalt();
    const salt2 = generateSalt();
    expect(salt1).not.toBe(salt2);
    expect(salt1.length).toBe(32); // 16 bytes = 32 hex chars
  });

  it('hashes a PIN and produces valid salt, hash, and length metadata', async () => {
    const pin = '1234';
    const config = await hashPin(pin, undefined, 200_000);

    expect(config.salt).toBeDefined();
    expect(config.hash).toBeDefined();
    expect(config.hash.length).toBe(64); // 256 bits = 64 hex chars
    expect(config.iterations).toBe(200_000);
    expect(config.length).toBe(4);
  });

  it('verifies a correct PIN successfully', async () => {
    const pin = '58291';
    const config = await hashPin(pin);

    const isMatch = await verifyPin(pin, config);
    expect(isMatch).toBe(true);
  });

  it('rejects an incorrect PIN', async () => {
    const pin = '1234';
    const config = await hashPin(pin);

    const isMatch = await verifyPin('9999', config);
    expect(isMatch).toBe(false);

    const isWrongLength = await verifyPin('12345', config);
    expect(isWrongLength).toBe(false);
  });
});
