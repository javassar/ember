// Global React context providing lock state management, inactivity tracking, and PIN verification.

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getSettings, saveSettings } from '../data/settingsRepo';
import {
  getPersistedLockState,
  savePersistedLockState,
  resetPersistedLockState,
  type PersistedLockState,
} from '../data/stateRepo';
import { clearAllData } from '../data/sampleContent';
import { verifyPin, hashPin } from '../lib/crypto';
import { shouldLock, computeWrongAttemptDelay, isBlocked, getRemainingBlockSeconds } from '../lib/lock';
import type { Settings } from '../types';

const LAST_ACTIVE_KEY = 'ember_last_active_at';

export interface LockContextValue {
  isLocked: boolean;
  hasPin: boolean;
  pinLength: number;
  settings: Settings | null;
  lockState: PersistedLockState;
  remainingBlockSeconds: number;
  verifyAttempt: (pin: string) => Promise<{ success: boolean; remainingSeconds?: number; attempts: number }>;
  lockApp: () => void;
  setPin: (newPin: string | null) => Promise<void>;
  setTimeoutMs: (timeoutMs: number) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  resetAndErase: () => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const LockContext = createContext<LockContextValue | null>(null);

export const LockProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [lockState, setLockState] = useState<PersistedLockState>({ wrongAttempts: 0, blockedUntil: 0 });
  const [remainingBlockSeconds, setRemainingBlockSeconds] = useState<number>(0);
  const lastActiveRef = useRef<number>(Date.now());

  const refreshSettings = useCallback(async () => {
    try {
      const current = await getSettings();
      setSettings(current);
      const pLock = await getPersistedLockState();
      setLockState(pLock);

      // Check initial lock status on cold startup
      if (current.pin) {
        const storedLastActive = localStorage.getItem(LAST_ACTIVE_KEY);
        const lastActiveTime = storedLastActive ? Number(storedLastActive) : 0;
        const now = Date.now();
        if (shouldLock(lastActiveTime, now, current.lockTimeoutMs, true)) {
          setIsLocked(true);
        }
      }
    } catch (err) {
      console.error('Failed to initialize lock settings:', err);
    }
  }, []);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  // Update lastActive timestamp on user interaction
  const touchActivity = useCallback(() => {
    const now = Date.now();
    lastActiveRef.current = now;
    localStorage.setItem(LAST_ACTIVE_KEY, String(now));
  }, []);

  useEffect(() => {
    const events = ['pointerdown', 'keydown', 'touchstart'];
    let lastThrottled = 0;

    const onUserAction = () => {
      const now = Date.now();
      if (now - lastThrottled > 2000) {
        lastThrottled = now;
        touchActivity();
      }
    };

    events.forEach((ev) => window.addEventListener(ev, onUserAction, { passive: true }));
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, onUserAction));
    };
  }, [touchActivity]);

  // Handle visibility changes (backgrounding / foregrounding)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        // App backgrounded
        touchActivity();
      } else if (document.visibilityState === 'visible') {
        // App returning to foreground
        if (settings?.pin) {
          const stored = localStorage.getItem(LAST_ACTIVE_KEY);
          const lastActive = stored ? Number(stored) : lastActiveRef.current;
          const now = Date.now();

          if (shouldLock(lastActive, now, settings.lockTimeoutMs, true)) {
            setIsLocked(true);
          }
        }
        touchActivity();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', touchActivity);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', touchActivity);
    };
  }, [settings, touchActivity]);

  // Lockout countdown timer
  useEffect(() => {
    if (!isBlocked(lockState.blockedUntil, Date.now())) {
      setRemainingBlockSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const secs = getRemainingBlockSeconds(lockState.blockedUntil, now);
      setRemainingBlockSeconds(secs);
      if (secs <= 0) {
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [lockState.blockedUntil]);

  const verifyAttempt = async (
    pin: string
  ): Promise<{ success: boolean; remainingSeconds?: number; attempts: number }> => {
    const now = Date.now();
    if (isBlocked(lockState.blockedUntil, now)) {
      const remaining = getRemainingBlockSeconds(lockState.blockedUntil, now);
      return { success: false, remainingSeconds: remaining, attempts: lockState.wrongAttempts };
    }

    if (!settings?.pin) {
      setIsLocked(false);
      return { success: true, attempts: 0 };
    }

    const isMatch = await verifyPin(pin, settings.pin);
    if (isMatch) {
      await resetPersistedLockState();
      setLockState({ wrongAttempts: 0, blockedUntil: 0 });
      setIsLocked(false);
      touchActivity();
      return { success: true, attempts: 0 };
    }

    // Wrong attempt
    const newAttempts = lockState.wrongAttempts + 1;
    const delayMs = computeWrongAttemptDelay(newAttempts);
    const newBlockedUntil = delayMs > 0 ? now + delayMs : 0;
    const updatedState: PersistedLockState = {
      wrongAttempts: newAttempts,
      blockedUntil: newBlockedUntil,
    };

    await savePersistedLockState(updatedState);
    setLockState(updatedState);

    const remainingSecs = delayMs > 0 ? Math.ceil(delayMs / 1000) : undefined;
    return { success: false, remainingSeconds: remainingSecs, attempts: newAttempts };
  };

  const lockApp = () => {
    if (settings?.pin) {
      setIsLocked(true);
    }
  };

  const setPin = async (newPin: string | null) => {
    if (!newPin) {
      await saveSettings({ pin: null });
      await resetPersistedLockState();
      setIsLocked(false);
      await refreshSettings();
      return;
    }

    const hashed = await hashPin(newPin);
    await saveSettings({ pin: hashed });
    await resetPersistedLockState();
    await refreshSettings();
  };

  const setTimeoutMs = async (timeoutMs: number) => {
    const updated = await saveSettings({ lockTimeoutMs: timeoutMs });
    setSettings(updated);
  };

  const completeOnboarding = async () => {
    const updated = await saveSettings({ onboardingDone: true });
    setSettings(updated);
  };

  const resetAndErase = async () => {
    await clearAllData();
    await resetPersistedLockState();
    localStorage.removeItem(LAST_ACTIVE_KEY);
    setIsLocked(false);
    await refreshSettings();
  };

  const value: LockContextValue = {
    isLocked,
    hasPin: settings?.pin !== null,
    pinLength: settings?.pin?.length ?? 4,
    settings,
    lockState,
    remainingBlockSeconds,
    verifyAttempt,
    lockApp,
    setPin,
    setTimeoutMs,
    completeOnboarding,
    resetAndErase,
    refreshSettings,
  };

  return <LockContext.Provider value={value}>{children}</LockContext.Provider>;
};

export const useLock = (): LockContextValue => {
  const ctx = useContext(LockContext);
  if (!ctx) {
    throw new Error('useLock must be used within a LockProvider');
  }
  return ctx;
};
