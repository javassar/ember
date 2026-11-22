# Ember: Build Progress & Tracking

## Milestone Status

| Milestone | Status | Description |
|---|---|---|
| **M0: Project skeleton & installable shell** | **Done** | Vite + React + TS, PWA manifest, iOS head tags, config constants, placeholder home, icons |
| **M1: Data layer** | Not Started | IndexedDB schema, migrations, repositories, sample content, /dev tools |
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
- **PWA Service Worker**: Configured `vite-plugin-pwa` with `generateSW` and `autoUpdate` to precache all static assets, scripts, stylesheets, fonts, and icons for offline reliability. Navigation fallback ensures all URLs route cleanly to `index.html`.
- **iOS Meta Configuration**: Embedded `apple-mobile-web-app-capable`, `black-translucent` status bar, and `viewport-fit=cover` in `index.html` to support native-feeling Home Screen installation on iPhones.
- **Icon Generation**: Implemented a standalone generation script using `sharp` to render the soft ember radial glow across all required icon sizes (180x180 Apple touch icon, 192x192, 512x512, and 512x512 maskable).
- **Tunable Constants**: Centralized all timing, color, encryption, and operational thresholds in `src/config.ts`.
- **String Centralization**: All interface copy is centralized in `src/strings.ts` for clean maintenance and future localization.

---

## Known Issues & Notes

- *None.* All checks pass and the skeleton is fully verified.

---

## How to Run the App

1. Install dependencies: `npm install`
2. Generate icons: `npm run generate-icons`
3. Start dev server: `npm run dev`
4. Run tests: `npm run test`
5. Run linter: `npm run lint`
6. Production build: `npm run build`
7. Preview production build: `npm run preview`

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
