# Ember: Build Specification (working title)

Ember is a private, local-first PWA (installable web app) where anyone can store their own motivating content (text, photos, video) and view it in short, finite sessions. Each user chooses their own "algorithm" through simple settings. The app name is a single constant in `src/config.ts` and can be changed at any time.

---

## 0. Instructions for the coding agent (read first)

**Two audiences, keep them separate.** The *builder* is Jackie, who directs you and has no coding background. The *users* are anyone who finds the app, including strangers who know nothing about it, use different phones, and never read this spec. Everything you tell Jackie is for the builder. Everything inside the app (copy, defaults, onboarding, sample content, behavior) must work for a stranger. Jackie is one of the first users, not the only one, so never hard-code her preferences, routines, location, or wording into the product.

1. Read this entire file before writing any code. If `PROGRESS.md` exists, read it too and resume from it.
2. Work on one milestone at a time, in order (M0 to M9). When a milestone is finished, stop, report, and wait for Jackie to say "go" before starting the next.
3. Jackie has no coding background. Everything you tell her must be in plain language: what you built, how to run it, exactly what to click to test it, and what she should see. Explain any technical term in one short sentence the first time you use it. When this spec leaves a decision open, make the decision, and state it in one sentence.
4. You have near-full permission to work without asking. Ask first only before git commits and before deleting files. Propose one commit per milestone with a clear message.
5. Keep `PROGRESS.md` current: milestone status, decisions made, known issues, how to run the app, and a "Later" list. A fresh session with no memory must be able to resume from this file alone. Ideas that come up mid-build go in the "Later" list, never into the code.
6. Dependencies: use only the ones listed in section 2. If you need another, explain why and ask.
7. Privacy rule (this is a product promise): after the app's first load, it makes zero network requests. No analytics, no third-party scripts, no CDN fonts, no remote images, no error-reporting services. All user data stays on the device.
8. Code quality matters because this is a portfolio piece: TypeScript in strict mode, small focused files, a one or two line plain-English comment at the top of every file saying what it does, no dead code, consistent naming, and a README that stays accurate.
9. Put every tunable number in `src/config.ts` (list in section 4.9) so Jackie can ask for changes without hunting through code.
10. If a requirement turns out to be impossible or unreliable on iOS Safari, tell Jackie before building and propose the closest alternative.
11. Before reporting any milestone as done: run the build, the linter, and the tests. Report the results in plain words ("all 14 tests passed"). Never report a milestone as done with a failing check.
12. Each milestone ends with a "Jackie's test steps" list. Present those steps to her as a numbered list and say which steps need her iPhone.

---

## 1. Product summary

**Who it is for:** anyone who wants a more deliberate relationship with the content they see each day. Example users: someone who says affirmations each morning, an athlete who watches a hype video before training, a student who needs a push to start studying, someone who wants a calm reminder of what matters to them. The product makes no assumptions about age, fitness level, beliefs, or goals.

**Where it runs:** installed to the Home Screen on iPhone (iOS 16.4 or later), installed on Android through Chrome, and in desktop browsers (Chrome, Edge, Safari, Firefox). Core features must work on all of them. Where a feature is unavailable on a platform, degrade gracefully and say so in plain words.

**Distribution model:** a public web address with no accounts. Because all data is local, every visitor gets their own private, empty copy, and the developer never sees anyone's content. The same address can go in a portfolio.

**Why it exists:** content apps are built to never end and to follow someone else's algorithm. Ember shows only content the user chose, in a short finite set, so content consumption becomes deliberate. One central use case is executive-function support: opening the app at any point in the day (morning, before a workout, or mid-struggle) and getting pushed toward action. The same structure serves calmer uses such as morning intentions.

**Design principles**
1. **Finite.** Every session ends with a clear "that's your set" moment. No infinite scroll.
2. **Owned.** The user supplies all content. The app ships with none (except optional sample text).
3. **Private.** Data never leaves the device. A PIN gates opening.
4. **Low friction when struggling.** The fewer taps and decisions between opening the app and seeing content, the better. Rescue mode is the design priority.
5. **Slow and deliberate.** Visuals are calm, typographic, and unhurried.
6. **Self-explanatory.** A stranger can install it, add content, and finish a session without reading anything first. Onboarding teaches the concept in a few seconds, and every empty screen says what to do next.
7. **Configurable by the user.** Names, pacing, and selection rules are the user's to set. Nothing in the product assumes one person's routine.

---

## 2. Platform and tech stack

- **Build tool and language:** Vite, React 18, TypeScript (strict).
- **Routing:** `react-router-dom` v6 with browser history. Add a `vercel.json` rewrite so all paths serve `index.html`.
- **PWA:** `vite-plugin-pwa` (Workbox). Precache the whole app so it loads offline after the first visit. Web manifest with `display: standalone`.
- **Storage:** IndexedDB through the `idb` library. Media is stored as Blobs.
- **Export and import:** `client-zip` to write the backup zip, `fflate` (streaming `Unzip`) to read it, so large videos are not all held in memory at once.
- **Styling:** plain CSS with custom properties (design tokens) in `src/styles/tokens.css`. No Tailwind, no component library.
- **Animation:** CSS transitions and keyframes only. No animation library.
- **Fonts (self-hosted via npm, so they work offline):** `@fontsource-variable/fraunces` for content and display text, `@fontsource-variable/inter` for interface text.
- **IDs:** `crypto.randomUUID()`.
- **Text strings:** every user-facing string lives in `src/strings.ts` (English only in v1), so translation is possible later without hunting through components.
- **Browser support:** iOS Safari 16.4+, current Chrome and Edge (desktop and Android), current Safari and Firefox on desktop. Feature-detect (IndexedDB, service workers, `createImageBitmap`, Web Share) and show a clear message on an unsupported browser.
- **Tests:** Vitest, plus `fake-indexeddb` as a dev dependency for storage tests.
- **Icons:** one-off generation script may use `sharp` as a dev dependency.
- **No backend, no database service, no accounts.** Hosting is static on Vercel. Jackie deploys it herself through GitHub and Vercel; the agent's job is to keep `npm run build` passing and tell her when something is ready to deploy.

Suggested folders: `src/config.ts`, `src/data/` (IndexedDB and repositories), `src/engine/` (pure selection logic, no UI), `src/screens/`, `src/components/`, `src/styles/`, `src/lib/` (media processing, crypto, dates).

---

## 3. Data model

Everything lives in IndexedDB database `ember` with versioned migrations (start at version 1, write migrations as a function so future changes do not wipe data).

**Object stores**
- `items`: one record per piece of content.
- `blobs`: `{ id, blob, mime, size }` for media files, kept separate from item metadata so lists load fast.
- `posters`: `{ itemId, blob }` thumbnails for videos and images used in the library grid.
- `events`: one record each time an item is shown in a session.
- `nextSteps`: Rescue next-step entries.
- `state`: engine state (shuffle bags, daily picks, session counters).
- `settings`: a single settings document.

```ts
type Mode = 'start' | 'charge' | 'rescue';
type Membership = 'off' | 'rotating' | 'core';

interface Item {
  id: string;
  type: 'text' | 'image' | 'video';
  text?: string;            // the body for text items, the caption for media items
  mediaId?: string;         // key into `blobs`
  width?: number; height?: number; durationSec?: number;
  modes: Record<Mode, Membership>;   // per-mode membership
  createdAt: number; updatedAt: number;
  retiredAt: number | null; // retired items are never shown but are kept
}

interface ShowEvent {
  id: string; itemId: string; mode: Mode; sessionId: string;
  shownAt: number; dwellMs: number; helped: boolean;
}

interface NextStep { id: string; text: string; createdAt: number; doneAt: number | null; }

interface ModeConfig {
  label: string;                              // user-editable name, defaults below
  description: string;                        // user-editable one-line description shown on the home tile
  cue: string;                                // user-editable line shown during the full ritual
  rotatingCount: number;                      // how many rotating items per session
  rotatingRefresh: 'daily' | 'each-session';  // new picks every open, or one set per local day
  coreOrder: 'fixed' | 'shuffle';
  coreOrderIds: string[];                     // used when coreOrder is 'fixed'
}

interface Settings {
  pin: { salt: string; hash: string; iterations: number; length: number } | null;
  lockTimeoutMs: number;                      // 0 means lock every time
  ritualEnabled: boolean;
  ritualScale: 'auto' | 'full' | 'short';
  openInto: 'home' | Mode;
  soundOnByDefault: boolean;
  onboardingDone: boolean;
  lastExportAt: number | null;
  modes: Record<Mode, ModeConfig>;
}
```

A media item has one media file. Text on a media item is its caption. A text-only item has no media. One item can be core in one mode, rotating in another, and off in a third.

"Day" always means the local calendar date on the device (use the device's time zone, and handle daylight saving changes correctly).

---

## 4. Behavior specifications

### 4.1 Modes
Three modes in v1, with fixed internal IDs (`start`, `charge`, `rescue`) so data stays consistent. Each has its own accent color and `ModeConfig`. **Users can rename each mode and edit its description and ritual cue** in the mode settings screen, and a "Reset to default" button restores the originals. Users cannot add or remove modes in v1. The names below are defaults chosen to make sense to a newcomer.

| Mode | Purpose | Default config |
|---|---|---|
| **Start** | Calm, intention-setting, such as morning affirmations. Default cue: "Set your intention". | rotatingCount 2, refresh `daily`, coreOrder `fixed` |
| **Charge** | Higher energy, such as before a workout or a big task. Default cue: "Gather your energy". | rotatingCount 3, refresh `each-session`, coreOrder `shuffle` |
| **Rescue** | For moments of struggling to begin something. Lowest friction. Default cue: "Start small". | rotatingCount 2, refresh `each-session`, coreOrder `shuffle` |

Setting `rotatingCount` to 1 and refresh to `daily` gives the "one piece of content per day" behavior.

### 4.2 Building a session (the selection engine)
Implement as pure functions in `src/engine/` that take data and a random-number function and return a list of item IDs. No UI or database calls inside them. This makes them testable.

For a session in mode `m`:
1. **Eligible items:** not retired, and `modes[m]` is `core` or `rotating`.
2. **Core items:** every eligible `core` item is shown in every session, always first. Order: `fixed` uses `coreOrderIds` (items missing from the list go to the end by creation date), `shuffle` randomizes.
3. **Rotating items:** pick `rotatingCount` items from the eligible `rotating` pool using a **shuffle bag** with weights:
   - Each mode keeps a persisted bag of rotating item IDs not yet shown in the current cycle.
   - Draw without replacement from the bag, weighted. When the bag cannot fill a draw, refill it with all eligible rotating items (excluding any already chosen in this session) and continue.
   - Items added mid-cycle join the bag. Items retired, deleted, or switched off for the mode leave the bag.
   - **Weight** = `1 + HELPED_BOOST_PER_HELP * min(helpedCount, HELPED_BOOST_CAP)`, where `helpedCount` counts `helped` events for that item in that mode within the last `HELPED_WINDOW_DAYS` days.
4. **Daily refresh:** if the mode's `rotatingRefresh` is `daily`, compute the rotating picks the first time the mode is opened each local day, store them in `state`, and reuse them for every open that day. If an item in the stored picks has since been retired or deleted, replace it with a fresh weighted draw.
5. **Empty states:** if there are no eligible items, the mode screen shows a single line and a button to add content instead of starting a session. If there are fewer eligible items than requested, show what exists.
6. Session order is core items, then rotating items.

### 4.3 The session experience (finite feed)
1. Opening a mode starts the **ritual** (4.4), then shows items one at a time.
2. Advance by tapping the right two-thirds of the screen, swiping left, pressing the arrow key, or tapping a small "next" button. Go back by swiping right, tapping the left third, or the left arrow key.
3. A quiet progress indicator shows position ("2 of 5" as small dots). Everything else on screen is hidden after 2 seconds of no interaction, then returns on touch.
4. After the last item, show the **end screen**: a calm line such as "That's your set." plus two actions: "Done" (return home) and "Show me more" (builds one extra rotating item, up to 3 extras per session). In Rescue mode the end screen is replaced by the next-step prompt (4.7).
5. Every item shown creates a `ShowEvent` immediately, and `dwellMs` is updated when the item is left.
6. A "this helped" control (a single small icon, one tap to toggle) is visible on every item. See 4.6.

**Item display**
- **Text:** set large in the display typeface, centered, with generous space. Choose font size by length: up to 60 characters is the largest size, up to 160 is medium, up to 400 is smaller, beyond 400 is the smallest size and may scroll. Respect line breaks the user typed.
- **Image:** shown with `object-fit: contain` over a heavily blurred, darkened copy of itself as backdrop. Caption, if any, sits below in the display typeface.
- **Video:** shown with `object-fit: contain`, `playsinline`, starts muted and looping off, plays once. Tap the video to pause or resume. A sound toggle is always visible. If `soundOnByDefault` is true, try with sound; if the browser blocks it, fall back to muted and show a small "tap for sound" hint. Show a thin progress line. Reuse a single `<video>` element across items where practical, because iOS tends to remember audio permission per element after a user tap. Do not auto-advance when a video ends. If the browser cannot play the format, show a friendly message ("This video format can't play on this device") and let the user advance.
- Preload the next item's media while the current item shows. Revoke object URLs when an item is left.

### 4.4 The ritual (breath-paced opening)
A short opening before content appears. It can be disabled in settings and by a single constant.
- **Full ritual (about `RITUAL_FULL_MS`):** a soft glowing orb expands slowly over one inhale-length while the mode's cue (`ModeConfig.cue`) fades in, then everything dissolves into the first item.
- **Short ritual (about `RITUAL_SHORT_MS`):** the orb fades up and dissolves quickly with no text.
- **None:** a simple fade into the first item.
- Tap anywhere to skip to the first item at any time.
- **Auto scaling** (`ritualScale: 'auto'`): count how many sessions have started today across all modes. First session of the day: full. Second: short. Third and later: none. **Rescue always uses at most the short ritual**, regardless of count.
- If `ritualScale` is `full` or `short`, use that, except Rescue still caps at short.
- Do not use haptics. iOS Safari does not support the Vibration API, so it would silently do nothing.

### 4.5 Lock (forgiving PIN)
- Numeric PIN, 4 to 8 digits. Entered on a custom large number pad (no system keyboard), with physical keyboard support on desktop. The screen auto-submits when the typed length equals the stored PIN length.
- Store a salted PBKDF2-SHA256 hash (WebCrypto, at least 200,000 iterations). Never store the PIN itself.
- **When it locks:** track `lastActiveAt` (a timestamp saved in `localStorage`, updated on interaction and when the app goes to the background). On cold launch and on returning to the foreground, compute elapsed time since `lastActiveAt`. If elapsed time is at least `lockTimeoutMs`, show the lock screen. Default is `LOCK_TIMEOUT_DEFAULT_MS` (5 minutes). Options in settings: every time, 1 minute, 5 minutes, 15 minutes, 1 hour. Use timestamps, not timers, because iOS suspends timers in the background.
- **Privacy curtain:** when the page becomes hidden (`visibilitychange`, `pagehide`), immediately render an opaque full-screen cover so the iOS app-switcher snapshot does not show content. Treat this as best effort and say so in the README.
- **Wrong attempts:** after 5 wrong entries, block entry for 30 seconds, doubling after each further block up to 15 minutes. Keep the counter in IndexedDB so reloading does not reset it.
- **Forgot PIN:** a small link opens a confirmation explaining that the only option is to erase all content and start over (and that exporting a backup beforehand would have saved it). Require typing `ERASE` to confirm.
- **Honesty note:** in Settings, state in one plain sentence that the PIN keeps people from opening the app but does not encrypt the files stored on the device.
- If no PIN is set, the app never shows the lock screen.

### 4.6 Habituation tracking
- Every item shows a one-tap **"this helped"** control. It marks that `ShowEvent` as `helped`. Tapping again unmarks it.
- Helped counts feed the selection weight (4.2).
- **Per-item stats** (item detail screen): times shown per mode, times marked helped per mode, last shown date.
- **"Not landing" flag:** an item shown at least `NOT_LANDING_MIN_SHOWS` times in a mode, with zero helped events in that mode, gets a quiet "Not landing in Rescue" label in the library and detail view, with one-tap "Retire".
- **Core warning:** if a mode has more than `CORE_WARN_COUNT` core items, show a gentle note in its settings that long core sets tend to get tuned out.
- **Retire:** sets `retiredAt`. Retired items are hidden by default in the library, can be viewed under a "Retired" filter, and can be restored or permanently deleted.

### 4.7 Rescue next step
- After the last Rescue item, show the prompt: "What's the first two-minute action?" with a one-line text box, a "Save" button, and a "Skip" link.
- Saving creates a `NextStep` and returns home. The prompt must be fully skippable in one tap.
- On Rescue's entry (home tile), if there is an undone next step from the last 24 hours, show it as one quiet line ("Last time: ...") with "Done" and "Dismiss". Done sets `doneAt`.
- During a Rescue session, show a small "Skip to next step" link so the user can jump straight to the prompt when content is not what they need.
- A "Next steps" list lives in the Library screen (tab), newest first, with check-off and delete.

### 4.8 Open-into behavior
`Settings.openInto` decides where the app lands after unlocking: the home screen (default) or directly into a mode (the ritual then follows). Offer this in settings with a plain explanation that "Rescue" removes one tap when struggling.

### 4.9 Config constants (`src/config.ts`)
`APP_NAME`, `LOCK_TIMEOUT_DEFAULT_MS` (300000), `PIN_MIN_LENGTH` (4), `PIN_MAX_LENGTH` (8), `PBKDF2_ITERATIONS` (200000), `RITUAL_FULL_MS` (4000), `RITUAL_SHORT_MS` (1500), `HELPED_BOOST_PER_HELP` (0.4), `HELPED_BOOST_CAP` (5), `HELPED_WINDOW_DAYS` (90), `NOT_LANDING_MIN_SHOWS` (8), `CORE_WARN_COUNT` (5), `EXTRA_ITEMS_MAX` (3), `IMAGE_MAX_EDGE` (2400), `IMAGE_REENCODE_BYTES` (3145728), `JPEG_QUALITY` (0.88), `VIDEO_WARN_BYTES` (157286400), `VIDEO_MAX_BYTES` (524288000), `EXPORT_REMINDER_DAYS` (30), transition durations, per-mode accent colors, and the default `ModeConfig` values.

---

## 5. Screens and routes

| Route | Screen |
|---|---|
| `/` | **Home.** Three mode tiles (Start, Charge, Rescue), each with its accent color and one-line description. Small icons to reach Library and Settings. Rescue must be reachable in one tap from launch. Shows the Rescue "Last time" line when relevant. |
| `/session/:mode` | **Session.** Ritual, item viewer, end screen or next-step prompt. |
| `/library` | **Library.** Tabs: Items, Next steps. Items tab: grid or list with poster thumbnails, filters (by mode, by type, Retired, Not landing), an add button. |
| `/library/new` and `/library/:id` | **Add and edit item.** |
| `/modes/:mode` | **Mode settings.** Rotating count, refresh policy, core order (with up and down buttons when `fixed`), the list of core and rotating items, core warning. |
| `/settings` | **Settings.** PIN, lock timeout, ritual on or off and scale, open-into, sound default, storage meter and protection status, export, import, erase all, load sample content, honesty note about the PIN, install guidance, mode renaming (via the mode settings screens), about. |
| `/lock` | **Lock** (shown as an overlay state, not a navigable page). |
| `/onboarding` | **First launch** for a user who knows nothing about the app. Three short screens, each skippable: (1) what the app is, in two sentences, with a looping animated example of a session; (2) the three modes, each with one example use; (3) optional PIN setup with a plain explanation. Then platform-specific install guidance (see section 7), then a choice between "Add my first thing" and "Load sample content". |
| `/dev` | **Dev tools** (hidden, no link): seed sample content, clear data, counts. Also `/dev/styleguide` showing all components. |

**Add and edit item screen**
- A large text box ("Write something to your future self") and an "Add photo or video" button (hidden file input, `accept="image/*,video/*"`, multiple allowed).
- On desktop, a full-window drag-and-drop overlay accepts files dropped anywhere on the Library or Add screens.
- Per-mode chips for Start, Charge, and Rescue, each cycling through off, rotating, and core in one tap, with the current state spelled out on the chip. Default for a new item: rotating in all three modes.
- Caption rule: text plus exactly one file saves as one media item with a caption. With several files selected, the text box is disabled with a hint ("Captions apply to single files. Edit each item afterward to add captions.") and each file becomes its own item.
- Show per-file progress while processing. A failure on one file must not discard the others.
- Edit screen also has Retire, Restore, Delete (with confirmation), per-item stats, and the stored file size.

---

## 6. Visual design and motion

**Feeling:** sleek, zen, and fresh. Dark, calm, spacious, with one living element (the background) and typography as the main design material. Interface chrome stays minimal so the user's own content leads.

**Tokens** (starting values, defined in `tokens.css`, adjust if they look off):
- Base background: near-black with a slight cool tint (around `#0B0B10`). Surface layers slightly lighter.
- Text: warm off-white (around `#F3EFE8`), secondary text at about 60 percent opacity.
- Mode accents: Start warm amber (around `#F4B97A`), Charge hot coral (around `#FF6B6B`), Rescue calm teal (around `#5EC9B8`). Home blends all three.
- Radius: generous (16 to 28 px). Spacing on a 4 px scale.
- Content typeface: Fraunces (variable) at large sizes for text content, with its optical size and a light weight. Interface typeface: Inter.

**Living background:** 3 or 4 large, heavily blurred radial gradient shapes, using the current mode's accent plus the base, drifting on slow loops (40 to 90 seconds) with CSS `transform` only (GPU friendly). Switching modes cross-fades the accent over about 1.2 seconds. Pause the animation when the page is hidden. Under `prefers-reduced-motion`, show a static gradient.

**Transitions:** slow and deliberate. Items fade and drift in (a few pixels of vertical movement) over roughly 600 to 900 ms. Screen changes fade over 300 to 400 ms. Nothing bounces or snaps. Under `prefers-reduced-motion`, use 150 ms fades only.

**Components** (build in M2 and review at `/dev/styleguide`): Button, IconButton, Sheet (bottom sheet), Toggle, Segmented control, Chip, TextArea, Progress dots, NumberPad, Toast. Minimum touch target 44 px. Visible focus states for keyboard use.

**Accessibility:** text contrast at least WCAG AA, labels on every icon button, screen-reader announcements for session position, no information conveyed by color alone, and full keyboard operation on desktop.

**Layouts for any device:** the interface works from 320 px wide phones to large desktop screens and in both orientations. On large screens, constrain content to a comfortable maximum width, centered, and keep the living background full-bleed. Respect the system text-size setting where the platform provides one. The v1 theme is dark only; a light theme goes on the Later list.

---

## 7. Platform requirements (apply from M0 onward)

### Install and storage guidance for new users
- Detect whether the app is running installed (`matchMedia('(display-mode: standalone)')` or `navigator.standalone` on iOS).
- **iOS Safari, not installed:** Safari can clear site data for sites that go unused for about a week, and the Home Screen version is protected from that. After a user has added their first item, show a dismissible banner explaining in plain words how to install (Share, then Add to Home Screen) and why it protects their content. Re-show it at most once a week until installed or dismissed permanently.
- **Android Chrome:** capture the `beforeinstallprompt` event and offer an "Install" button in onboarding and Settings.
- **Desktop:** offer install through the browser's own mechanism if available, with no nagging.
- The backup reminder (M8) applies to every user, installed or not.

### iOS specifics

- Manifest: `display: standalone`, `background_color` and `theme_color` matching the base, icons at 192, 512, and a maskable 512, plus a 180 px `apple-touch-icon`.
- Head tags: `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style` set to `black-translucent`, and `viewport` with `viewport-fit=cover`.
- Use `env(safe-area-inset-*)` padding on all full-screen layouts and `100dvh` instead of `100vh`.
- Ask for persistent storage (`navigator.storage.persist()`) at startup and show the result in Settings. Installed Home Screen apps are generally protected from eviction, but the spec cannot assume it, so the export reminder (M8) matters.
- Do transactional writes in IndexedDB (one transaction per logical change). Write media Blobs and item records in the same transaction.
- Test video playback with iPhone-recorded `.mov` (HEVC) files. Safari plays them. Some desktop browsers will not, and that is acceptable if handled with the friendly message in 4.3.
- No reliance on the Vibration API, Notification Triggers, background sync, or scheduled push. Each is unavailable or unreliable on iOS for a backend-free PWA.

---

## 8. Milestones

### M0: Project skeleton and installable shell
**Goal:** an empty but installable, offline-capable PWA that Jackie can deploy and open on her iPhone.

Tasks:
1. Scaffold Vite, React, TypeScript (strict). Set up folders from section 2, ESLint, and Vitest.
2. Create `src/config.ts` with the constants from 4.9 (values can be placeholders for later milestones).
3. Configure `vite-plugin-pwa`, the manifest, all iOS head tags, `vercel.json` rewrite, and generated placeholder icons (a simple soft ember glow on the dark base).
4. A placeholder Home screen showing the app name on the base background.
5. Create `README.md` (what the app is, how to run it, stack) and `PROGRESS.md`.

Done when: `npm run build`, lint, and tests pass; the built app works offline in a desktop browser (DevTools offline mode).

Jackie's test steps:
1. Run the dev server as instructed and open the page.
2. Push to GitHub and deploy on Vercel as usual. Open the deployed address in Safari on iPhone.
3. Share, then Add to Home Screen. Launch from the icon and confirm there is no browser bar.
4. Turn on airplane mode, force-close, relaunch from the icon, and confirm the page still loads.
5. If you have access to an Android phone or another person's phone, open the deployed address there too and confirm it loads and can be installed.

### M1: Data layer
**Goal:** reliable local storage that survives reloads and app restarts.

Tasks:
1. Create the IndexedDB schema and migration function from section 3, with repository functions for each store (create, read, update, delete, list) and typed helpers.
2. Request persistent storage at startup. Add a storage estimate helper (used and quota).
3. Settings defaults and a function that loads or creates the settings document.
4. A function that loads about 12 sample text items (varied lengths, spread across modes, mix of core and rotating) and one that clears all data. Sample content must suit a general audience: short, warm, and free of assumptions about gender, religion, fitness level, or life situation. Each sample item carries a hidden `isSample` flag so Settings can offer "Delete all sample content" in one tap, and the library shows a small "Sample" tag on them.
5. The hidden `/dev` page with buttons for seed, clear, and a counts readout for each store plus the storage estimate.
6. Tests with `fake-indexeddb` covering create, update, delete, a blob round trip, and a migration from an empty database.

Done when: tests pass and the `/dev` page works.

Jackie's test steps:
1. Open `/dev`, press the seed button, confirm counts appear, reload, confirm counts persist.
2. On the iPhone (installed app), seed, force-close the app, reopen `/dev`, and confirm the counts are unchanged.
3. Press clear and confirm counts return to zero.

### M2: Design system, living background, and home
**Goal:** the visual identity and the app shell.

Tasks:
1. Build `tokens.css`, self-hosted fonts, and the component set from section 6.
2. Build the living background component with mode-based accent changes and reduced-motion handling.
3. Build the screen transition wrapper and the safe-area layout wrapper.
4. Build the real Home screen: three mode tiles, Library and Settings icons, accent cross-fade when a tile is pressed or hovered.
5. Build `/dev/styleguide` showing every component and the type scale.

Done when: the screens match section 6 on desktop and iPhone, and reduced-motion is respected.

Jackie's test steps:
1. Open `/dev/styleguide` and review every component. Tell the agent what to change in plain terms (for example "the coral is too loud").
2. Open Home on the iPhone and confirm the background drifts slowly and nothing overlaps the status bar or home indicator.
3. In iPhone Settings, turn on Reduce Motion, reopen the app, and confirm the background is still and fades are short.

### M3: Onboarding and lock
**Goal:** first-launch flow and the forgiving PIN.

Tasks:
1. Onboarding as described in section 5, written for a complete newcomer, with every screen skippable, plus the platform-specific install guidance from section 7.
2. PIN setup and change flows in Settings, hashing with WebCrypto as in 4.5.
3. Lock screen with the custom number pad, auto-submit, wrong-attempt delays persisted in IndexedDB, forgot-PIN erase flow.
4. `lastActiveAt` tracking and lock-on-return logic using timestamps. Lock timeout setting and the honesty note.
5. Privacy curtain on page hide.
6. Tests for the hashing, timeout logic (pure function taking timestamps), and wrong-attempt delay logic.

Done when: tests pass and all flows work with and without a PIN.

Jackie's test steps:
1. Delete site data or use a private window, then walk through onboarding and set a PIN.
2. Close the app, reopen within the timeout, and confirm it does not ask for the PIN. Set the timeout to "every time" and confirm it does.
3. Enter the wrong PIN five times and confirm the 30 second block.
4. On iPhone, open the app, press the Home button, and open the app switcher. Confirm the preview shows a blank cover and not your content.
5. Hand the phone to someone who has never seen the app, say nothing, and watch them go through onboarding. Write down every place they hesitate or ask a question, and give that list to the agent.

### M4: Content: add, manage, and browse (text, photo, video)
**Goal:** full content management.

Tasks:
1. Add and edit screen per section 5, including mode chips, multi-file selection, progress, and the caption rule.
2. Image processing: read with `createImageBitmap(file, { imageOrientation: 'from-image' })`. If the long edge exceeds `IMAGE_MAX_EDGE` or the file exceeds `IMAGE_REENCODE_BYTES` (and it is not a GIF), re-encode as JPEG at `JPEG_QUALITY`. Otherwise store the original. Store a small poster for the library.
3. Video processing: read duration and dimensions from a hidden video element, create a JPEG poster by seeking to about 0.5 seconds and drawing to a canvas (max 720 px wide), store the original file unchanged. Warn above `VIDEO_WARN_BYTES` ("This file will use about X MB of storage. Add it?"). Reject above `VIDEO_MAX_BYTES` with a clear message. If poster generation fails, use a generated gradient placeholder.
4. Drag-and-drop overlay on desktop.
5. Library screen: grid with posters, filters (mode, type, Retired), sort by newest, tap to open the item.
6. Item detail: edit text or caption, change mode membership, Retire, Restore, Delete with confirmation.
7. Tests for the image resize logic (pure parts) and the caption rule.

Done when: text, photo, and video items can be added from an iPhone and a desktop, edited, retired, and deleted.

Jackie's test steps:
1. Add a text item and confirm it appears in the Library.
2. On iPhone, add three photos at once from your photo library, then add one video recorded on your phone. Confirm thumbnails appear.
3. On desktop, drag a photo and a video onto the Library page.
4. Open an item, change its modes, retire it, filter to Retired, and restore it.
5. Try adding a very large video to see the warning (if you have one).

### M5: Sessions
**Goal:** the core experience.

Tasks:
1. Selection engine in `src/engine/` per 4.2, as pure functions with an injected random function. Persist bag and daily-pick state through the repositories.
2. Ritual component per 4.4 with auto scaling.
3. Session screen and item viewer per 4.3: text sizing rules, image with blurred backdrop, video playback behavior, preloading, tap and swipe navigation, progress dots, hiding chrome after 2 seconds, end screen with "Done" and "Show me more".
4. `ShowEvent` creation on each item shown and dwell time update.
5. Mode settings screen at `/modes/:mode` per section 5, including renaming the mode and editing its description and ritual cue (with a Reset to default button), core ordering controls, and the core warning.
6. Empty-state handling per 4.2.
7. Open-into setting.
8. Tests for the engine: core items always included and first; retired and off items excluded; no repeats until the bag is exhausted; bag refill behavior; weights bias selection toward helped items (use a seeded random function and a large number of draws); daily refresh returns the same picks all day and replaces a retired pick.

Done when: all engine tests pass and a full session runs in all three modes with text, photo, and video.

Jackie's test steps:
1. Seed sample content, open each mode, and go through a full session. Confirm the end screen appears.
2. Open Start twice in one day and confirm you see the same rotating items (daily refresh). Open Charge twice and confirm the rotating items can differ.
3. Make one item core in Rescue and confirm it appears first every time.
4. With a video item, confirm it plays muted at first and that the sound toggle works. Test on the iPhone installed app.
5. Open the same mode three times in a row and watch the ritual shrink from full to short to none. Confirm Rescue never gets the full ritual.
6. Swipe, tap the edges, and use arrow keys (desktop) to move forward and back.

### M6: Habituation
**Goal:** the app learns what works per mode.

Tasks:
1. "This helped" control on every item in a session, writing to the current `ShowEvent`.
2. Weighted selection uses helped counts per 4.2 (verify the engine already handles this and wire real event data into it).
3. Per-item stats on the item detail screen.
4. "Not landing" labels, library filter, and one-tap Retire.
5. Core warning in mode settings (if not already done in M5).
6. Tests for the helped-count windowing and the not-landing rule.

Done when: marking items helped visibly changes how often they appear over many sessions, and stats read correctly.

Jackie's test steps:
1. Run several Charge sessions, marking one item as helped each time. Confirm the stats screen shows the counts per mode.
2. Run a dozen Rescue sessions without ever marking one particular item as helped. Confirm it gets the "Not landing" label and the Retire shortcut.
3. Confirm the "helped" status in Charge does not change an item's weight in Start.

### M7: Rescue next step
**Goal:** connect the feeling to the first action.

Tasks:
1. The next-step prompt after the last Rescue item, saving to `nextSteps`.
2. "Skip to next step" link during Rescue sessions.
3. "Last time" line on the Rescue tile with Done and Dismiss.
4. "Next steps" tab in the Library with check-off and delete.

Done when: the full Rescue loop works and every part is skippable.

Jackie's test steps:
1. Finish a Rescue session, write a next step, save, and confirm it returns home.
2. Confirm the "Last time" line appears on the Rescue tile, then mark it done.
3. Start a Rescue session and use "Skip to next step".
4. Open the Library Next steps tab and check one off.

### M8: Backup, storage, and settings completion
**Goal:** data safety and a complete settings screen.

Tasks:
1. Export: write a zip containing `manifest.json` (version, export date, items, events, next steps, settings without the PIN hash, mode configs) and the media files under `media/` and posters under `posters/`. Use `client-zip`. On iPhone, offer the Web Share API where available and fall back to a download. Record `lastExportAt`.
2. Import: read the same zip with streaming unzip. Offer "Merge" (default, skip IDs that already exist) and "Replace everything" (with confirmation). Validate the manifest version and show a clear error for bad files.
3. If large exports fail on iPhone because of memory limits, tell Jackie and propose splitting the export into zip parts of at most 200 MB each.
4. Storage meter in Settings (used, quota, persistence status), plus a per-item size in the library.
5. Export reminder: if `lastExportAt` is older than `EXPORT_REMINDER_DAYS` (or null) and there are items, show a quiet banner on Home with a link to Export.
6. Settings completion: lock timeout, ritual toggle and scale, open-into, sound default, erase all (with `ERASE` confirmation), load sample content, about.
7. Tests for the manifest build and parse functions and the merge logic.

Done when: an export from one browser profile imports correctly into a fresh one with every item, media file, mode setting, and next step intact.

Jackie's test steps:
1. Export from the iPhone and save the file to Files.
2. Open the app in a private desktop window, import the file, and confirm everything appears, including photos and video.
3. Test Merge by importing the same file twice and confirming no duplicates.
4. Check the storage meter reads sensibly after adding media.

### M9: Polish, accessibility, and portfolio packaging
**Goal:** a finished app and a project write-up usable in job applications.

Tasks:
1. Time-of-day tint: shift the background hue slightly with the hour (morning warmer, evening cooler), kept subtle and disabled under reduced motion.
2. Accessibility pass: contrast, focus order, labels, screen-reader announcements, 44 px targets.
3. Performance pass: lazy-load routes, confirm object URLs are revoked, test with 50 or more items including several videos, keep scrolling and transitions smooth on iPhone.
4. Empty, loading, and error states on every screen, written in a calm voice.
5. Rewrite `README.md` as a portfolio write-up: what the app is, the problem it addresses, design principles, screenshots (leave labeled placeholders for Jackie to fill), the key technical decisions (local-first storage and why, the shuffle-bag engine, forgiving PIN with timestamps, iOS constraints and how they were handled), how it was built (with Antigravity CLI from a written spec), what was tested, and what comes next.
6. Add a "Try it" section to the README explaining that any visitor gets their own private copy with all data staying on their device, and a "Load sample content" path so a visitor can see it working in under a minute. Write the README so it presents Ember as a product for anyone, with the builder's story in a separate "How it was built" section.
7. A final pass that confirms the privacy rule from section 0 (zero network requests after first load) using the browser's network panel, and report the result.

Done when: all checks pass, README is complete, and Jackie signs off.

Jackie's test steps:
1. Use the app as your real daily tool for several days on the iPhone and write down anything that adds friction.
2. Add 30 or more items including a few videos and confirm the app stays fast.
3. Read the README and tell the agent anything that is unclear or inaccurate.
4. Fill in the screenshots and share the deployed address with two or three people who have never seen the app, on different phones if possible (including an Android phone). Watch them without helping and note where they get stuck. Give the agent the list.

---

## 9. Out of scope for v1

- Push notifications and scheduled reminders. A backend-free PWA cannot send reliable scheduled notifications on iOS. A workaround that needs no code is an iPhone Shortcuts personal automation that opens the app at set times.
- Face ID or passkeys.
- Cloud sync, accounts, and multi-device use.
- Linking to external videos or social posts (TikTok, Instagram, YouTube).
- Encryption of stored content.
- Adding or removing modes (v1 has three modes, which users can rename and reconfigure).
- Languages other than English (strings are centralized so this can come later).
- A light theme.
- Sharing content with other people.

## 10. Later ideas (do not build, record in `PROGRESS.md`)

- User-created modes, per-mode accent colors chosen by the user, and a light theme.
- Translation into other languages.
- Optional encrypted storage with a key derived from the PIN.
- Cloud sync as an opt-in layer.
- Reading `Last time` next steps back into the content (for example showing a completed next step as a win).
- Per-item scheduling (for example "only on Mondays").
- A weekly review screen summarizing what helped.

## 11. Definition of done (whole project)

1. All ten milestones are complete and signed off by Jackie.
2. Build, lint, and tests pass.
3. The app installs on iPhone and Android, works offline, locks and unlocks as specified, and runs a full session in every mode with text, photo, and video.
   A person who has never seen the app can install it, add content, and finish a session without any help.
4. Export and import round-trip without loss.
5. The app makes no network requests after first load.
6. README is portfolio-ready and `PROGRESS.md` is current.
