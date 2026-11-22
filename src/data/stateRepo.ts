// Repository for persisting selection engine shuffle bags and daily pick states.

import { getDB } from './db';
import type { EngineState } from '../types';

const STATE_KEY = 'engine_state';

export const DEFAULT_ENGINE_STATE: EngineState = {
  bags: {
    start: [],
    charge: [],
    rescue: [],
  },
  dailyPicks: {
    start: { date: '', itemIds: [] },
    charge: { date: '', itemIds: [] },
    rescue: { date: '', itemIds: [] },
  },
  sessionCounts: {
    lastSessionDate: '',
    countToday: 0,
    modeCountsToday: {
      start: 0,
      charge: 0,
      rescue: 0,
    },
  },
};

// Retrieve selection engine state, initializing defaults if absent.
export async function getEngineState(): Promise<EngineState> {
  const db = await getDB();
  const record = await db.get('state', STATE_KEY);

  if (record) {
    const rec = record as unknown as Partial<EngineState>;
    const state: EngineState = {
      ...DEFAULT_ENGINE_STATE,
      ...rec,
      sessionCounts: {
        ...DEFAULT_ENGINE_STATE.sessionCounts,
        ...(rec.sessionCounts || {}),
        modeCountsToday: {
          ...DEFAULT_ENGINE_STATE.sessionCounts.modeCountsToday!,
          ...(rec.sessionCounts?.modeCountsToday || {}),
        },
      },
      bags: {
        ...DEFAULT_ENGINE_STATE.bags,
        ...(rec.bags || {}),
      },
      dailyPicks: {
        ...DEFAULT_ENGINE_STATE.dailyPicks,
        ...(rec.dailyPicks || {}),
      },
    };
    delete (state as { id?: string }).id;
    return state;
  }

  const initial = { ...DEFAULT_ENGINE_STATE, id: STATE_KEY };
  await db.put('state', initial);
  return DEFAULT_ENGINE_STATE;
}

// Save engine state updates.
export async function saveEngineState(updates: Partial<EngineState>): Promise<EngineState> {
  const db = await getDB();
  const current = await getEngineState();

  const merged: EngineState = {
    ...current,
    ...updates,
  };

  await db.put('state', { ...merged, id: STATE_KEY });
  return merged;
}

// Reset engine state to initial blank bags and picks.
export async function resetEngineState(): Promise<EngineState> {
  const db = await getDB();
  await db.put('state', { ...DEFAULT_ENGINE_STATE, id: STATE_KEY });
  return DEFAULT_ENGINE_STATE;
}

// Lock state persistence for lockout delays across reloads.
const LOCK_STATE_KEY = 'lock_state';

export interface PersistedLockState {
  wrongAttempts: number;
  blockedUntil: number;
}

export const DEFAULT_LOCK_STATE: PersistedLockState = {
  wrongAttempts: 0,
  blockedUntil: 0,
};

export async function getPersistedLockState(): Promise<PersistedLockState> {
  const db = await getDB();
  const record = await db.get('state', LOCK_STATE_KEY);
  if (record && 'wrongAttempts' in record) {
    return {
      wrongAttempts: record.wrongAttempts,
      blockedUntil: record.blockedUntil,
    };
  }
  return DEFAULT_LOCK_STATE;
}

export async function savePersistedLockState(state: PersistedLockState): Promise<void> {
  const db = await getDB();
  await db.put('state', { ...state, id: LOCK_STATE_KEY });
}

export async function resetPersistedLockState(): Promise<void> {
  const db = await getDB();
  await db.put('state', { ...DEFAULT_LOCK_STATE, id: LOCK_STATE_KEY });
}
