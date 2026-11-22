// Type definitions for Ember data models, configuration, and session structures.

export type Mode = 'start' | 'charge' | 'rescue';
export type Membership = 'off' | 'rotating' | 'core';

export interface Item {
  id: string;
  type: 'text' | 'image' | 'video';
  text?: string;            // Body for text items, caption for media items
  mediaId?: string;         // Key into `blobs` store
  width?: number;
  height?: number;
  durationSec?: number;
  modes: Record<Mode, Membership>;
  createdAt: number;
  updatedAt: number;
  retiredAt: number | null; // Retired items are never shown but are kept
  isSample?: boolean;       // Hidden flag to identify sample content
}

export interface BlobRecord {
  id: string;
  blob: Blob;
  mime: string;
  size: number;
}

export interface PosterRecord {
  itemId: string;
  blob: Blob;
}

export interface ShowEvent {
  id: string;
  itemId: string;
  mode: Mode;
  sessionId: string;
  shownAt: number;
  dwellMs: number;
  helped: boolean;
}

export interface NextStep {
  id: string;
  text: string;
  createdAt: number;
  doneAt: number | null;
}

export interface ModeConfig {
  label: string;                              // User-editable display name
  description: string;                        // One-line description shown on the home tile
  cue: string;                                // Line shown during the full ritual
  rotatingCount: number;                      // How many rotating items per session
  rotatingRefresh: 'daily' | 'each-session';  // Daily or each-session refresh policy
  coreOrder: 'fixed' | 'shuffle';
  coreOrderIds: string[];                     // Item IDs in fixed order
}

export interface PinConfig {
  salt: string;
  hash: string;
  iterations: number;
  length: number;
}

export interface Settings {
  pin: PinConfig | null;
  lockTimeoutMs: number;                      // 0 means lock every time
  ritualEnabled: boolean;
  ritualScale: 'auto' | 'full' | 'short';
  openInto: 'home' | Mode;
  soundOnByDefault: boolean;
  onboardingDone: boolean;
  lastExportAt: number | null;
  modes: Record<Mode, ModeConfig>;
}

export interface EngineState {
  bags: Record<Mode, string[]>;
  dailyPicks: Record<Mode, { date: string; itemIds: string[] }>;
  sessionCounts: {
    lastSessionDate: string;
    countToday: number;
    modeCountsToday?: Record<Mode, number>;
  };
}
