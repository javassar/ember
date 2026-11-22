// Sample motivational content and database cleanup functions.
// All sample items are warm, universal, and carry an isSample flag for one-tap deletion.

import { getDB } from './db';
import { createItem, listItems, deleteItem } from './itemsRepo';
import { resetSettings } from './settingsRepo';
import { resetEngineState } from './stateRepo';
import type { Item } from '../types';

export const SAMPLE_ITEMS: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>[] = [
  // Start Mode: Calm, intention-setting (mix of short, medium, and long)
  {
    type: 'text',
    text: 'Breathe in deeply. You are right where you need to be to begin.',
    modes: { start: 'core', charge: 'off', rescue: 'off' },
    retiredAt: null,
    isSample: true,
  },
  {
    type: 'text',
    text: 'Quiet mornings make room for clear thoughts.',
    modes: { start: 'rotating', charge: 'off', rescue: 'off' },
    retiredAt: null,
    isSample: true,
  },
  {
    type: 'text',
    text: "Notice how today is completely unwritten. You don't have to carry yesterday's weight into this hour.",
    modes: { start: 'rotating', charge: 'off', rescue: 'off' },
    retiredAt: null,
    isSample: true,
  },
  {
    type: 'text',
    text: 'Give yourself permission to move slowly. Clarity rarely comes from rushing; it arrives in the moments you allow yourself to pause, listen, and simply take one deliberate breath.',
    modes: { start: 'rotating', charge: 'off', rescue: 'off' },
    retiredAt: null,
    isSample: true,
  },

  // Charge Mode: High-energy, focus, priming
  {
    type: 'text',
    text: 'Energy follows focus. Choose where you direct your fire.',
    modes: { start: 'off', charge: 'core', rescue: 'off' },
    retiredAt: null,
    isSample: true,
  },
  {
    type: 'text',
    text: 'Step up with intention.',
    modes: { start: 'off', charge: 'rotating', rescue: 'off' },
    retiredAt: null,
    isSample: true,
  },
  {
    type: 'text',
    text: 'The hardest part is crossing the threshold. Once you take the first stride, your momentum will carry you forward.',
    modes: { start: 'off', charge: 'rotating', rescue: 'off' },
    retiredAt: null,
    isSample: true,
  },
  {
    type: 'text',
    text: "Strength isn't about feeling ready every second. It is deciding that what you want to create or overcome is worth pushing through the hesitation right now.",
    modes: { start: 'off', charge: 'rotating', rescue: 'off' },
    retiredAt: null,
    isSample: true,
  },

  // Rescue Mode: Low friction, anti-stuck, immediate action
  {
    type: 'text',
    text: 'You do not have to solve everything today. Just take one two-minute step.',
    modes: { start: 'off', charge: 'off', rescue: 'core' },
    retiredAt: null,
    isSample: true,
  },
  {
    type: 'text',
    text: 'Lower the bar until it feels manageable. Then start.',
    modes: { start: 'off', charge: 'off', rescue: 'rotating' },
    retiredAt: null,
    isSample: true,
  },
  {
    type: 'text',
    text: 'Action cures overthinking. Pick the smallest, easiest piece of the task and touch it for sixty seconds.',
    modes: { start: 'off', charge: 'off', rescue: 'rotating' },
    retiredAt: null,
    isSample: true,
  },
  {
    type: 'text',
    text: 'When feeling stuck, stop trying to force the big picture. Shrink your world down to the next two minutes: open the document, put on your shoes, or write down a single word. Motion creates emotion.',
    modes: { start: 'off', charge: 'off', rescue: 'rotating' },
    retiredAt: null,
    isSample: true,
  },
];

// Seed the 12 sample items into IndexedDB if they are not already loaded.
export async function seedSampleContent(): Promise<number> {
  const existing = await listItems({ includeRetired: true });
  const hasSample = existing.some((item) => item.isSample);
  if (hasSample) {
    return 0; // Already seeded
  }

  const now = Date.now();
  for (let i = 0; i < SAMPLE_ITEMS.length; i++) {
    const itemData = SAMPLE_ITEMS[i];
    const item: Item = {
      ...itemData,
      id: crypto.randomUUID(),
      createdAt: now + i, // Incremental timestamps for deterministic sorting
      updatedAt: now + i,
    };
    await createItem(item);
  }

  return SAMPLE_ITEMS.length;
}

// Delete all items marked with the isSample flag.
export async function deleteSampleContent(): Promise<number> {
  const items = await listItems({ includeRetired: true });
  let deletedCount = 0;

  for (const item of items) {
    if (item.isSample) {
      await deleteItem(item.id);
      deletedCount++;
    }
  }

  return deletedCount;
}

// Wipe all object stores and restore clean defaults (Factory Reset).
export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(
    ['items', 'blobs', 'posters', 'events', 'nextSteps', 'state', 'settings'],
    'readwrite'
  );

  await tx.objectStore('items').clear();
  await tx.objectStore('blobs').clear();
  await tx.objectStore('posters').clear();
  await tx.objectStore('events').clear();
  await tx.objectStore('nextSteps').clear();
  await tx.objectStore('state').clear();
  await tx.objectStore('settings').clear();
  await tx.done;

  // Restore fresh settings and engine states
  await resetSettings();
  await resetEngineState();
}
