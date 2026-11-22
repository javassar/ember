// Repository for recording and querying session show events and dwell times.

import { getDB } from './db';
import type { ShowEvent, Mode } from '../types';

// Record an initial show event when an item appears in a session.
export async function recordEvent(event: ShowEvent): Promise<void> {
  const db = await getDB();
  await db.put('events', event);
}

// Update an existing event's dwell duration and helped flag upon leaving the item.
export async function updateEventDwell(
  eventId: string,
  dwellMs: number,
  helped?: boolean
): Promise<void> {
  const db = await getDB();
  const event = await db.get('events', eventId);
  if (event) {
    event.dwellMs = dwellMs;
    if (helped !== undefined) {
      event.helped = helped;
    }
    await db.put('events', event);
  }
}

// Retrieve all show events for a specific item.
export async function getEventsForItem(itemId: string): Promise<ShowEvent[]> {
  const db = await getDB();
  return db.getAllFromIndex('events', 'by-item', itemId);
}

// Retrieve all show events for a specific mode.
export async function getEventsForMode(mode: Mode): Promise<ShowEvent[]> {
  const db = await getDB();
  return db.getAllFromIndex('events', 'by-mode', mode);
}

// List all recorded show events.
export async function listEvents(): Promise<ShowEvent[]> {
  const db = await getDB();
  return db.getAll('events');
}

// Count total show events stored.
export async function countEvents(): Promise<number> {
  const db = await getDB();
  return db.count('events');
}
