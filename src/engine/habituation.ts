// Pure calculations for item habituation, per-mode engagement statistics, and "Not landing" flags.

import type { Mode, ShowEvent, Item } from '../types';
import { NOT_LANDING_MIN_SHOWS } from '../config';

export interface ItemModeStat {
  mode: Mode;
  shows: number;
  helped: number;
  lastShownAt: number | null;
  isNotLanding: boolean;
}

export interface ItemStatsSummary {
  totalShows: number;
  totalHelped: number;
  lastShownAt: number | null;
  modes: Record<Mode, ItemModeStat>;
  notLandingModes: Mode[];
}

// Computes detailed per-mode and total engagement metrics for a single item.
export function computeItemStats(
  itemId: string,
  events: ShowEvent[]
): ItemStatsSummary {
  const itemEvents = events.filter((e) => e.itemId === itemId);

  const modes: Record<Mode, ItemModeStat> = {
    start: { mode: 'start', shows: 0, helped: 0, lastShownAt: null, isNotLanding: false },
    charge: { mode: 'charge', shows: 0, helped: 0, lastShownAt: null, isNotLanding: false },
    rescue: { mode: 'rescue', shows: 0, helped: 0, lastShownAt: null, isNotLanding: false },
  };

  let totalShows = 0;
  let totalHelped = 0;
  let overallLastShownAt: number | null = null;

  for (const ev of itemEvents) {
    totalShows++;
    if (ev.helped) {
      totalHelped++;
    }

    if (overallLastShownAt === null || ev.shownAt > overallLastShownAt) {
      overallLastShownAt = ev.shownAt;
    }

    const stat = modes[ev.mode];
    if (stat) {
      stat.shows++;
      if (ev.helped) {
        stat.helped++;
      }
      if (stat.lastShownAt === null || ev.shownAt > stat.lastShownAt) {
        stat.lastShownAt = ev.shownAt;
      }
    }
  }

  const notLandingModes: Mode[] = [];
  (['start', 'charge', 'rescue'] as Mode[]).forEach((m) => {
    const s = modes[m];
    if (s.shows >= NOT_LANDING_MIN_SHOWS && s.helped === 0) {
      s.isNotLanding = true;
      notLandingModes.push(m);
    }
  });

  return {
    totalShows,
    totalHelped,
    lastShownAt: overallLastShownAt,
    modes,
    notLandingModes,
  };
}

// Determines which items in a list are considered "Not landing" in one or more modes.
export function findNotLandingItems(
  items: Item[],
  events: ShowEvent[]
): Map<string, Mode[]> {
  const result = new Map<string, Mode[]>();

  for (const item of items) {
    const stats = computeItemStats(item.id, events);
    if (stats.notLandingModes.length > 0) {
      result.set(item.id, stats.notLandingModes);
    }
  }

  return result;
}
