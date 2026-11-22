// Repository for managing content items, including atomic writes for media and posters.

import { getDB } from './db';
import type { Item, BlobRecord, PosterRecord, Mode } from '../types';

export interface ListItemsOptions {
  mode?: Mode;
  type?: Item['type'];
  includeRetired?: boolean;
}

// Create an item with optional media blob and poster in a single transaction.
export async function createItem(
  item: Item,
  blobRecord?: BlobRecord,
  posterRecord?: PosterRecord
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['items', 'blobs', 'posters'], 'readwrite');

  await tx.objectStore('items').put(item);

  if (blobRecord) {
    await tx.objectStore('blobs').put(blobRecord);
  }

  if (posterRecord) {
    await tx.objectStore('posters').put(posterRecord);
  }

  await tx.done;
}

// Retrieve an item by its unique ID.
export async function getItem(id: string): Promise<Item | undefined> {
  const db = await getDB();
  return db.get('items', id);
}

// Update item metadata.
export async function updateItem(item: Item): Promise<void> {
  const db = await getDB();
  item.updatedAt = Date.now();
  await db.put('items', item);
}

// Atomically delete an item along with any referenced media blob and poster.
export async function deleteItem(id: string): Promise<void> {
  const db = await getDB();
  const item = await db.get('items', id);

  const tx = db.transaction(['items', 'blobs', 'posters'], 'readwrite');
  await tx.objectStore('items').delete(id);
  await tx.objectStore('posters').delete(id);

  if (item?.mediaId) {
    await tx.objectStore('blobs').delete(item.mediaId);
  }

  await tx.done;
}

// List items with optional filtering by mode, type, and retirement status.
export async function listItems(options: ListItemsOptions = {}): Promise<Item[]> {
  const db = await getDB();
  const allItems = await db.getAll('items');

  return allItems.filter((item) => {
    // By default, exclude retired items unless requested
    if (!options.includeRetired && item.retiredAt !== null) {
      return false;
    }

    // Filter by mode membership
    if (options.mode) {
      const membership = item.modes[options.mode];
      if (!membership || membership === 'off') {
        return false;
      }
    }

    // Filter by media type
    if (options.type && item.type !== options.type) {
      return false;
    }

    return true;
  });
}

// Count total items currently stored.
export async function countItems(): Promise<number> {
  const db = await getDB();
  return db.count('items');
}
