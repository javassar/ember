// Integration tests for the session manager coordinating DB persistence, state, and events.

import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  initializeSession,
  drawExtraItem,
  recordItemShown,
  finalizeItemDwell,
} from './sessionManager';
import {
  createItem,
  getEngineState,
  listEvents,
  saveSettings,
  closeDB,
  resetEngineState,
} from '../data';
import { DEFAULT_SETTINGS } from '../config';
import type { Item } from '../types';

describe('Session Manager (src/engine/sessionManager.ts)', () => {
  beforeEach(async () => {
    await closeDB();
    const indexedDB = globalThis.indexedDB;
    if (indexedDB) {
      await new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase('ember');
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      });
    }
    await resetEngineState();
    await saveSettings(DEFAULT_SETTINGS);
  });

  const mockItem = (id: string, mode: 'start' | 'charge' | 'rescue', type: 'core' | 'rotating'): Item => ({
    id,
    type: 'text',
    text: `Item ${id}`,
    modes: {
      start: mode === 'start' ? type : 'off',
      charge: mode === 'charge' ? type : 'off',
      rescue: mode === 'rescue' ? type : 'off',
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    retiredAt: null,
  });

  it('initializes a session, ordering core items first and tracking daily session count', async () => {
    await createItem(mockItem('c1', 'start', 'core'));
    await createItem(mockItem('r1', 'start', 'rotating'));
    await createItem(mockItem('r2', 'start', 'rotating'));
    await createItem(mockItem('r3', 'start', 'rotating'));

    const session1 = await initializeSession('start');
    expect(session1.sessionNumberToday).toBe(1);
    expect(session1.items.length).toBeGreaterThan(0);
    // Core item is first
    expect(session1.items[0].id).toBe('c1');

    // State should now record 1 session today
    const state1 = await getEngineState();
    expect(state1.sessionCounts.countToday).toBe(1);

    // Initializing a second session increments daily session count
    const session2 = await initializeSession('start');
    expect(session2.sessionNumberToday).toBe(2);
    const state2 = await getEngineState();
    expect(state2.sessionCounts.countToday).toBe(2);
    expect(state2.sessionCounts.modeCountsToday?.start).toBe(2);

    // Initializing charge for the first time gives charge count = 1 while total = 3
    await createItem(mockItem('ch1', 'charge', 'core'));
    const sessionCharge = await initializeSession('charge');
    expect(sessionCharge.sessionNumberToday).toBe(1);
    const state3 = await getEngineState();
    expect(state3.sessionCounts.countToday).toBe(3);
    expect(state3.sessionCounts.modeCountsToday?.charge).toBe(1);
  });

  it('draws an extra rotating item not currently in the session', async () => {
    await createItem(mockItem('r1', 'charge', 'rotating'));
    await createItem(mockItem('r2', 'charge', 'rotating'));
    await createItem(mockItem('r3', 'charge', 'rotating'));

    const currentIds = ['r1', 'r2'];
    const extra = await drawExtraItem('charge', currentIds);

    expect(extra).not.toBeNull();
    expect(extra?.id).toBe('r3');

    // When all items are already in the session, returns null
    const noExtra = await drawExtraItem('charge', ['r1', 'r2', 'r3']);
    expect(noExtra).toBeNull();
  });

  it('creates ShowEvent and updates dwell duration and helped flag', async () => {
    await createItem(mockItem('r1', 'start', 'rotating'));

    const ev = await recordItemShown('r1', 'start', 'ses_test');
    expect(ev.itemId).toBe('r1');
    expect(ev.dwellMs).toBe(0);
    expect(ev.helped).toBe(false);

    await finalizeItemDwell(ev.id, 4500, true);

    const allEvents = await listEvents();
    const updated = allEvents.find((e) => e.id === ev.id);
    expect(updated).toBeDefined();
    expect(updated?.dwellMs).toBe(4500);
    expect(updated?.helped).toBe(true);
  });
});
