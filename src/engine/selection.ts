// Pure session selection engine implementing weighted shuffle bags, core ordering, and daily refresh policies.
// All functions are deterministic and take an injected random-number generator for unit testability.

import type { Item, Mode, ModeConfig, ShowEvent } from '../types';
import {
  HELPED_BOOST_PER_HELP,
  HELPED_BOOST_CAP,
  HELPED_WINDOW_DAYS,
} from '../config';

export interface EligiblePools {
  core: Item[];
  rotating: Item[];
}

export interface BuildSessionParams {
  items: Item[];
  mode: Mode;
  config: ModeConfig;
  events: ShowEvent[];
  persistedBag: string[];
  dailyPicks?: { date: string; itemIds: string[] };
  todayDateString: string;
  now: number;
  randomFn?: () => number;
}

export interface BuildSessionResult {
  sessionItemIds: string[];
  coreItemIds: string[];
  rotatingItemIds: string[];
  updatedBag: string[];
  newDailyPicks?: { date: string; itemIds: string[] };
}

// Formats a Date instance as YYYY-MM-DD using the device's local calendar day.
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Filters items to those eligible for the given mode (not retired, core or rotating).
export function filterEligibleItems(items: Item[], mode: Mode): EligiblePools {
  const core: Item[] = [];
  const rotating: Item[] = [];

  for (const item of items) {
    if (item.retiredAt !== null) {
      continue;
    }
    const membership = item.modes[mode];
    if (membership === 'core') {
      core.push(item);
    } else if (membership === 'rotating') {
      rotating.push(item);
    }
  }

  return { core, rotating };
}

// Calculates selection weight for a rotating item based on recent "helped" events.
// Weight = 1 + HELPED_BOOST_PER_HELP * min(helpedCount, HELPED_BOOST_CAP)
export function calculateItemWeight(
  itemId: string,
  events: ShowEvent[],
  mode: Mode,
  now: number
): number {
  const windowMs = HELPED_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const cutoff = now - windowMs;

  let helpedCount = 0;
  for (const ev of events) {
    if (
      ev.itemId === itemId &&
      ev.mode === mode &&
      ev.helped &&
      ev.shownAt >= cutoff
    ) {
      helpedCount++;
    }
  }

  const cappedHelped = Math.min(helpedCount, HELPED_BOOST_CAP);
  return 1 + HELPED_BOOST_PER_HELP * cappedHelped;
}

// Orders core items: 'fixed' respects coreOrderIds (unlisted items appended by creation date), 'shuffle' randomizes.
export function orderCoreItems(
  coreItems: Item[],
  coreOrder: 'fixed' | 'shuffle',
  coreOrderIds: string[] = [],
  randomFn: () => number = Math.random
): Item[] {
  if (coreItems.length <= 1) {
    return [...coreItems];
  }

  if (coreOrder === 'shuffle') {
    const shuffled = [...coreItems];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(randomFn() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Fixed order: items in coreOrderIds appear first by their listed index.
  // Unlisted items appear at the end, ordered by creation date ascending.
  const idToIndex = new Map<string, number>();
  coreOrderIds.forEach((id, idx) => idToIndex.set(id, idx));

  return [...coreItems].sort((a, b) => {
    const idxA = idToIndex.has(a.id) ? idToIndex.get(a.id)! : Number.MAX_SAFE_INTEGER;
    const idxB = idToIndex.has(b.id) ? idToIndex.get(b.id)! : Number.MAX_SAFE_INTEGER;

    if (idxA !== idxB) {
      return idxA - idxB;
    }
    return a.createdAt - b.createdAt;
  });
}

// Draws N items from a pool using weighted selection without replacement.
export function drawWeightedItems(
  pool: Item[],
  count: number,
  weightsMap: Map<string, number>,
  randomFn: () => number = Math.random
): Item[] {
  if (pool.length <= count) {
    return [...pool];
  }

  const remaining = [...pool];
  const selected: Item[] = [];

  while (selected.length < count && remaining.length > 0) {
    const totalWeight = remaining.reduce(
      (sum, item) => sum + (weightsMap.get(item.id) || 1),
      0
    );

    let threshold = randomFn() * totalWeight;
    let chosenIndex = 0;

    for (let i = 0; i < remaining.length; i++) {
      const w = weightsMap.get(remaining[i].id) || 1;
      threshold -= w;
      if (threshold <= 0) {
        chosenIndex = i;
        break;
      }
    }

    selected.push(remaining[chosenIndex]);
    remaining.splice(chosenIndex, 1);
  }

  return selected;
}

// Draws rotating items from the persisted shuffle bag with automatic refilling.
export function drawFromShuffleBag(
  persistedBag: string[],
  allEligibleRotating: Item[],
  count: number,
  weightsMap: Map<string, number>,
  randomFn: () => number = Math.random
): { drawnItems: Item[]; updatedBag: string[] } {
  if (allEligibleRotating.length <= count) {
    return {
      drawnItems: [...allEligibleRotating],
      updatedBag: [],
    };
  }

  const eligibleIdsSet = new Set(allEligibleRotating.map((item) => item.id));

  // Clean persisted bag: remove retired or deleted items
  let activeBag = persistedBag.filter((id) => eligibleIdsSet.has(id));

  // If bag is completely empty, initialize it with all eligible rotating items
  if (activeBag.length === 0) {
    activeBag = allEligibleRotating.map((item) => item.id);
  }

  const drawn: Item[] = [];
  const drawnIdsSet = new Set<string>();

  // Helper map from id to item
  const itemMap = new Map<string, Item>();
  allEligibleRotating.forEach((item) => itemMap.set(item.id, item));

  // Phase 1: Draw from current bag
  const bagItems = activeBag.map((id) => itemMap.get(id)!).filter(Boolean);
  const firstDraw = drawWeightedItems(
    bagItems,
    Math.min(count, bagItems.length),
    weightsMap,
    randomFn
  );

  firstDraw.forEach((item) => {
    drawn.push(item);
    drawnIdsSet.add(item.id);
  });

  // Remove drawn IDs from active bag
  activeBag = activeBag.filter((id) => !drawnIdsSet.has(id));

  // Phase 2: If bag was exhausted before reaching requested count, refill and draw remainder
  const needed = count - drawn.length;
  if (needed > 0) {
    // Refill bag with all eligible items excluding those already drawn in this session
    const refillItems = allEligibleRotating.filter((item) => !drawnIdsSet.has(item.id));
    const secondDraw = drawWeightedItems(
      refillItems,
      Math.min(needed, refillItems.length),
      weightsMap,
      randomFn
    );

    secondDraw.forEach((item) => {
      drawn.push(item);
      drawnIdsSet.add(item.id);
    });

    // New active bag is all eligible items minus everything drawn in this session
    activeBag = allEligibleRotating
      .map((item) => item.id)
      .filter((id) => !drawnIdsSet.has(id));
  }

  return {
    drawnItems: drawn,
    updatedBag: activeBag,
  };
}

// Pure master function to build a session for a given mode according to all spec rules.
export function buildSession({
  items,
  mode,
  config,
  events,
  persistedBag,
  dailyPicks,
  todayDateString,
  now,
  randomFn = Math.random,
}: BuildSessionParams): BuildSessionResult {
  const { core: eligibleCore, rotating: eligibleRotating } = filterEligibleItems(items, mode);

  // 1. Order Core items (always first in session)
  const orderedCore = orderCoreItems(
    eligibleCore,
    config.coreOrder,
    config.coreOrderIds,
    randomFn
  );
  const coreItemIds = orderedCore.map((i) => i.id);

  // Build weights map for rotating items
  const weightsMap = new Map<string, number>();
  for (const rotItem of eligibleRotating) {
    const weight = calculateItemWeight(rotItem.id, events, mode, now);
    weightsMap.set(rotItem.id, weight);
  }

  let rotatingItemIds: string[] = [];
  let updatedBag = [...persistedBag];
  let newDailyPicks = dailyPicks;

  // 2. Handle Daily Refresh policy
  if (config.rotatingRefresh === 'daily') {
    const isSameDay = dailyPicks && dailyPicks.date === todayDateString;
    const eligibleIdsSet = new Set(eligibleRotating.map((i) => i.id));

    if (isSameDay && dailyPicks.itemIds.length > 0) {
      // Reuse stored picks, but replace any items that have been retired or deleted
      const validStoredIds: string[] = [];
      let missingCount = 0;

      for (const id of dailyPicks.itemIds) {
        if (eligibleIdsSet.has(id)) {
          validStoredIds.push(id);
        } else {
          missingCount++;
        }
      }

      if (missingCount === 0 && validStoredIds.length === config.rotatingCount) {
        rotatingItemIds = validStoredIds;
      } else {
        // Draw replacements for retired or missing items
        const remainingCandidates = eligibleRotating.filter(
          (item) => !validStoredIds.includes(item.id)
        );
        const { drawnItems, updatedBag: nextBag } = drawFromShuffleBag(
          persistedBag,
          remainingCandidates,
          missingCount + Math.max(0, config.rotatingCount - validStoredIds.length),
          weightsMap,
          randomFn
        );

        rotatingItemIds = [...validStoredIds, ...drawnItems.map((i) => i.id)];
        updatedBag = nextBag;
        newDailyPicks = {
          date: todayDateString,
          itemIds: rotatingItemIds,
        };
      }
    } else {
      // First open of the local day: generate fresh weighted draw
      const { drawnItems, updatedBag: nextBag } = drawFromShuffleBag(
        persistedBag,
        eligibleRotating,
        config.rotatingCount,
        weightsMap,
        randomFn
      );

      rotatingItemIds = drawnItems.map((i) => i.id);
      updatedBag = nextBag;
      newDailyPicks = {
        date: todayDateString,
        itemIds: rotatingItemIds,
      };
    }
  } else {
    // Each-session refresh policy: fresh draw every session
    const { drawnItems, updatedBag: nextBag } = drawFromShuffleBag(
      persistedBag,
      eligibleRotating,
      config.rotatingCount,
      weightsMap,
      randomFn
    );

    rotatingItemIds = drawnItems.map((i) => i.id);
    updatedBag = nextBag;
  }

  return {
    sessionItemIds: [...coreItemIds, ...rotatingItemIds],
    coreItemIds,
    rotatingItemIds,
    updatedBag,
    newDailyPicks,
  };
}
