// Repository for managing media files (images and videos) stored as Blobs.

import { getDB } from './db';
import type { BlobRecord } from '../types';

// Retrieve a media blob record by ID.
export async function getBlob(id: string): Promise<BlobRecord | undefined> {
  const db = await getDB();
  return db.get('blobs', id);
}

// Store a media blob record.
export async function putBlob(blobRecord: BlobRecord): Promise<void> {
  const db = await getDB();
  await db.put('blobs', blobRecord);
}

// Delete a media blob record by ID.
export async function deleteBlob(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('blobs', id);
}

// Count total media blob records stored.
export async function countBlobs(): Promise<number> {
  const db = await getDB();
  return db.count('blobs');
}
