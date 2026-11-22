// Utilities for exporting, streaming unzipping, merging, and restoring Ember backup archives.

import { downloadZip } from 'client-zip';
import { Unzip, AsyncUnzipInflate } from 'fflate';
import {
  listItems,
  listEvents,
  listNextSteps,
  getSettings,
  saveSettings,
  getDB,
  createItem,
  getItem,
  clearAllData,
} from '../data';
import type { Item, BlobRecord, PosterRecord, ShowEvent, NextStep, Mode, ModeConfig, Settings } from '../types';

export const CURRENT_BACKUP_VERSION = 1;

export interface BackupManifest {
  version: number;
  exportDate: number;
  items: Item[];
  blobs: { id: string; mime: string; size: number }[];
  posters: { itemId: string }[];
  events: ShowEvent[];
  nextSteps: NextStep[];
  modesConfig: Record<Mode, ModeConfig>;
  settings: Omit<Settings, 'pin'>;
}

// Build a clean JSON-serializable manifest containing all user content and settings (excluding PIN).
export async function buildManifest(): Promise<BackupManifest> {
  const db = await getDB();
  const [items, events, nextSteps, settings] = await Promise.all([
    listItems({ includeRetired: true }),
    listEvents(),
    listNextSteps(),
    getSettings(),
  ]);

  const rawBlobs = await db.getAll('blobs');
  const blobsMeta = rawBlobs.map((b) => ({
    id: b.id,
    mime: b.mime,
    size: b.size,
  }));

  const rawPosters = await db.getAll('posters');
  const postersMeta = rawPosters.map((p) => ({
    itemId: p.itemId,
  }));

  // Create a copy of settings without the security PIN hash
  const safeSettings: Omit<Settings, 'pin'> = {
    lockTimeoutMs: settings.lockTimeoutMs,
    ritualEnabled: settings.ritualEnabled,
    ritualScale: settings.ritualScale,
    openInto: settings.openInto,
    soundOnByDefault: settings.soundOnByDefault,
    onboardingDone: settings.onboardingDone,
    lastExportAt: settings.lastExportAt,
    modes: settings.modes,
  };

  return {
    version: CURRENT_BACKUP_VERSION,
    exportDate: Date.now(),
    items,
    blobs: blobsMeta,
    posters: postersMeta,
    events,
    nextSteps,
    modesConfig: settings.modes,
    settings: safeSettings,
  };
}

// Validate a manifest object parsed from JSON, ensuring it satisfies required schemas and version limits.
export function validateManifest(data: unknown): BackupManifest {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid manifest: Expected an object.');
  }

  const m = data as Partial<BackupManifest>;

  if (typeof m.version !== 'number' || m.version < 1) {
    throw new Error('Invalid manifest: Missing or invalid version number.');
  }

  if (m.version > CURRENT_BACKUP_VERSION) {
    throw new Error(
      `Incompatible backup version: File version ${m.version} is newer than current app version ${CURRENT_BACKUP_VERSION}.`
    );
  }

  if (!Array.isArray(m.items)) {
    throw new Error('Invalid manifest: items must be an array.');
  }

  return m as BackupManifest;
}

// Stream and parse a zip file using fflate into its manifest and Blob entries.
export function parseBackupZip(buffer: ArrayBuffer | Uint8Array): Promise<{
  manifest: BackupManifest;
  mediaBlobs: Map<string, { blob: Blob; mime: string; size: number }>;
  posterBlobs: Map<string, Blob>;
}> {
  return new Promise((resolve, reject) => {
    try {
      const u8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
      const unzipper = new Unzip();
      unzipper.register(AsyncUnzipInflate);

      let manifestRaw = '';
      const mediaBlobs = new Map<string, { blob: Blob; mime: string; size: number }>();
      const posterBlobs = new Map<string, Blob>();
      let pendingFiles = 0;
      let pushFinished = false;

      const checkDone = () => {
        if (pushFinished && pendingFiles === 0) {
          if (!manifestRaw) {
            reject(new Error('Missing manifest.json in backup archive.'));
            return;
          }
          try {
            const parsed = JSON.parse(manifestRaw);
            const manifest = validateManifest(parsed);

            // Re-apply correct MIME types from manifest metadata
            if (manifest.blobs) {
              for (const meta of manifest.blobs) {
                const item = mediaBlobs.get(meta.id);
                if (item) {
                  item.mime = meta.mime;
                  item.blob = new Blob([item.blob], { type: meta.mime });
                }
              }
            }

            resolve({ manifest, mediaBlobs, posterBlobs });
          } catch (err) {
            reject(err);
          }
        }
      };

      unzipper.onfile = (file) => {
        pendingFiles++;
        const chunks: Uint8Array[] = [];

        file.ondata = (err, chunk, final) => {
          if (err) {
            reject(err);
            return;
          }
          if (chunk) {
            chunks.push(chunk);
          }
          if (final) {
            pendingFiles--;
            const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
            const combined = new Uint8Array(totalLen);
            let offset = 0;
            for (const c of chunks) {
              combined.set(c, offset);
              offset += c.length;
            }

            if (file.name === 'manifest.json') {
              manifestRaw = new TextDecoder().decode(combined);
            } else if (file.name.startsWith('media/')) {
              const id = file.name.replace(/^media\//, '');
              mediaBlobs.set(id, {
                blob: new Blob([combined]),
                mime: 'application/octet-stream',
                size: combined.length,
              });
            } else if (file.name.startsWith('posters/')) {
              const itemId = file.name.replace(/^posters\//, '');
              posterBlobs.set(itemId, new Blob([combined], { type: 'image/jpeg' }));
            }

            checkDone();
          }
        };
        file.start();
      };

      unzipper.push(u8, true);
      pushFinished = true;
      checkDone();
    } catch (err) {
      reject(err);
    }
  });
}

// Generate a complete zip archive of all content and media using client-zip.
export async function exportBackupZip(): Promise<{ blob: Blob; filename: string }> {
  const db = await getDB();
  const manifest = await buildManifest();

  const [rawBlobs, rawPosters] = await Promise.all([
    db.getAll('blobs'),
    db.getAll('posters'),
  ]);

  const files = [
    {
      name: 'manifest.json',
      lastModified: new Date(),
      input: JSON.stringify(manifest, null, 2),
    },
    ...rawBlobs.map((b) => ({
      name: `media/${b.id}`,
      lastModified: new Date(),
      input: b.blob,
    })),
    ...rawPosters.map((p) => ({
      name: `posters/${p.itemId}`,
      lastModified: new Date(),
      input: p.blob,
    })),
  ];

  const zipResponse = downloadZip(files);
  const zipBlob = await zipResponse.blob();

  // Update last export timestamp
  await saveSettings({ lastExportAt: Date.now() });

  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `ember-backup-${dateStr}.zip`;

  return { blob: zipBlob, filename };
}

// Trigger download or native share sheet for the generated backup zip.
export async function triggerBackupDownload(blob: Blob, filename: string): Promise<void> {
  const file = new File([blob], filename, { type: 'application/zip' });

  // On iOS / mobile devices supporting Web Share with files, invoke native share sheet
  if (
    typeof navigator !== 'undefined' &&
    navigator.canShare &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({
        files: [file],
        title: 'Ember Backup',
        text: 'Ember content archive',
      });
      return;
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        return; // User dismissed share sheet
      }
    }
  }

  // Fallback to standard browser file download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Restore an Ember backup from file with either "merge" (skip duplicates) or "replace" (clean overwrite).
export async function importBackupZip(
  fileOrBuffer: File | Blob | ArrayBuffer,
  mode: 'merge' | 'replace' = 'merge'
): Promise<{ importedCount: number; mode: 'merge' | 'replace' }> {
  let buffer: ArrayBuffer;
  if (fileOrBuffer instanceof ArrayBuffer) {
    buffer = fileOrBuffer;
  } else {
    buffer = await fileOrBuffer.arrayBuffer();
  }

  const { manifest, mediaBlobs, posterBlobs } = await parseBackupZip(buffer);
  const db = await getDB();

  let importedCount = 0;

  if (mode === 'replace') {
    // Preserve existing PIN so the user isn't locked out
    const currentSettings = await getSettings();
    const existingPin = currentSettings.pin;

    // Clean overwrite: clear all current stores
    await clearAllData();

    // 1. Write Blobs
    for (const [id, record] of mediaBlobs.entries()) {
      const blobRecord: BlobRecord = {
        id,
        blob: record.blob,
        mime: record.mime,
        size: record.size,
      };
      await db.put('blobs', blobRecord);
    }

    // 2. Write Posters
    for (const [itemId, blob] of posterBlobs.entries()) {
      const posterRecord: PosterRecord = { itemId, blob };
      await db.put('posters', posterRecord);
    }

    // 3. Write Items
    for (const item of manifest.items) {
      await db.put('items', item);
      importedCount++;
    }

    // 4. Write Events
    if (manifest.events) {
      for (const event of manifest.events) {
        await db.put('events', event);
      }
    }

    // 5. Write Next Steps
    if (manifest.nextSteps) {
      for (const step of manifest.nextSteps) {
        await db.put('nextSteps', step);
      }
    }

    // 6. Restore Settings (preserving existing PIN so the user isn't locked out)
    await saveSettings({
      ...manifest.settings,
      pin: existingPin,
      modes: manifest.modesConfig || currentSettings.modes,
      lastExportAt: Date.now(),
    });
  } else {
    // Merge mode: skip items, blobs, posters, and steps that already exist
    for (const item of manifest.items) {
      const existing = await getItem(item.id);
      if (!existing) {
        let blobRecord: BlobRecord | undefined;
        let posterRecord: PosterRecord | undefined;

        if (item.mediaId && mediaBlobs.has(item.mediaId)) {
          const m = mediaBlobs.get(item.mediaId)!;
          blobRecord = {
            id: item.mediaId,
            blob: m.blob,
            mime: m.mime,
            size: m.size,
          };
        }

        if (posterBlobs.has(item.id)) {
          posterRecord = {
            itemId: item.id,
            blob: posterBlobs.get(item.id)!,
          };
        }

        await createItem(item, blobRecord, posterRecord);
        importedCount++;
      }
    }

    // Merge events (skip if event ID exists)
    if (manifest.events) {
      for (const event of manifest.events) {
        const existing = await db.get('events', event.id);
        if (!existing) {
          await db.put('events', event);
        }
      }
    }

    // Merge next steps (skip if ID exists)
    if (manifest.nextSteps) {
      for (const step of manifest.nextSteps) {
        const existing = await db.get('nextSteps', step.id);
        if (!existing) {
          await db.put('nextSteps', step);
        }
      }
    }
  }

  return { importedCount, mode };
}
