// Unit tests for the selection engine pure functions.
// Verifies core inclusion, fixed/shuffled ordering, shuffle bag draws, refills,
// weighting boosts, daily refresh caching, and empty state handling.

import { describe, it, expect } from 'vitest';
import {
  filterEligibleItems,
  calculateItemWeight,
  orderCoreItems,
  drawWeightedItems,
  drawFromShuffleBag,
  buildSession,
  getLocalDateString,
} from './selection';
import type { Item, Mode, ModeConfig, ShowEvent } from '../types';

// Helper to create mock items
function createMockItem(
  id: string,
  modes: Partial<Record<Mode, 'off' | 'rotating' | 'core'>>,
  options: { retiredAt?: number | null; createdAt?: number } = {}
): Item {
  return {
    id,
    type: 'text',
    text: `Test item ${id}`,
    modes: {
      start: modes.start || 'off',
      charge: modes.charge || 'off',
      rescue: modes.rescue || 'off',
    },
    createdAt: options.createdAt ?? 1000,
    updatedAt: 1000,
    retiredAt: options.retiredAt ?? null,
  };
}

// Deterministic pseudo-random number generator for statistical tests
function createPseudoRandom(seed = 123456789) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe('Selection Engine (src/engine/selection.ts)', () => {
  const baseConfig: ModeConfig = {
    label: 'Start',
    description: 'Test mode',
    cue: 'Breathe',
    rotatingCount: 2,
    rotatingRefresh: 'each-session',
    coreOrder: 'fixed',
    coreOrderIds: [],
  };

  describe('filterEligibleItems', () => {
    it('excludes retired items regardless of membership', () => {
      const items: Item[] = [
        createMockItem('item-1', { start: 'core' }, { retiredAt: Date.now() }),
        createMockItem('item-2', { start: 'rotating' }, { retiredAt: 100 }),
        createMockItem('item-3', { start: 'core' }, { retiredAt: null }),
      ];

      const { core, rotating } = filterEligibleItems(items, 'start');
      expect(core.map((i) => i.id)).toEqual(['item-3']);
      expect(rotating).toEqual([]);
    });

    it('correctly splits active items into core and rotating pools', () => {
      const items: Item[] = [
        createMockItem('c1', { start: 'core' }),
        createMockItem('r1', { start: 'rotating' }),
        createMockItem('r2', { start: 'rotating' }),
        createMockItem('off1', { start: 'off' }),
      ];

      const { core, rotating } = filterEligibleItems(items, 'start');
      expect(core.map((i) => i.id)).toEqual(['c1']);
      expect(rotating.map((i) => i.id)).toEqual(['r1', 'r2']);
    });
  });

  describe('orderCoreItems', () => {
    it('orders core items in fixed order respecting coreOrderIds and sorting unlisted by creation date', () => {
      const items: Item[] = [
        createMockItem('c3', { start: 'core' }, { createdAt: 300 }),
        createMockItem('c1', { start: 'core' }, { createdAt: 100 }),
        createMockItem('c2', { start: 'core' }, { createdAt: 200 }),
        createMockItem('c4', { start: 'core' }, { createdAt: 50 }),
      ];

      // c2 then c1 are listed; c4 and c3 are unlisted
      const ordered = orderCoreItems(items, 'fixed', ['c2', 'c1']);
      expect(ordered.map((i) => i.id)).toEqual(['c2', 'c1', 'c4', 'c3']);
    });

    it('shuffles core items randomly when mode is set to shuffle', () => {
      const items: Item[] = [
        createMockItem('c1', { start: 'core' }),
        createMockItem('c2', { start: 'core' }),
        createMockItem('c3', { start: 'core' }),
        createMockItem('c4', { start: 'core' }),
        createMockItem('c5', { start: 'core' }),
      ];

      const prng = createPseudoRandom(42);
      const shuffled = orderCoreItems(items, 'shuffle', [], prng);

      expect(shuffled).toHaveLength(5);
      expect(new Set(shuffled.map((i) => i.id))).toEqual(new Set(['c1', 'c2', 'c3', 'c4', 'c5']));
      // With seed 42, order should differ from original
      expect(shuffled.map((i) => i.id)).not.toEqual(['c1', 'c2', 'c3', 'c4', 'c5']);
    });
  });

  describe('calculateItemWeight and drawWeightedItems', () => {
    it('calculates weight with helped boost capped at 5 within the 90-day window', () => {
      const now = 1_000_000_000;
      const recent = now - 10_000;
      const old = now - 95 * 24 * 60 * 60 * 1000; // 95 days ago (outside window)

      const events: ShowEvent[] = [
        { id: 'e1', itemId: 'item-1', mode: 'charge', sessionId: 's1', shownAt: recent, dwellMs: 5000, helped: true },
        { id: 'e2', itemId: 'item-1', mode: 'charge', sessionId: 's2', shownAt: recent, dwellMs: 4000, helped: true },
        { id: 'e3', itemId: 'item-1', mode: 'charge', sessionId: 's3', shownAt: old, dwellMs: 4000, helped: true }, // ignored (old)
        { id: 'e4', itemId: 'item-1', mode: 'start', sessionId: 's4', shownAt: recent, dwellMs: 4000, helped: true }, // ignored (different mode)
        { id: 'e5', itemId: 'item-1', mode: 'charge', sessionId: 's5', shownAt: recent, dwellMs: 4000, helped: false }, // not helped
      ];

      // item-1 has 2 valid helps in charge: 1 + 0.4 * 2 = 1.8
      const weightCharge = calculateItemWeight('item-1', events, 'charge', now);
      expect(weightCharge).toBeCloseTo(1.8);

      // item-1 has 1 valid help in start: 1 + 0.4 * 1 = 1.4
      const weightStart = calculateItemWeight('item-1', events, 'start', now);
      expect(weightStart).toBeCloseTo(1.4);

      // item without events has base weight 1.0
      const weightUnseen = calculateItemWeight('item-2', events, 'charge', now);
      expect(weightUnseen).toBe(1.0);
    });

    it('caps maximum boost at 5 helped events (weight 3.0)', () => {
      const now = 1_000_000_000;
      const events: ShowEvent[] = Array.from({ length: 10 }).map((_, i) => ({
        id: `e-${i}`,
        itemId: 'boosted',
        mode: 'charge',
        sessionId: `s-${i}`,
        shownAt: now - 1000,
        dwellMs: 3000,
        helped: true,
      }));

      // 1 + 0.4 * min(10, 5) = 1 + 2.0 = 3.0
      const weight = calculateItemWeight('boosted', events, 'charge', now);
      expect(weight).toBe(3.0);
    });

    it('statistically favors higher weighted items over many draws', () => {
      const items: Item[] = [
        createMockItem('boosted', { charge: 'rotating' }),
        createMockItem('normal', { charge: 'rotating' }),
      ];

      // boosted has weight 3.0, normal has weight 1.0. Probability of boosted being chosen first is 3 / 4 = 75%
      const weights = new Map([
        ['boosted', 3.0],
        ['normal', 1.0],
      ]);

      const prng = createPseudoRandom(999);
      let boostedCount = 0;
      const totalDraws = 2000;

      for (let i = 0; i < totalDraws; i++) {
        const drawn = drawWeightedItems(items, 1, weights, prng);
        if (drawn[0].id === 'boosted') {
          boostedCount++;
        }
      }

      const ratio = boostedCount / totalDraws;
      // Should be around 0.75 (within +-0.04)
      expect(ratio).toBeGreaterThan(0.71);
      expect(ratio).toBeLessThan(0.79);
    });
  });

  describe('drawFromShuffleBag', () => {
    it('draws without replacement and leaves remaining in the active bag', () => {
      const items = ['r1', 'r2', 'r3', 'r4'].map((id) =>
        createMockItem(id, { start: 'rotating' })
      );
      const weights = new Map<string, number>();

      const { drawnItems, updatedBag } = drawFromShuffleBag(
        ['r1', 'r2', 'r3', 'r4'],
        items,
        2,
        weights,
        () => 0 // deterministic pick of first
      );

      expect(drawnItems).toHaveLength(2);
      expect(updatedBag).toHaveLength(2);
      // Bag should only contain items not drawn
      for (const drawn of drawnItems) {
        expect(updatedBag).not.toContain(drawn.id);
      }
    });

    it('refills the bag when exhausted and completes requested draw', () => {
      const items = ['r1', 'r2', 'r3'].map((id) =>
        createMockItem(id, { start: 'rotating' })
      );
      const weights = new Map<string, number>();

      // Only 1 item left in the bag, but session needs 2
      const { drawnItems, updatedBag } = drawFromShuffleBag(
        ['r1'],
        items,
        2,
        weights,
        () => 0
      );

      expect(drawnItems).toHaveLength(2);
      expect(drawnItems.map((i) => i.id)).toContain('r1');
      // After drawing 2 items out of 3, the updated bag should hold the 1 remaining item
      expect(updatedBag).toHaveLength(1);
      expect(drawnItems.map((i) => i.id)).not.toContain(updatedBag[0]);
    });
  });

  describe('buildSession', () => {
    it('always places core items first, followed by rotating items', () => {
      const items: Item[] = [
        createMockItem('core-1', { start: 'core' }, { createdAt: 10 }),
        createMockItem('rot-1', { start: 'rotating' }),
        createMockItem('rot-2', { start: 'rotating' }),
      ];

      const result = buildSession({
        items,
        mode: 'start',
        config: baseConfig,
        events: [],
        persistedBag: ['rot-1', 'rot-2'],
        todayDateString: '2026-11-21',
        now: 1000,
      });

      expect(result.sessionItemIds[0]).toBe('core-1');
      expect(result.sessionItemIds).toHaveLength(3);
      expect(result.coreItemIds).toEqual(['core-1']);
      expect(result.rotatingItemIds).toHaveLength(2);
    });

    it('daily refresh returns identical rotating picks on the same day', () => {
      const items: Item[] = [
        createMockItem('rot-1', { start: 'rotating' }),
        createMockItem('rot-2', { start: 'rotating' }),
        createMockItem('rot-3', { start: 'rotating' }),
        createMockItem('rot-4', { start: 'rotating' }),
      ];

      const dailyConfig: ModeConfig = {
        ...baseConfig,
        rotatingCount: 2,
        rotatingRefresh: 'daily',
      };

      const firstOpen = buildSession({
        items,
        mode: 'start',
        config: dailyConfig,
        events: [],
        persistedBag: ['rot-1', 'rot-2', 'rot-3', 'rot-4'],
        todayDateString: '2026-11-21',
        now: 1000,
      });

      // Second open with the stored daily picks
      const secondOpen = buildSession({
        items,
        mode: 'start',
        config: dailyConfig,
        events: [],
        persistedBag: firstOpen.updatedBag,
        dailyPicks: firstOpen.newDailyPicks,
        todayDateString: '2026-11-21',
        now: 2000,
      });

      expect(secondOpen.rotatingItemIds).toEqual(firstOpen.rotatingItemIds);
    });

    it('daily refresh replaces an item if it was retired during the day', () => {
      const items: Item[] = [
        createMockItem('rot-1', { start: 'rotating' }),
        createMockItem('rot-2', { start: 'rotating' }, { retiredAt: 1500 }), // retired!
        createMockItem('rot-3', { start: 'rotating' }),
      ];

      const dailyConfig: ModeConfig = {
        ...baseConfig,
        rotatingCount: 2,
        rotatingRefresh: 'daily',
      };

      // Simulating earlier today: rot-1 and rot-2 were picked
      const previousPicks = {
        date: '2026-11-21',
        itemIds: ['rot-1', 'rot-2'],
      };

      const session = buildSession({
        items,
        mode: 'start',
        config: dailyConfig,
        events: [],
        persistedBag: ['rot-3'],
        dailyPicks: previousPicks,
        todayDateString: '2026-11-21',
        now: 2000,
      });

      expect(session.rotatingItemIds).toContain('rot-1');
      expect(session.rotatingItemIds).not.toContain('rot-2');
      expect(session.rotatingItemIds).toContain('rot-3');
      expect(session.rotatingItemIds).toHaveLength(2);
    });

    it('handles empty pool and partial pools without error', () => {
      const resultEmpty = buildSession({
        items: [],
        mode: 'start',
        config: baseConfig,
        events: [],
        persistedBag: [],
        todayDateString: '2026-11-21',
        now: 1000,
      });

      expect(resultEmpty.sessionItemIds).toEqual([]);

      // Pool with fewer items than requested
      const resultPartial = buildSession({
        items: [createMockItem('single', { start: 'rotating' })],
        mode: 'start',
        config: { ...baseConfig, rotatingCount: 5 },
        events: [],
        persistedBag: ['single'],
        todayDateString: '2026-11-21',
        now: 1000,
      });

      expect(resultPartial.sessionItemIds).toEqual(['single']);
    });
  });

  describe('getLocalDateString', () => {
    it('formats a date as YYYY-MM-DD', () => {
      const testDate = new Date(2026, 10, 21); // Month is 0-indexed: 10 = Nov
      expect(getLocalDateString(testDate)).toBe('2026-11-21');
    });
  });
});
