// Unit tests for backup manifest building, schema validation, zip export, and merge/replace restoration.

import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  buildManifest,
  validateManifest,
  exportBackupZip,
  parseBackupZip,
  importBackupZip,
  CURRENT_BACKUP_VERSION,
} from './backup';
import {
  getDB,
  closeDB,
  createItem,
  listItems,
  getSettings,
  saveSettings,
} from '../data';
import type { Item } from '../types';

describe('Backup & Restore System (src/lib/backup.ts)', () => {
  beforeEach(async () => {
    const db = await getDB();
    await db.clear('items');
    await db.clear('blobs');
    await db.clear('posters');
    await db.clear('events');
    await db.clear('nextSteps');
    await db.clear('settings');
    await saveSettings({
      pin: { salt: 'salt123', hash: 'hash123', iterations: 200000, length: 4 },
      lockTimeoutMs: 300000,
    });
  });

  afterEach(() => {
    closeDB();
  });

  it('builds a valid manifest that safely excludes the security PIN hash', async () => {
    const item: Item = {
      id: 'test-1',
      type: 'text',
      text: 'Breathe in peace',
      modes: { start: 'core', charge: 'off', rescue: 'off' },
      createdAt: 1000,
      updatedAt: 1000,
      retiredAt: null,
    };
    await createItem(item);

    const manifest = await buildManifest();

    expect(manifest.version).toBe(CURRENT_BACKUP_VERSION);
    expect(manifest.items.length).toBe(1);
    expect(manifest.items[0].text).toBe('Breathe in peace');
    // Ensure PIN is stripped from export manifest
    expect((manifest.settings as Record<string, unknown>).pin).toBeUndefined();
  });

  it('validates a correct manifest and rejects invalid or future versions', () => {
    const valid = {
      version: 1,
      exportDate: Date.now(),
      items: [],
      blobs: [],
      posters: [],
      events: [],
      nextSteps: [],
      modesConfig: {},
      settings: {},
    };
    expect(() => validateManifest(valid)).not.toThrow();

    // Reject non-objects
    expect(() => validateManifest(null)).toThrow('Invalid manifest');
    expect(() => validateManifest('string')).toThrow('Invalid manifest');

    // Reject missing version
    expect(() => validateManifest({ items: [] })).toThrow('Missing or invalid version');

    // Reject future versions
    expect(() => validateManifest({ version: 999, items: [] })).toThrow(
      'Incompatible backup version'
    );

    // Reject non-array items
    expect(() => validateManifest({ version: 1, items: 'not an array' })).toThrow(
      'items must be an array'
    );
  });

  it('exports a complete zip archive and parses it accurately round-trip', async () => {
    const item: Item = {
      id: 'item-roundtrip',
      type: 'image',
      text: 'Nature wallpaper',
      mediaId: 'blob-1',
      modes: { start: 'rotating', charge: 'core', rescue: 'off' },
      createdAt: 2000,
      updatedAt: 2000,
      retiredAt: null,
    };

    const mediaBlob = new Blob(['sample-image-binary'], { type: 'image/jpeg' });
    const posterBlob = new Blob(['sample-thumb-binary'], { type: 'image/jpeg' });

    await createItem(
      item,
      { id: 'blob-1', blob: mediaBlob, mime: 'image/jpeg', size: mediaBlob.size },
      { itemId: 'item-roundtrip', blob: posterBlob }
    );

    const { blob, filename } = await exportBackupZip();
    expect(filename).toMatch(/^ember-backup-\d{4}-\d{2}-\d{2}\.zip$/);
    expect(blob.size).toBeGreaterThan(0);

    const arrayBuffer = await blob.arrayBuffer();
    const parsed = await parseBackupZip(arrayBuffer);

    expect(parsed.manifest.version).toBe(CURRENT_BACKUP_VERSION);
    expect(parsed.manifest.items.length).toBe(1);
    expect(parsed.manifest.items[0].id).toBe('item-roundtrip');
    expect(parsed.mediaBlobs.has('blob-1')).toBe(true);
    expect(parsed.posterBlobs.has('item-roundtrip')).toBe(true);
  });

  it('merges new items without duplicating existing items', async () => {
    const item1: Item = {
      id: 'existing-item',
      type: 'text',
      text: 'Existing content',
      modes: { start: 'core', charge: 'off', rescue: 'off' },
      createdAt: 1000,
      updatedAt: 1000,
      retiredAt: null,
    };
    await createItem(item1);

    const manifest = {
      version: 1,
      exportDate: Date.now(),
      items: [
        item1, // Existing duplicate
        {
          id: 'new-incoming-item',
          type: 'text',
          text: 'Fresh content',
          modes: { start: 'rotating', charge: 'off', rescue: 'off' },
          createdAt: 3000,
          updatedAt: 3000,
          retiredAt: null,
        },
      ],
      blobs: [],
      posters: [],
      events: [],
      nextSteps: [],
      modesConfig: {},
      settings: {},
    };

    // Synthesize export zip
    const { downloadZip } = await import('client-zip');
    const zipResp = downloadZip([
      { name: 'manifest.json', input: JSON.stringify(manifest) },
    ]);
    const zipBlob = await zipResp.blob();

    const result = await importBackupZip(zipBlob, 'merge');
    expect(result.mode).toBe('merge');
    expect(result.importedCount).toBe(1); // Only the new item was imported

    const allItems = await listItems({ includeRetired: true });
    expect(allItems.length).toBe(2);
  });

  it('replaces all existing content completely on replace mode', async () => {
    const oldItem: Item = {
      id: 'old-item',
      type: 'text',
      text: 'Old stale content',
      modes: { start: 'core', charge: 'off', rescue: 'off' },
      createdAt: 1000,
      updatedAt: 1000,
      retiredAt: null,
    };
    await createItem(oldItem);

    const newItem: Item = {
      id: 'restored-item',
      type: 'text',
      text: 'Completely restored content',
      modes: { start: 'core', charge: 'off', rescue: 'off' },
      createdAt: 5000,
      updatedAt: 5000,
      retiredAt: null,
    };

    const manifest = {
      version: 1,
      exportDate: Date.now(),
      items: [newItem],
      blobs: [],
      posters: [],
      events: [],
      nextSteps: [],
      modesConfig: {},
      settings: { lockTimeoutMs: 60000 },
    };

    const { downloadZip } = await import('client-zip');
    const zipResp = downloadZip([
      { name: 'manifest.json', input: JSON.stringify(manifest) },
    ]);
    const zipBlob = await zipResp.blob();

    const result = await importBackupZip(zipBlob, 'replace');
    expect(result.mode).toBe('replace');
    expect(result.importedCount).toBe(1);

    const allItems = await listItems({ includeRetired: true });
    expect(allItems.length).toBe(1);
    expect(allItems[0].id).toBe('restored-item');

    // PIN should be preserved after replace
    const settings = await getSettings();
    expect(settings.pin?.hash).toBe('hash123');
  });
});
