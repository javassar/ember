// IndexedDB connection, schema definition, and migration runner for Ember.

import { openDB, type IDBPDatabase, type DBSchema } from 'idb';
import type {
  Item,
  BlobRecord,
  PosterRecord,
  ShowEvent,
  NextStep,
  Settings,
  EngineState,
} from '../types';

export const DB_NAME = 'ember';
export const DB_VERSION = 1;

export interface EmberDBSchema extends DBSchema {
  items: {
    key: string;
    value: Item;
    indexes: {
      'by-created': number;
      'by-type': string;
    };
  };
  blobs: {
    key: string;
    value: BlobRecord;
  };
  posters: {
    key: string;
    value: PosterRecord;
  };
  events: {
    key: string;
    value: ShowEvent;
    indexes: {
      'by-item': string;
      'by-mode': string;
      'by-session': string;
      'by-shown': number;
    };
  };
  nextSteps: {
    key: string;
    value: NextStep;
    indexes: {
      'by-created': number;
    };
  };
  state: {
    key: string;
    value: EngineState & { id: string };
  };
  settings: {
    key: string;
    value: Settings & { id: string };
  };
}

export type EmberDB = IDBPDatabase<EmberDBSchema>;

// Versioned migration handler to ensure future updates do not wipe user data.
export function migrateDatabase(
  db: IDBPDatabase<EmberDBSchema>,
  oldVersion: number,
  _newVersion: number | null
): void {
  if (oldVersion < 1) {
    // Items store
    const itemStore = db.createObjectStore('items', { keyPath: 'id' });
    itemStore.createIndex('by-created', 'createdAt');
    itemStore.createIndex('by-type', 'type');

    // Blobs store for media files
    db.createObjectStore('blobs', { keyPath: 'id' });

    // Posters store for thumbnails
    db.createObjectStore('posters', { keyPath: 'itemId' });

    // Session show events store
    const eventStore = db.createObjectStore('events', { keyPath: 'id' });
    eventStore.createIndex('by-item', 'itemId');
    eventStore.createIndex('by-mode', 'mode');
    eventStore.createIndex('by-session', 'sessionId');
    eventStore.createIndex('by-shown', 'shownAt');

    // Next steps store
    const nextStepStore = db.createObjectStore('nextSteps', { keyPath: 'id' });
    nextStepStore.createIndex('by-created', 'createdAt');

    // Engine state store
    db.createObjectStore('state', { keyPath: 'id' });

    // Application settings store
    db.createObjectStore('settings', { keyPath: 'id' });
  }
}

// Singleton or managed connection to the Ember IndexedDB instance.
let dbPromise: Promise<EmberDB> | null = null;

export function getDB(): Promise<EmberDB> {
  if (!dbPromise) {
    dbPromise = openDB<EmberDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion) {
        migrateDatabase(db, oldVersion, newVersion);
      },
    });
  }
  return dbPromise;
}

// Helper to reset the cached promise (primarily used in test teardowns).
export function closeDB(): void {
  if (dbPromise) {
    dbPromise.then((db) => db.close()).catch(() => {});
    dbPromise = null;
  }
}
