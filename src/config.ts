// Tunable application constants and defaults for Ember.
// All user-facing constants and numbers live here so they can be changed without hunting through code.

import type { Mode, ModeConfig, Settings } from './types';

// App branding
export const APP_NAME = 'Ember';

// Security and PIN settings
export const LOCK_TIMEOUT_DEFAULT_MS = 300_000; // 5 minutes in milliseconds
export const PIN_MIN_LENGTH = 4;
export const PIN_MAX_LENGTH = 8;
export const PBKDF2_ITERATIONS = 200_000;

// Ritual durations (breath-paced opening)
export const RITUAL_FULL_MS = 4_000;
export const RITUAL_SHORT_MS = 1_500;

// Habituation and weighting constants
export const HELPED_BOOST_PER_HELP = 0.4;
export const HELPED_BOOST_CAP = 5;
export const HELPED_WINDOW_DAYS = 90;
export const NOT_LANDING_MIN_SHOWS = 8;
export const CORE_WARN_COUNT = 5;
export const EXTRA_ITEMS_MAX = 3;

// Media processing limits
export const IMAGE_MAX_EDGE = 2400; // Maximum dimension in pixels
export const IMAGE_REENCODE_BYTES = 3_145_728; // 3 MB threshold for re-encoding
export const JPEG_QUALITY = 0.88;
export const VIDEO_WARN_BYTES = 157_286_400; // 150 MB warning threshold
export const VIDEO_MAX_BYTES = 524_288_000; // 500 MB hard limit

// Storage and backup
export const EXPORT_REMINDER_DAYS = 30;

// Motion and transition durations in milliseconds
export const TRANSITIONS = {
  screenMs: 350,
  itemMs: 750,
  reducedMotionMs: 150,
  accentMs: 1200,
} as const;

// Theme colors and mode accents
export const COLORS = {
  bgBase: '#0B0B10',
  bgSurface: '#16161F',
  textPrimary: '#F3EFE8',
  textSecondary: 'rgba(243, 239, 232, 0.6)',
  borderQuiet: 'rgba(243, 239, 232, 0.1)',
  borderFocus: 'rgba(243, 239, 232, 0.35)',
  start: '#F4B97A',   // Warm amber for Start mode
  charge: '#FF6B6B',  // Hot coral for Charge mode
  rescue: '#5EC9B8',  // Calm teal for Rescue mode
} as const;

// Default mode configurations
export const DEFAULT_MODE_CONFIGS: Record<Mode, ModeConfig> = {
  start: {
    label: 'Start',
    description: 'Set your intention with calm reminders',
    cue: 'Set your intention',
    rotatingCount: 2,
    rotatingRefresh: 'daily',
    coreOrder: 'fixed',
    coreOrderIds: [],
  },
  charge: {
    label: 'Charge',
    description: 'Gather energy before a workout or big task',
    cue: 'Gather your energy',
    rotatingCount: 3,
    rotatingRefresh: 'each-session',
    coreOrder: 'shuffle',
    coreOrderIds: [],
  },
  rescue: {
    label: 'Rescue',
    description: 'Low-friction push when struggling to begin',
    cue: 'Start small',
    rotatingCount: 2,
    rotatingRefresh: 'each-session',
    coreOrder: 'shuffle',
    coreOrderIds: [],
  },
};

// Default application settings
export const DEFAULT_SETTINGS: Settings = {
  pin: null,
  lockTimeoutMs: LOCK_TIMEOUT_DEFAULT_MS,
  ritualEnabled: true,
  ritualScale: 'auto',
  openInto: 'home',
  soundOnByDefault: false,
  onboardingDone: false,
  lastExportAt: null,
  modes: DEFAULT_MODE_CONFIGS,
};
