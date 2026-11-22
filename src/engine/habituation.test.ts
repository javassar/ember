// Unit tests for habituation tracking, per-mode stats, and the "Not landing" rule.

import { describe, it, expect } from 'vitest';
import { computeItemStats, findNotLandingItems } from './habituation';
import { calculateItemWeight } from './selection';
import type { ShowEvent, Item } from '../types';

describe('Habituation Engine (src/engine/habituation.ts)', () => {
  const createEvent = (
    id: string,
    itemId: string,
    mode: 'start' | 'charge' | 'rescue',
    shownAt: number,
    helped: boolean
  ): ShowEvent => ({
    id,
    itemId,
    mode,
    sessionId: `ses_${id}`,
    shownAt,
    dwellMs: 3000,
    helped,
  });

  const createItem = (id: string): Item => ({
    id,
    type: 'text',
    text: `Item ${id}`,
    modes: { start: 'rotating', charge: 'rotating', rescue: 'rotating' },
    createdAt: 1000,
    updatedAt: 1000,
    retiredAt: null,
  });

  it('aggregates per-mode statistics accurately without cross-mode leakage', () => {
    const events: ShowEvent[] = [
      createEvent('e1', 'item-1', 'start', 1000, true),
      createEvent('e2', 'item-1', 'start', 2000, false),
      createEvent('e3', 'item-1', 'charge', 3000, true),
      createEvent('e4', 'item-1', 'charge', 4000, true),
      createEvent('e5', 'item-1', 'rescue', 5000, false),
    ];

    const stats = computeItemStats('item-1', events);

    expect(stats.totalShows).toBe(5);
    expect(stats.totalHelped).toBe(3);
    expect(stats.lastShownAt).toBe(5000);

    // Start mode stats: 2 shows, 1 helped
    expect(stats.modes.start.shows).toBe(2);
    expect(stats.modes.start.helped).toBe(1);
    expect(stats.modes.start.lastShownAt).toBe(2000);

    // Charge mode stats: 2 shows, 2 helped
    expect(stats.modes.charge.shows).toBe(2);
    expect(stats.modes.charge.helped).toBe(2);
    expect(stats.modes.charge.lastShownAt).toBe(4000);

    // Rescue mode stats: 1 show, 0 helped
    expect(stats.modes.rescue.shows).toBe(1);
    expect(stats.modes.rescue.helped).toBe(0);
    expect(stats.modes.rescue.lastShownAt).toBe(5000);

    // Confirm that marking helped in Charge does NOT affect Start weight
    const now = 10_000;
    const startWeight = calculateItemWeight('item-1', events, 'start', now);
    const chargeWeight = calculateItemWeight('item-1', events, 'charge', now);

    // Start had 1 help -> 1 + 0.4 * 1 = 1.4
    expect(startWeight).toBeCloseTo(1.4);
    // Charge had 2 helps -> 1 + 0.4 * 2 = 1.8
    expect(chargeWeight).toBeCloseTo(1.8);
  });

  it('flags an item as "Not landing" when shown 8+ times in a mode with 0 helps', () => {
    // 8 shows in rescue, all unhelped
    const events: ShowEvent[] = Array.from({ length: 8 }).map((_, i) =>
      createEvent(`e-${i}`, 'item-rescue-struggle', 'rescue', 1000 + i * 100, false)
    );

    const stats = computeItemStats('item-rescue-struggle', events);

    expect(stats.modes.rescue.shows).toBe(8);
    expect(stats.modes.rescue.helped).toBe(0);
    expect(stats.modes.rescue.isNotLanding).toBe(true);
    expect(stats.notLandingModes).toEqual(['rescue']);
  });

  it('does NOT flag an item as "Not landing" if shown fewer than 8 times', () => {
    const events: ShowEvent[] = Array.from({ length: 7 }).map((_, i) =>
      createEvent(`e-${i}`, 'item-under-threshold', 'rescue', 1000 + i * 100, false)
    );

    const stats = computeItemStats('item-under-threshold', events);
    expect(stats.modes.rescue.shows).toBe(7);
    expect(stats.modes.rescue.isNotLanding).toBe(false);
    expect(stats.notLandingModes).toEqual([]);
  });

  it('does NOT flag an item as "Not landing" if it has at least one helped event', () => {
    const events: ShowEvent[] = Array.from({ length: 12 }).map((_, i) =>
      createEvent(`e-${i}`, 'item-has-help', 'rescue', 1000 + i * 100, i === 5)
    );

    const stats = computeItemStats('item-has-help', events);
    expect(stats.modes.rescue.shows).toBe(12);
    expect(stats.modes.rescue.helped).toBe(1);
    expect(stats.modes.rescue.isNotLanding).toBe(false);
    expect(stats.notLandingModes).toEqual([]);
  });

  it('finds all not-landing items across an item list', () => {
    const items = [createItem('item-a'), createItem('item-b'), createItem('item-c')];

    // item-a is not landing in start (8 unhelped shows)
    const eventsA = Array.from({ length: 8 }).map((_, i) =>
      createEvent(`ea-${i}`, 'item-a', 'start', 1000 + i, false)
    );

    // item-b is not landing in charge (9 unhelped shows)
    const eventsB = Array.from({ length: 9 }).map((_, i) =>
      createEvent(`eb-${i}`, 'item-b', 'charge', 2000 + i, false)
    );

    // item-c has 10 shows but 2 helps
    const eventsC = Array.from({ length: 10 }).map((_, i) =>
      createEvent(`ec-${i}`, 'item-c', 'start', 3000 + i, i < 2)
    );

    const notLandingMap = findNotLandingItems(items, [...eventsA, ...eventsB, ...eventsC]);

    expect(notLandingMap.size).toBe(2);
    expect(notLandingMap.get('item-a')).toEqual(['start']);
    expect(notLandingMap.get('item-b')).toEqual(['charge']);
    expect(notLandingMap.has('item-c')).toBe(false);
  });
});
