// Session manager coordinating repository queries, selection engine draws, and event tracking.
// Encapsulates all state mutations for running, advancing, and concluding Ember sessions.

import {
  listItems,
  getSettings,
  listEvents,
  getEngineState,
  saveEngineState,
  recordEvent,
  updateEventDwell,
} from '../data';
import {
  buildSession,
  drawWeightedItems,
  calculateItemWeight,
  filterEligibleItems,
  getLocalDateString,
} from './selection';
import type { Item, Mode, ModeConfig, Settings, ShowEvent } from '../types';

export interface LoadedSession {
  sessionId: string;
  mode: Mode;
  items: Item[];
  modeConfig: ModeConfig;
  settings: Settings;
  sessionNumberToday: number; // 1 for first session today, 2 for second, etc.
}

// Loads and initializes a new session for the specified mode.
export async function initializeSession(mode: Mode): Promise<LoadedSession> {
  const [allItems, settings, allEvents, engineState] = await Promise.all([
    listItems(),
    getSettings(),
    listEvents(),
    getEngineState(),
  ]);

  const modeConfig = settings.modes[mode];
  const now = Date.now();
  const todayDateString = getLocalDateString(new Date(now));

  // Determine current day's session counter (both total and per-space)
  const isSameDay = engineState.sessionCounts.lastSessionDate === todayDateString;
  const sessionCountBeforeThis = isSameDay ? engineState.sessionCounts.countToday : 0;
  const currentTotalSessionNumber = sessionCountBeforeThis + 1;

  const currentModeCounts: Record<Mode, number> = isSameDay && engineState.sessionCounts.modeCountsToday
    ? { ...engineState.sessionCounts.modeCountsToday }
    : { start: 0, charge: 0, rescue: 0 };

  const currentModeSessionNumber = (currentModeCounts[mode] || 0) + 1;
  currentModeCounts[mode] = currentModeSessionNumber;

  // Build the session item list using the pure selection engine
  const persistedBag = engineState.bags[mode] || [];
  const dailyPicks = engineState.dailyPicks[mode];

  const buildResult = buildSession({
    items: allItems,
    mode,
    config: modeConfig,
    events: allEvents,
    persistedBag,
    dailyPicks,
    todayDateString,
    now,
  });

  // Persist updated engine state
  const updatedBags = {
    ...engineState.bags,
    [mode]: buildResult.updatedBag,
  };

  const updatedDailyPicks = buildResult.newDailyPicks
    ? {
        ...engineState.dailyPicks,
        [mode]: buildResult.newDailyPicks,
      }
    : engineState.dailyPicks;

  await saveEngineState({
    bags: updatedBags,
    dailyPicks: updatedDailyPicks,
    sessionCounts: {
      lastSessionDate: todayDateString,
      countToday: currentTotalSessionNumber,
      modeCountsToday: currentModeCounts,
    },
  });

  // Map chosen IDs back to Item objects
  const itemsMap = new Map<string, Item>();
  allItems.forEach((i) => itemsMap.set(i.id, i));

  const sessionItems: Item[] = [];
  for (const id of buildResult.sessionItemIds) {
    const item = itemsMap.get(id);
    if (item) {
      sessionItems.push(item);
    }
  }

  const sessionId = `ses_${now}_${Math.random().toString(36).slice(2, 8)}`;

  return {
    sessionId,
    mode,
    items: sessionItems,
    modeConfig,
    settings,
    sessionNumberToday: currentModeSessionNumber,
  };
}

// Draws one additional rotating item for the "Show me more" feature.
export async function drawExtraItem(
  mode: Mode,
  currentItemIds: string[]
): Promise<Item | null> {
  const [allItems, allEvents, engineState] = await Promise.all([
    listItems(),
    listEvents(),
    getEngineState(),
  ]);

  const { rotating: eligibleRotating } = filterEligibleItems(allItems, mode);
  const currentSet = new Set(currentItemIds);

  // Remaining candidates not already presented in this session
  const remainingCandidates = eligibleRotating.filter((i) => !currentSet.has(i.id));
  if (remainingCandidates.length === 0) {
    return null;
  }

  const now = Date.now();
  const weightsMap = new Map<string, number>();
  remainingCandidates.forEach((item) => {
    weightsMap.set(item.id, calculateItemWeight(item.id, allEvents, mode, now));
  });

  const drawn = drawWeightedItems(remainingCandidates, 1, weightsMap);
  if (drawn.length === 0) {
    return null;
  }

  const chosenItem = drawn[0];

  // Remove chosen item from persisted bag if it is currently inside it
  const activeBag = engineState.bags[mode] || [];
  const nextBag = activeBag.filter((id) => id !== chosenItem.id);
  await saveEngineState({
    bags: {
      ...engineState.bags,
      [mode]: nextBag,
    },
  });

  return chosenItem;
}

// Records an initial ShowEvent when an item becomes visible on screen.
export async function recordItemShown(
  itemId: string,
  mode: Mode,
  sessionId: string
): Promise<ShowEvent> {
  const event: ShowEvent = {
    id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    itemId,
    mode,
    sessionId,
    shownAt: Date.now(),
    dwellMs: 0,
    helped: false,
  };

  await recordEvent(event);
  return event;
}

// Finalizes dwell duration for a shown item when leaving or navigating away.
export async function finalizeItemDwell(
  eventId: string,
  dwellMs: number,
  helped?: boolean
): Promise<void> {
  await updateEventDwell(eventId, Math.max(0, dwellMs), helped);
}
