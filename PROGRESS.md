# Ember: Build Progress & Tracking

## Milestone Status

| Milestone | Status | Description |
|---|---|---|
| **M0: Project skeleton & installable shell** | **Done** | Vite + React + TS, PWA manifest, iOS head tags, config constants, placeholder home, icons |
| **M1: Data layer** | **Done** | IndexedDB schema, migrations, repositories, sample content, /dev tools |
| **M2: Design system & Home** | **Done** | tokens.css, Fraunces/Inter fonts, living background, Home screen, styleguide |
| **M3: Onboarding & Lock** | **Done** | Newcomer onboarding, WebCrypto PIN hashing, lock screen, privacy curtain |
| **M4: Content management** | **Done** | Add/edit media (photo/video/text), posters, drag-and-drop, Library |
| **M5: Sessions** | **Done** | Weighted selection engine, ritual orb, session viewer, mode settings |
| **M6: Habituation** | **Done** | "This helped" tracking, weighted draws, item stats, "Not landing" flags |
| **M7: Rescue next step** | **Done** | 2-minute action prompt, last-time tile reminder, next-steps library tab |
| **M8: Backup & Settings** | **Done** | Zip export/import, storage meter, export reminders, settings completion |
| **M9: Polish & Portfolio** | **Done** | Accessibility pass, time-of-day tints, performance audits, portfolio README |

---

## Decisions Made

- **M0 Skeleton & Tooling**: Configured Vite 6 + React 18 + TypeScript in strict mode. Used ESLint 9 with flat config (`typescript-eslint`) and Vitest for testing.
- **PWA Service Worker**: Configured `vite-plugin-pwa` with `generateSW` and `autoUpdate` to precache all static assets, scripts, stylesheets, fonts, and icons for offline reliability.
- **iOS Meta Configuration**: Embedded `apple-mobile-web-app-capable`, `mobile-web-app-capable`, `black-translucent` status bar, and `viewport-fit=cover` in `index.html` to support native-feeling Home Screen installation on iPhones and Android.
- **M1 IndexedDB Architecture**:
  - Implemented versioned migrations in `src/data/db.ts` starting at version 1 to protect existing data in future releases.
  - Split content into `items` (metadata), `blobs` (binary media), and `posters` (thumbnails) so lists load fast without loading full video or photo binaries into memory.
  - Implemented atomic multi-store transactions (`createItem`, `deleteItem`) ensuring media Blobs, thumbnail posters, and item metadata stay strictly in sync with zero orphaned records.
- **M2 Design System & Visual Identity**:
  - Engineered the **LivingBackground** using 4 large blurred radial gradient orbs driven by GPU-accelerated CSS `transform` on 50s-80s loops with 1.2s accent cross-fading.
  - Implemented the full 10-component Ember design system and interactive styleguide at `/dev/styleguide`.
- **M3 Security, Lock Screen, and Onboarding**:
  - Salted PBKDF2-SHA256 hashing (200,000 iterations), timestamp-based inactivity locking, exponential lockout delays for wrong attempts, and an instant privacy curtain.
  - Connected onboarding completion directly to live React memory (`completeOnboarding`) to prevent navigation bounce-backs.
- **M4 Full Content Management (Text, Photos, Video)**:
  - **Image Pipeline**: Reads photos via `createImageBitmap` with automatic EXIF orientation correction. Downscales images exceeding 2400px or 3 MB to JPEG (0.88 quality) while keeping aspect ratio. Preserves animated GIFs without re-encoding. Generates 400px thumbnail posters stored in `posters` for instant grid rendering.
  - **Video Pipeline**: Extracts duration and native dimensions from hidden video elements, captures a 720px poster frame at 0.5s into the clip, and stores original media as Blobs. Validates a 500 MB hard limit and 150 MB storage warnings. Provides SVG gradient fallback thumbnails if codecs cannot be rendered to canvas.
  - **Caption Rule**: Single text + 1 file becomes 1 media item with caption. Multiple files create separate items with individual progress indicators and captions disabled with a helpful hint.
  - **Drag-and-Drop**: Desktop overlay accepts media files dragged anywhere onto Library or Add screens.
  - **Library & Next Steps Screen**: Full-featured responsive grid with mode filtering, type filtering (text/photo/video), retired filtering, and an integrated Rescue Next Steps tab with check-off and delete.
  - **Item Detail & Edit**: Live editing of text/captions, cycling mode chips (Off, Rotating, Core), retiring/restoring items, viewing statistics, and permanent deletion with confirmation.
- **M5 Core Sessions & Selection Engine**:
  - **Selection Engine**: Pure mathematical functions in `src/engine/selection.ts` that prioritize core items first, followed by weighted draws from a persisted shuffle bag without replacement. Auto-refills when depleted. Boosts item weights dynamically based on recent "helped" events within a 90-day window (`1 + 0.4 * min(helps, 5)`). Implements local-day caching (`YYYY-MM-DD`) for daily refresh modes, with automatic replacement for any item retired mid-day.
  - **Breath-Paced Ritual (`<Ritual />`)**: Glowing orb inhalation expansion and gentle dissolve. Auto-scales across daily opens (1st open: full 4.0s with mode cue text; 2nd open: short 1.5s; 3rd+ opens: none). Caps Rescue mode at the short ritual regardless of daily open counts. Fully skippable with a single tap at any time.
  - **Finite Feed Session Viewer (`/session/:mode`)**:
    - Dynamic text sizing with Fraunces display font by character count (<60 large, 60-160 medium, 160-400 regular, >400 small with scrolling), respecting user line breaks.
    - Contained photos over blurred, darkened copies of themselves with elegant italic captions.
    - Inline video playback with audio toggle, sound-on-by-default detection, tap-to-pause, and thin progress line.
    - Media preloading and memory safety (automatic revocation of object URLs).
    - Left 1/3 and right 2/3 tap navigation zones, horizontal touch swipe gestures, and arrow key support.
    - Floating UI chrome that gently auto-hides after 2 seconds of inactivity and reappears on interaction.
    - Immediate `ShowEvent` creation, live dwell duration calculation upon leaving items, and single-tap "This helped" toggle.
    - End screen offering "Done" and "Show me more" (up to 3 additional items per session). In Rescue mode, seamlessly transitions to the 2-minute action step prompt.
  - **Mode Customization (`/modes/:mode`)**: Direct customization of space labels, descriptions, and cues (with "Reset to defaults" fallback), rotating count adjusters (1-10), refresh policy selection (`daily` vs `each-session`), and core ordering controls (with manual Up/Down reordering when fixed and core warning notes above 5 items).
  - **Open-Into Startup Setting**: Configurable startup destination ('Home', 'Start', 'Charge', 'Rescue') in Settings that directs the app to the chosen space on launch.
- **M6 Habituation Engine & Statistics**:
  - **Habituation Pure Functions (`src/engine/habituation.ts`)**:
    - `computeItemStats`: Aggregates total shows, total helped events, dwell time, and per-mode breakdowns across all historical events.
    - `findNotLandingItems`: Flags items shown at least 8 times (`NOT_LANDING_MIN_SHOWS`) in a given mode with 0 "helped" events.
  - **Cross-Mode Isolation**: "Helped" marks boost selection weight strictly within the active mode (`1 + 0.4 * min(helped, 5)`), keeping items independently calibrated across Start, Charge, and Rescue.
  - **Library UI Enhancements**:
    - "Not landing" filter chip in the library sub-header to inspect unhelpful items across all spaces.
    - Prominent warning badges and a one-tap "Retire" shortcut button directly on item cards in the library grid.
  - **Item Detail Screen (`/library/:id`)**:
    - "Not landing in [Mode]" banner with one-tap retire action.
    - Statistics section displaying total shows, times helped, average dwell time (in seconds), and per-space breakdowns (Start, Charge, Rescue).
- **M7 Rescue Next Step**:
  - **2-Minute Action Prompt**: Seamlessly appears at the end of a Rescue session (replacing the standard end screen), or anytime via the "Skip to next step" link in the top bar. Automatically focuses the input field, supports Enter-to-save, and is fully skippable with a single tap to return Home.
  - **"Last Time" Home Tile Reminder**: Queries the `nextSteps` store on launch for undone items created within the last 24 hours. Displays a quiet line ("Last time: [step]") on the Rescue tile with "Done" (which timestamps `doneAt` in IndexedDB) and "Dismiss" (which hides it for the active session).
  - **Library "Next Steps" Management Tab**: Tab selector on `/library` displaying all steps ordered newest first, complete with one-tap completion toggle checkboxes and deletion.
- **M8 Data Safety, Backup/Restore, Storage Meter, and Settings Completion**:
  - **Export Engine (`client-zip`)**: Packages `manifest.json` (version 1, export date, items, events, nextSteps, safe settings without PIN hash, modes config), all media Blobs under `media/`, and thumbnails under `posters/`. On mobile/iOS Safari, triggers native Web Share sheet with fallback to download. Records `lastExportAt` timestamp.
  - **Streaming Import Engine (`fflate`)**: Uses streaming `Unzip` to decompress and process entries progressively without loading entire uncompressed archives into memory. Supports "Merge" (default: skips duplicate IDs) and "Replace everything" (clean overwrite while preserving user's active PIN). Throws descriptive validation errors on corrupt archives or incompatible versions.
  - **Storage Meter & Persistence**: Displays device storage used, percentage of quota, quota limit, and persistent storage grant status with one-tap protection request in Settings. Per-item file size is shown directly on cards in the Library.
  - **Export Reminder**: Shows a quiet reminder banner on Home when content has not been backed up within 30 days (`EXPORT_REMINDER_DAYS`) or has never been backed up.
  - **Settings Screen Completion**: Includes lock timeout selector, ritual toggle and scale, open-into destination, default sound toggle, space configuration links, storage meter, backup & restore actions, sample content loader, and full reset with irreversible `ERASE` confirmation.
- **M9 Polish, Accessibility, Time-of-Day Tints, and Portfolio README**:
  - **Time-of-Day LivingBackground Tints**: Added automatic subtle hue adjustments based on current local hour (morning warm amber shift 5am-12pm, natural afternoon daylight 12pm-6pm, twilight evening hue 6pm-5am). Filter effects are automatically disabled when `@media (prefers-reduced-motion: reduce)` is enabled.
  - **Route Lazy Loading (`Suspense` & `React.lazy`)**: Split all 9 screen components into independent dynamic import chunks with a quiet loader fallback, keeping the initial JS bundle minimal.
  - **Accessibility Audit**: Verified contrast, focus outlines, 44px minimum touch targets across all buttons and controls, and descriptive ARIA roles and labels.
  - **Intentional Palette Redesign**: Replaced the original green-teal Rescue with Twilight Iris (`#7B8CE2`) and refined Start to Sunrise Honey (`#F0A35B`), while keeping Charge as Radiant Crimson Red (`#FF5459`). Completely eliminates stop-light associations while keeping Charge motivated and fired-up.
  - **Light Mode System**: Engineered a warm parchment paper Light Theme (`#FAF8F5` base, `#1A1816` ink text) with soft watercolor LivingBackground blooms. Added an instant Sun/Moon toggle button to the Home top navigation bar and an "Appearance" preference selector (`Dark`, `Light`, `System`) in Settings. Integrated zero-FOUC theme hydration in `index.html`.
  - **iOS Standalone Viewport & Bottom Cutoff Fix**:
    - Embedded `viewport-fit=cover` in `<meta name="viewport">` in `index.html` to allow the app to render behind the iOS home indicator bar and status notch.
    - Swapped all viewport height rules from legacy `100vh` to dynamic `100dvh` (`min-height: 100dvh`) across `html`, `body`, `#root`, and route loading fallbacks so iOS standalone mode calculates true usable screen height.
    - Replaced `height: 100%` on `html, body` with `min-height: 100dvh`, `overflow-x: hidden`, and `overflow-y: auto` with `-webkit-overflow-scrolling: touch` to prevent scroll clipping and scroll-trapping in WebKit standalone mode.
    - Updated primary layout and screen wrappers (`ScreenLayout`, `HomeScreen`, `LibraryScreen`, `SettingsScreen`, `ModeSettingsScreen`, `ItemEditScreen`, `StyleguideScreen`, `DevScreen`, `OnboardingScreen`, and `SessionScreen` chrome) with `padding-bottom: calc(24px + env(safe-area-inset-bottom, 0px))` so bottom items in lists scroll completely clear of the home indicator bar with 24px of breathing room.
    - Added `min-height: 0` to inner flex containers (`.modes-container`, `.library-items-view`, `.nextsteps-list`, `.settings-body`, `.mode-settings-body`, `.item-edit-body`, `.onboarding-body`) to allow flex items to shrink properly and prevent flexbox scroll trapping.
  - **Library Filter Pill Rows Mobile Optimization**:
    - Updated `.filter-group` with `flex-wrap: nowrap;`, `white-space: nowrap;`, and 5px pill gaps so that all pills in each group (Spaces: All/Start/Charge/Rescue; Types: All/Text/Photos/Videos; Status: All Active/Retired/Not landing) stay cleanly on a single line on mobile screens.
    - Adjusted filter chip metrics (`padding: 4px 8px;`, `font-size: 0.75rem;`, `min-height: 32px;`, `gap: 5px;`, 6px indicator dots) so the rows fit comfortably within standard 375px+ mobile viewport widths without wrapping or awkward truncation.
    - Added hidden-scrollbar horizontal scroll fallbacks (`overflow-x: auto; scrollbar-width: none;`) to safeguard narrow or high-zoom displays.
  - **Portfolio Documentation (`README.md`)**: Complete portfolio write-up covering product vision, user problem, architectural decisions, iOS constraint solutions, local zero-network proof, testing methodology, and instructions for visitors.

---

## Known Issues & Notes

- *None.* All 71 unit and integration tests pass, linter reports 0 problems, and the production build completes cleanly.

---

## How to Run the App

1. Install dependencies: `npm install`
2. Generate icons: `npm run generate-icons`
3. Start dev server: `npm run dev`
4. Run tests: `npm run test`
5. Run linter: `npm run lint`
6. Production build: `npm run build`
7. Preview production build: `npm run preview`
8. Open Library: navigate to `/library`
9. Add content: navigate to `/library/new`
10. Open Settings: navigate to `/settings`

---

## Later List (Deferred Features)

- User-created custom modes and user-selected mode accent colors.
- Localization / internationalization for additional languages.
- Optional encrypted storage with key derived from user PIN.
- Opt-in cloud sync.
- Reading "Last time" next steps back into content as accomplishment markers.
- Per-item day-of-week scheduling (e.g. "only on Mondays").
- Weekly review summary screen showing what helped most.
