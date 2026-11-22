// Unit tests for lock timeout decisions and exponential wrong-attempt lockout delay calculations.

import { describe, it, expect } from 'vitest';
import {
  shouldLock,
  computeWrongAttemptDelay,
  isBlocked,
  getRemainingBlockSeconds,
} from './lock';

describe('Lock Logic & Timeout Calculations', () => {
  it('determines when the app should lock based on timestamps', () => {
    const now = 100_000;

    // When no PIN is set, never lock
    expect(shouldLock(now - 50_000, now, 10_000, false)).toBe(false);

    // Timeout of 0ms means lock every time
    expect(shouldLock(now - 1, now, 0, true)).toBe(true);

    // Timeout elapsed
    expect(shouldLock(now - 300_000, now, 300_000, true)).toBe(true);
    expect(shouldLock(now - 350_000, now, 300_000, true)).toBe(true);

    // Within timeout window (do not lock)
    expect(shouldLock(now - 100_000, now, 300_000, true)).toBe(false);
  });

  it('computes exponential wrong attempt delays', () => {
    // Under 5 attempts: no delay
    expect(computeWrongAttemptDelay(0)).toBe(0);
    expect(computeWrongAttemptDelay(4)).toBe(0);

    // 5 attempts = 30 seconds
    expect(computeWrongAttemptDelay(5)).toBe(30_000);

    // 6 attempts = 60 seconds (doubling)
    expect(computeWrongAttemptDelay(6)).toBe(60_000);

    // 7 attempts = 120 seconds
    expect(computeWrongAttemptDelay(7)).toBe(120_000);

    // 8 attempts = 240 seconds
    expect(computeWrongAttemptDelay(8)).toBe(240_000);

    // 9 attempts = 480 seconds
    expect(computeWrongAttemptDelay(9)).toBe(480_000);

    // 10+ attempts capped at 15 minutes (900,000ms)
    expect(computeWrongAttemptDelay(10)).toBe(900_000);
    expect(computeWrongAttemptDelay(15)).toBe(900_000);
  });

  it('evaluates whether a lockout is active and formats remaining seconds', () => {
    const now = 50_000;
    const blockedUntil = 80_000;

    expect(isBlocked(blockedUntil, now)).toBe(true);
    expect(getRemainingBlockSeconds(blockedUntil, now)).toBe(30);

    // Expired lockout
    expect(isBlocked(now - 100, now)).toBe(false);
    expect(getRemainingBlockSeconds(now - 100, now)).toBe(0);
  });
});
