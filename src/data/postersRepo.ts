// Repository for managing video and image thumbnail posters.

import { getDB } from './db';
import type { PosterRecord } from '../types';

// Retrieve a poster by item ID.
export async function getPoster(itemId: string): Promise<PosterRecord | undefined> {
  const db = await getDB();
  return db.get('posters', itemId);
}

// Store a thumbnail poster for an item.
export async function putPoster(posterRecord: PosterRecord): Promise<void> {
  const db = await getDB();
  await db.put('posters', posterRecord);
}

// Delete a thumbnail poster by item ID.
export async function deletePoster(itemId: string): Promise<void> {
  const db = await getDB();
  await db.delete('posters', itemId);
}

// Count total posters stored.
export async function countPosters(): Promise<number> {
  const db = await getDB();
  return db.count('posters');
}
