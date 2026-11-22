// Pure functions for lock timeout evaluation and exponential wrong-attempt lockout delays.

export interface LockState {
  wrongAttempts: number;
  blockedUntil: number; // Timestamp in milliseconds
}

// Decides whether the app should transition to the locked state based on elapsed time.
export function shouldLock(
  lastActiveAt: number,
  now: number,
  timeoutMs: number,
  hasPin: boolean
): boolean {
  if (!hasPin) {
    return false;
  }
  // 0ms timeout means lock immediately on every return
  if (timeoutMs === 0) {
    return true;
  }
  return now - lastActiveAt >= timeoutMs;
}

// Calculates exponential backoff lockout delay in milliseconds after failed attempts.
// 5 attempts = 30s, 6 = 60s, 7 = 120s, 8 = 240s, 9 = 480s, 10+ = 900s (15 min cap).
export function computeWrongAttemptDelay(attempts: number): number {
  if (attempts < 5) {
    return 0;
  }
  const baseDelayMs = 30_000; // 30 seconds for the 5th attempt
  const exponent = attempts - 5;
  const delay = baseDelayMs * Math.pow(2, exponent);
  const maxDelayMs = 900_000; // 15 minutes cap

  return Math.min(delay, maxDelayMs);
}

// Checks if the user is currently locked out from entering PIN attempts.
export function isBlocked(blockedUntil: number, now: number): boolean {
  return blockedUntil > now;
}

// Calculates the remaining lockout time in integer seconds.
export function getRemainingBlockSeconds(blockedUntil: number, now: number): number {
  if (blockedUntil <= now) {
    return 0;
  }
  return Math.ceil((blockedUntil - now) / 1000);
}
