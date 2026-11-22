// Repository for reading and persisting user application settings in IndexedDB.

import { getDB } from './db';
import { DEFAULT_SETTINGS } from '../config';
import type { Settings } from '../types';

const SETTINGS_KEY = 'app_settings';

// Load settings from storage, or initialize and return default settings if not present.
export async function getSettings(): Promise<Settings> {
  const db = await getDB();
  const record = await db.get('settings', SETTINGS_KEY);

  if (record) {
    const settings = { ...record };
    delete (settings as { id?: string }).id;
    return settings as Settings;
  }

  // Initialize with default settings
  const initial = { ...DEFAULT_SETTINGS, id: SETTINGS_KEY };
  await db.put('settings', initial);
  return DEFAULT_SETTINGS;
}

// Save or update existing settings partially.
export async function saveSettings(updates: Partial<Settings>): Promise<Settings> {
  const db = await getDB();
  const current = await getSettings();

  const merged: Settings = {
    ...current,
    ...updates,
    modes: {
      ...current.modes,
      ...(updates.modes || {}),
    },
  };

  await db.put('settings', { ...merged, id: SETTINGS_KEY });
  return merged;
}

// Reset settings back to default configurations.
export async function resetSettings(): Promise<Settings> {
  const db = await getDB();
  await db.put('settings', { ...DEFAULT_SETTINGS, id: SETTINGS_KEY });
  return DEFAULT_SETTINGS;
}
