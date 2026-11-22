# Ember: Build Progress & Tracking

## Milestone Status

| Milestone | Status | Description |
|---|---|---|
| **M0: Project skeleton & installable shell** | **Done** | Vite + React + TS, PWA manifest, iOS head tags, config constants, placeholder home, icons |
| **M1: Data layer** | **Done** | IndexedDB schema, migrations, repositories, sample content, /dev tools |
| **M2: Design system & Home** | **Done** | tokens.css, Fraunces/Inter fonts, living background, Home screen, styleguide |
| **M3: Onboarding & Lock** | **Done** | Newcomer onboarding, WebCrypto PIN hashing, lock screen, privacy curtain |
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
  - Engineered the **LivingBackground** using 4 large blurred radial gradient orbs driven by GPU-accelerated CSS `transform` on 50s-80s loops with 1.2s accent cross-fading.
  - Implemented the full 10-component Ember design system and interactive styleguide at `/dev/styleguide`.
- **M3 Security, Lock Screen, and Onboarding**:
  - **Salted PBKDF2-SHA256 Hashing**: Used standard WebCrypto (`crypto.subtle`) with 200,000 iterations to derive a 256-bit hash. Never stores plaintext PINs.
  - **Timestamp Inactivity Tracking**: Used `localStorage` timestamps and `visibilitychange` rather than fragile background JavaScript timers, guaranteeing reliable lock timeouts even when iOS suspends apps in the background.
  - **Exponential Lockout Delay**: Persisted wrong attempt counts and lockout expiration timestamps in IndexedDB (`state` store) so force-closing or refreshing the browser cannot bypass wrong PIN blocks (30s after 5 attempts, doubling up to 15 min).
  - **Forgot PIN Erase Flow**: Required typing `ERASE` to wipe content and reset settings, maintaining local privacy while preventing accidental resets.
  - **Privacy Curtain**: Deployed an opaque full-screen cover on `visibilitychange === 'hidden'` and `pagehide` to guard private content from appearing in iOS app-switcher snapshots.
  - **Newcomer Onboarding Flow**: Created an accessible 4-step skippable onboarding tour (`/onboarding`) introducing deliberate content concepts, the three modes, optional PIN creation, platform-specific install guidance, and sample seeding.

---

## Known Issues & Notes

- *None.* All 34 unit and integration tests pass, linter reports 0 problems, and the production build completes cleanly.

---

## How to Run the App

1. Install dependencies: `npm install`
2. Generate icons: `npm run generate-icons`
3. Start dev server: `npm run dev`
4. Run tests: `npm run test`
5. Run linter: `npm run lint`
6. Production build: `npm run build`
7. Preview production build: `npm run preview`
8. Walk through onboarding: navigate to `/onboarding`
9. Open Settings & PIN controls: navigate to `/settings`
10. Open Styleguide: navigate to `/dev/styleguide`
11. Open diagnostics: navigate to `/dev`

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
