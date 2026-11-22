# Ember: Build Progress & Tracking

## Milestone Status

| Milestone | Status | Description |
|---|---|---|
| **M0: Project skeleton & installable shell** | **Done** | Vite + React + TS, PWA manifest, iOS head tags, config constants, placeholder home, icons |
| **M1: Data layer** | **Done** | IndexedDB schema, migrations, repositories, sample content, /dev tools |
| **M2: Design system & Home** | **Done** | tokens.css, Fraunces/Inter fonts, living background, Home screen, styleguide |
| **M3: Onboarding & Lock** | **Done** | Newcomer onboarding, WebCrypto PIN hashing, lock screen, privacy curtain |
| **M4: Content management** | **Done** | Add/edit media (photo/video/text), posters, drag-and-drop, Library |
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

---

## Known Issues & Notes

- *None.* All 40 unit and integration tests pass, linter reports 0 problems, and the production build completes cleanly.

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
- Light color theme.
- Localization / internationalization for additional languages.
- Optional encrypted storage with key derived from user PIN.
- Opt-in cloud sync.
- Reading "Last time" next steps back into content as accomplishment markers.
- Per-item day-of-week scheduling (e.g. "only on Mondays").
- Weekly review summary screen showing what helped most.
