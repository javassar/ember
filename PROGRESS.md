# Ember: Build Progress & Tracking

## Milestone Status

| Milestone | Status | Description |
|---|---|---|
| **M0: Project skeleton & installable shell** | **Done** | Vite + React + TS, PWA manifest, iOS head tags, config constants, placeholder home, icons |
| **M1: Data layer** | **Done** | IndexedDB schema, migrations, repositories, sample content, /dev tools |
| **M2: Design system & Home** | **Done** | tokens.css, Fraunces/Inter fonts, living background, Home screen, styleguide |
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
- **iOS Meta Configuration**: Embedded `apple-mobile-web-app-capable`, `mobile-web-app-capable`, `black-translucent` status bar, and `viewport-fit=cover` in `index.html` to support native-feeling Home Screen installation on iPhones and Android.
- **M1 IndexedDB Architecture**:
  - Implemented versioned migrations in `src/data/db.ts` starting at version 1 to protect existing data in future releases.
  - Split content into `items` (metadata), `blobs` (binary media), and `posters` (thumbnails) so lists load fast without loading full video or photo binaries into memory.
  - Implemented atomic multi-store transactions (`createItem`, `deleteItem`) ensuring media Blobs, thumbnail posters, and item metadata stay strictly in sync with zero orphaned records.
- **M2 Design System & Visual Identity**:
  - Engineered the **LivingBackground** using 4 large blurred radial gradient orbs driven by GPU-accelerated CSS `transform` on 50s-80s loops. Accent colors cross-fade over 1.2s on mode transitions. Animations automatically pause when the tab/page is hidden (`visibilitychange`), and reduce to a static soothing gradient when `prefers-reduced-motion` is active.
  - Created zero-dependency accessible SVG icons (`src/components/Icons.tsx`) with strict 44px minimum touch targets and screen-reader labels.
  - Implemented the complete 10-component Ember design system: `Button`, `IconButton`, `Toggle`, `SegmentedControl`, `Chip`, `TextArea`, `ProgressDots`, `NumberPad`, `Sheet`, and `Toast`.
  - Built the real **Home screen** (`src/screens/HomeScreen.tsx`) with dynamic mode tiles (Start, Charge, Rescue), hover/focus accent cross-fading, header navigation icons, and Rescue next-step reminder integration.
  - Built the interactive **Styleguide** (`src/screens/StyleguideScreen.tsx`) at `/dev/styleguide` demonstrating type scales, color swatches, background switching, and live component states.

---

## Known Issues & Notes

- *None.* All 26 unit and integration tests pass, linter reports 0 problems, and the production build completes cleanly.

---

## How to Run the App

1. Install dependencies: `npm install`
2. Generate icons: `npm run generate-icons`
3. Start dev server: `npm run dev`
4. Run tests: `npm run test`
5. Run linter: `npm run lint`
6. Production build: `npm run build`
7. Preview production build: `npm run preview`
8. Open Styleguide: navigate to `/dev/styleguide`
9. Open diagnostics: navigate to `/dev`

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
