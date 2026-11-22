// Centralized user-facing text strings for Ember.
// Storing all strings here keeps components clean and makes future translation straightforward.

export const STRINGS = {
  app: {
    name: 'Ember',
    tagline: 'A private, quiet space for deliberate content.',
    taglineSub: 'Offline, local-first, and always yours.',
  },
  nav: {
    home: 'Home',
    library: 'Library',
    settings: 'Settings',
    dev: 'Dev Tools',
  },
  home: {
    startSession: 'Start session',
    emptyTitle: 'Welcome to Ember',
    emptySubtitle: 'Add quotes, photos, or hype videos to begin.',
    addContent: 'Add your first item',
    offlineReady: 'Ready for offline use',
  },
  modes: {
    start: 'Start',
    charge: 'Charge',
    rescue: 'Rescue',
  },
  common: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    done: 'Done',
    skip: 'Skip',
    edit: 'Edit',
    retire: 'Retire',
    restore: 'Restore',
    loading: 'Loading...',
    sampleBadge: 'Sample',
    refresh: 'Refresh',
  },
  dev: {
    title: 'Developer Diagnostics',
    description: 'Internal tools for testing local storage, database counts, and sample content seeding.',
    storageHeader: 'Device Storage',
    storesHeader: 'IndexedDB Store Counts',
    actionsHeader: 'Actions',
    usedQuota: 'Storage Used',
    quotaLimit: 'Storage Quota',
    persistence: 'Persistent Storage',
    persistedGranted: 'Granted (Protected from eviction)',
    persistedDenied: 'Default (May be evicted under storage pressure)',
    seedButton: 'Seed Sample Content (12 items)',
    deleteSampleButton: 'Delete Sample Content',
    clearAllButton: 'Clear All Data (Factory Reset)',
    refreshCounts: 'Refresh Readouts',
    seedSuccess: 'Sample content successfully seeded.',
    deleteSampleSuccess: 'Sample content deleted.',
    clearSuccess: 'All local data cleared.',
    confirmClear: 'Are you sure you want to clear all data? This cannot be undone.',
  },
  offline: {
    badge: 'Offline mode active',
  },
} as const;
