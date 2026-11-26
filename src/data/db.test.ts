// Unit and integration tests for Ember IndexedDB schema, repositories, and sample content.

import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getDB,
  closeDB,
  createItem,
  getItem,
  updateItem,
  deleteItem,
  listItems,
  countItems,
  getBlob,
  putBlob,
  deleteBlob,
  countBlobs,
  getPoster,
  putPoster,
  deletePoster,
  countPosters,
  createNextStep,
  getNextStep,
  updateNextStep,
  deleteNextStep,
  listNextSteps,
  getSettings,
  saveSettings,
  resetSettings,
  seedSampleContent,
  deleteSampleContent,
  clearAllData,
  recordEvent,
  updateEventDwell,
  getEventsForItem,
  getEventsForMode,
} from './index';
import { formatBytes, getStorageEstimate } from '../lib/storage';
import type { Item, BlobRecord, PosterRecord, ShowEvent, NextStep } from '../types';

describe('IndexedDB Data Layer', () => {
  beforeEach(async () => {
    await clearAllData();
  });

  afterEach(() => {
    closeDB();
  });

  it('initializes the database with all expected stores and indexes', async () => {
    const db = await getDB();
    expect(db.objectStoreNames.contains('items')).toBe(true);
    expect(db.objectStoreNames.contains('blobs')).toBe(true);
    expect(db.objectStoreNames.contains('posters')).toBe(true);
    expect(db.objectStoreNames.contains('events')).toBe(true);
    expect(db.objectStoreNames.contains('nextSteps')).toBe(true);
    expect(db.objectStoreNames.contains('state')).toBe(true);
    expect(db.objectStoreNames.contains('settings')).toBe(true);
  });

  it('performs item CRUD operations and handles filtering', async () => {
    const item: Item = {
      id: 'test-item-1',
      type: 'text',
      text: 'Stay present and breathe.',
      modes: { start: 'core', charge: 'rotating', rescue: 'off' },
      createdAt: 1000,
      updatedAt: 1000,
      retiredAt: null,
    };

    // Create
    await createItem(item);
    expect(await countItems()).toBe(1);

    // Read
    const fetched = await getItem('test-item-1');
    expect(fetched).toBeDefined();
    expect(fetched?.text).toBe('Stay present and breathe.');

    // Update
    if (fetched) {
      fetched.text = 'Updated body text';
      await updateItem(fetched);
    }
    const updated = await getItem('test-item-1');
    expect(updated?.text).toBe('Updated body text');
    expect(updated?.updatedAt).toBeGreaterThan(1000);

    // Filtering by mode
    const startItems = await listItems({ mode: 'start' });
    expect(startItems.length).toBe(1);

    const rescueItems = await listItems({ mode: 'rescue' });
    expect(rescueItems.length).toBe(0);

    // Retired filtering
    if (updated) {
      updated.retiredAt = Date.now();
      await updateItem(updated);
    }
    expect((await listItems({ includeRetired: false })).length).toBe(0);
    expect((await listItems({ includeRetired: true })).length).toBe(1);

    // Delete
    await deleteItem('test-item-1');
    expect(await countItems()).toBe(0);
  });

  it('handles media Blob storage and round-trip retrieval', async () => {
    const content = 'mock image binary content';
    const blob = new Blob([content], { type: 'image/jpeg' });
    const blobRecord: BlobRecord = {
      id: 'blob-1',
      blob,
      mime: 'image/jpeg',
      size: blob.size,
    };

    await putBlob(blobRecord);
    expect(await countBlobs()).toBe(1);

    const retrieved = await getBlob('blob-1');
    expect(retrieved).toBeDefined();
    expect(retrieved?.mime).toBe('image/jpeg');
    expect(retrieved?.size).toBe(blob.size);

    const retrievedText = await retrieved?.blob.text();
    expect(retrievedText).toBe(content);

    await deleteBlob('blob-1');
    expect(await countBlobs()).toBe(0);
  });

  it('handles poster thumbnail storage and retrieval', async () => {
    const posterBlob = new Blob(['poster data'], { type: 'image/jpeg' });
    const posterRecord: PosterRecord = {
      itemId: 'item-with-poster',
      blob: posterBlob,
    };

    await putPoster(posterRecord);
    expect(await countPosters()).toBe(1);

    const retrieved = await getPoster('item-with-poster');
    expect(retrieved).toBeDefined();
    expect(await retrieved?.blob.text()).toBe('poster data');

    await deletePoster('item-with-poster');
    expect(await countPosters()).toBe(0);
  });

  it('creates an item with media and poster atomically, and cleans up on delete', async () => {
    const itemId = 'item-full-media';
    const mediaId = 'media-123';

    const item: Item = {
      id: itemId,
      type: 'image',
      text: 'Inspiring scenery',
      mediaId,
      modes: { start: 'rotating', charge: 'off', rescue: 'off' },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      retiredAt: null,
    };

    const blobRecord: BlobRecord = {
      id: mediaId,
      blob: new Blob(['media-data'], { type: 'image/jpeg' }),
      mime: 'image/jpeg',
      size: 10,
    };

    const posterRecord: PosterRecord = {
      itemId,
      blob: new Blob(['poster-data'], { type: 'image/jpeg' }),
    };

    // Atomic create
    await createItem(item, blobRecord, posterRecord);
    expect(await getItem(itemId)).toBeDefined();
    expect(await getBlob(mediaId)).toBeDefined();
    expect(await getPoster(itemId)).toBeDefined();

    // Atomic delete
    await deleteItem(itemId);
    expect(await getItem(itemId)).toBeUndefined();
    expect(await getBlob(mediaId)).toBeUndefined();
    expect(await getPoster(itemId)).toBeUndefined();
  });

  it('records and queries session show events', async () => {
    const event: ShowEvent = {
      id: 'event-1',
      itemId: 'item-100',
      mode: 'start',
      sessionId: 'session-abc',
      shownAt: 5000,
      dwellMs: 0,
      helped: false,
    };

    await recordEvent(event);
    await updateEventDwell('event-1', 4500, true);

    const itemEvents = await getEventsForItem('item-100');
    expect(itemEvents.length).toBe(1);
    expect(itemEvents[0].dwellMs).toBe(4500);
    expect(itemEvents[0].helped).toBe(true);

    const modeEvents = await getEventsForMode('start');
    expect(modeEvents.length).toBe(1);
  });

  it('manages Rescue next steps and filters by recency', async () => {
    const now = Date.now();
    const step1: NextStep = {
      id: 'step-1',
      text: 'Drink a glass of water',
      createdAt: now - 1000,
      doneAt: null,
    };
    const step2: NextStep = {
      id: 'step-2',
      text: 'Old step from 2 days ago',
      createdAt: now - 48 * 60 * 60 * 1000,
      doneAt: null,
    };

    await createNextStep(step1);
    await createNextStep(step2);

    const steps = await listNextSteps();
    expect(steps.length).toBe(2);
    // Verifies newest first
    expect(steps[0].id).toBe('step-1');
    expect(steps[1].id).toBe('step-2');

    // 24-hour filter check
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const recentUndone = steps.find(
      (s) => s.doneAt === null && s.createdAt >= oneDayAgo
    );
    expect(recentUndone?.id).toBe('step-1');

    const fetched = await getNextStep('step-1');
    expect(fetched?.text).toBe('Drink a glass of water');

    if (fetched) {
      fetched.doneAt = Date.now();
      await updateNextStep(fetched);
    }
    const updated = await getNextStep('step-1');
    expect(updated?.doneAt).not.toBeNull();

    await deleteNextStep('step-1');
    await deleteNextStep('step-2');
    expect((await listNextSteps()).length).toBe(0);
  });

  it('persists and updates application settings', async () => {
    const initial = await getSettings();
    expect(initial.ritualEnabled).toBe(true);
    expect(initial.lockTimeoutMs).toBe(300_000);
    expect(initial.exportReminderDismissed).toBe(false);

    const updated = await saveSettings({
      lockTimeoutMs: 60_000,
      soundOnByDefault: true,
      exportReminderDismissed: true,
    });
    expect(updated.lockTimeoutMs).toBe(60_000);
    expect(updated.soundOnByDefault).toBe(true);
    expect(updated.exportReminderDismissed).toBe(true);

    const reloaded = await getSettings();
    expect(reloaded.lockTimeoutMs).toBe(60_000);
    expect(reloaded.exportReminderDismissed).toBe(true);

    const restored = await resetSettings();
    expect(restored.lockTimeoutMs).toBe(300_000);
    expect(restored.exportReminderDismissed).toBe(false);
  });

  it('seeds 12 sample items, prevents duplicates, and deletes samples cleanly', async () => {
    const seededCount = await seedSampleContent();
    expect(seededCount).toBe(12);
    expect(await countItems()).toBe(12);

    // Duplicate seed should do nothing
    const secondSeed = await seedSampleContent();
    expect(secondSeed).toBe(0);
    expect(await countItems()).toBe(12);

    // Verify properties of seeded items
    const all = await listItems({ includeRetired: true });
    expect(all.every((item) => item.isSample === true)).toBe(true);

    // Delete sample items
    const deletedCount = await deleteSampleContent();
    expect(deletedCount).toBe(12);
    expect(await countItems()).toBe(0);
  });

  it('formats byte numbers and provides storage estimates safely', async () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1048576)).toBe('1.0 MB');
    expect(formatBytes(1073741824)).toBe('1.0 GB');

    const estimate = await getStorageEstimate();
    expect(estimate).toHaveProperty('usedBytes');
    expect(estimate).toHaveProperty('quotaBytes');
    expect(estimate).toHaveProperty('formattedUsed');
  });
});
