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
  },
  offline: {
    badge: 'Offline mode active',
  },
} as const;
