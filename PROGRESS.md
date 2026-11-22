# Ember: Build Progress & Tracking

## Milestone Status

| Milestone | Status | Description |
|---|---|---|
| **M0: Project skeleton & installable shell** | **Done** | Vite + React + TS, PWA manifest, iOS head tags, config constants, placeholder home, icons |
| **M1: Data layer** | **Done** | IndexedDB schema, migrations, repositories, sample content, /dev tools |
| **M2: Design system & Home** | Not Started | tokens.css, Fraunces/Inter fonts, living background, Home screen, styleguide |
| **M3: Onboarding & Lock** | Not Started | Newcomer onboarding, WebCrypto PIN hashing, lock screen, privacy curtain |
| **M4: Content management** | Not Started | Add/edit media (photo/video/text), posters, drag-and-drop, Library |
| **M5: Sessions** | Not Started | Weighted selection engine, ritual orb, session viewer, mode settings |
| **M6: Habituation** | Not Started | "This helped" tracking, weighted draws, item stats, "Not landing" flags |
| **M7: Rescue next step** | Not Started | 2-minute action prompt, last-time tile reminder, next-steps library tab |
| **M8: Backup & Settings** | Not Started | Zip export/import, storage meter, export reminders, settings completion |
| **M9: Polish & Portfolio** | Not Started | Accessibility pass, time-of-day tints, performance audits, portfolio README |

---

## Decisions Made

- **M0 Skeleton & Tooling**: Configured Vite 6 + React 18 + TypeScript in strict mode. Used ESLint 9 with flat config (`typescript-eslint`) and Vitest for testing.
- **PWA Service Worker**: Configured `vite-plugin-pwa` with `generateSW` and `autoUpdate` to precache all static assets, scripts, stylesheets, fonts, and icons for offline reliability.
- **iOS Meta Configuration**: Embedded `apple-mobile-web-app-capable`, `black-translucent` status bar, and `viewport-fit=cover` in `index.html` to support native-feeling Home Screen installation on iPhones.
- **M1 IndexedDB Architecture**:
  - Implemented versioned migrations in `src/data/db.ts` starting at version 1 to protect existing data in future releases.
  - Split content into `items` (metadata), `blobs` (binary media), and `posters` (thumbnails) so lists load fast without loading full video or photo binaries into memory.
  - Implemented atomic multi-store transactions (`createItem`, `deleteItem`) ensuring media Blobs, thumbnail posters, and item metadata stay strictly in sync with zero orphaned records.
  - Added indexes on `items` (`by-created`, `by-type`), `events` (`by-item`, `by-mode`, `by-session`, `by-shown`), and `nextSteps` (`by-created`).
- **Storage Persistence**: Added `requestPersistentStorage()` at app startup to prompt browsers (specifically Safari and Chrome) not to evict local data during disk pressure. Added storage quota and usage estimators.
- **Sample Content**: Authored 12 warm, universal text items spanning Start, Charge, and Rescue modes with mixed core/rotating assignments. Tagged each with a hidden `isSample: true` flag for safe one-tap deletion.
- **Developer Diagnostics**: Created `/dev` screen displaying live store counts, storage quota usage, persistence status, seed/delete sample buttons, and full factory reset.

---

## Known Issues & Notes

- *None.* All 16 unit and integration tests pass, linter reports 0 problems, and the production build completes cleanly.

---

## How to Run the App

1. Install dependencies: `npm install`
2. Generate icons: `npm run generate-icons`
3. Start dev server: `npm run dev`
4. Run tests: `npm run test`
5. Run linter: `npm run lint`
6. Production build: `npm run build`
7. Preview production build: `npm run preview`
8. Open diagnostics: navigate to `/dev`

---

## Later List (Deferred Features)

- User-created custom modes and user-selected mode accent colors.
- Light color theme.
- Localization / internationalization for additional languages.
- Optional encrypted storage with key derived from user PIN.
- Opt-in cloud sync.
- Reading "Last time" next steps back into content as accomplishment markers.
- Per-item day-of-week scheduling (e.g. "only on Mondays").
- Weekly review summary screen showing what helped most.
