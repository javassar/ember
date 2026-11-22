# Ember

> **A private, quiet space for deliberate content.**  
> Offline, local-first, finite, and always yours.

Ember is a private, local-first Progressive Web App (PWA) that turns your own collection of quotes, photos, and short videos into a personal recommendation engine — a transparent "faux-algorithm" designed for focus and momentum rather than attention extraction. Instead of an infinite feed optimized for retention, Ember presents bounded, deliberate sets that you continuously configure, calibrate, and control.

---

## Try It

Ember is designed to be shaped by you from your very first open. It is a completely private, independent space that you populate with what actually matters to you:

1. **Open the App**: Visit the deployed link or run it locally.
2. **Make It Yours**:
   - Add photos of the people, places, and milestones that ground and center you.
   - Add meaningful quotes, excerpts, or personal reminders that cut through mental noise.
   - Add short video clips that give you momentum when you need to focus or move.
3. **Optional Demo Mode**: If you want to test drive the navigation, mechanics, and rituals before adding your own media, select **"Load Sample Content"** during onboarding (or in **Settings**) to explore with 12 pre-loaded examples. You can clear or replace them whenever you are ready.
4. **Your Data Stays Yours**: Everything is stored directly in your browser's IndexedDB. No accounts, no cookies, no tracking, and no data ever leaves your device.
5. **Install to Home Screen**:
   - **iPhone (Safari)**: Tap the Share button (square with arrow) → **Add to Home Screen**.
   - **Android (Chrome)**: Tap the menu (three dots) → **Install app**.
   - **Desktop (Chrome/Edge/Brave)**: Click the Install icon in the address bar.

---

## Screenshots

<!-- Jackie: Drop your screenshots into a /screenshots directory in the repository to display them here! -->

| Home Screen | Breath Ritual | Finite Session Feed |
| :---: | :---: | :---: |
| ![Home Screen](./screenshots/home.png)<br><sub>*Three intentional spaces with time-of-day tints*</sub> | ![Breath Ritual](./screenshots/ritual.png)<br><sub>*Expanding glowing orb opening ritual*</sub> | ![Session View](./screenshots/session.png)<br><sub>*Dynamic typography & edge navigation*</sub> |

| Content Library | Rescue Next Step | Device Backup & Storage |
| :---: | :---: | :---: |
| ![Library View](./screenshots/library.png)<br><sub>*Photos, videos, and not-landing detection*</sub> | ![Rescue Prompt](./screenshots/rescue.png)<br><sub>*Connecting feelings to 2-minute actions*</sub> | ![Settings Screen](./screenshots/settings.png)<br><sub>*Client-zip backup & local storage meter*</sub> |

---

## The Problem Ember Solves

Modern feeds are engineered for **infinite capture**. Social platforms and algorithmic feeds optimize for engagement through variable rewards, notifications, and endless scrolling. Even apps intended for wellness or motivation frequently trap users in endless consumption loops.

Ember approaches content from the opposite direction:
- **Finite by Design**: Every session ends with a calm, definitive stopping point (*"That's your set"*). There is no infinite scroll.
- **User-Owned Content**: You choose the words, images, and videos that genuinely help you. The app contains no third-party feeds or algorithmic recommendations.
- **Context-Specific Spaces**: Different moments call for different kinds of focus:
  - **Start**: Clear morning focus and perspective.
  - **Charge**: High energy before workouts, presentations, or demanding tasks.
  - **Rescue**: Low-friction momentum when feeling stuck or struggling to begin.
- **Action Over Consumption**: Rescue mode doesn't leave you sitting in the app; it concludes with a single 2-minute action prompt to bridge the shift in feeling into real-world action.

---

## A Faux-Algorithm You Actually Want to Consume

Commercial recommendation algorithms are built around a fundamental conflict of interest: they optimize for platform engagement and attention capture. Whether on social feeds or algorithmic media platforms, their ranking systems are black boxes tuned to maximize dwell time, volatility, and dopamine-seeking behavior. You don't choose the weights; an ad-supported model does.

Ember inverts this paradigm. It provides the dynamic variety, prioritization, and responsiveness of an algorithm, but makes you the architect. Every rule is transparent, deterministic, and steered entirely by your own intentions:

### 1. Structural Control: Core, Rotating, and Off
Rather than dumping saved items into an unordered list, Ember lets you organize content into three functional tiers for each space:
- **Core (Anchors)**: Non-negotiable foundations shown first in every session (either in a fixed sequence or randomized first).
- **Rotating (The Discovery Pool)**: Content that cycles dynamically through sessions, providing variety without turning into an unpredictable roulette.
- **Off (The Vault)**: Items preserved in your local library without entering active circulation.

### 2. The Shuffle Bag: Fairness Without Repetitive Streaks
Naive random number generators frequently produce frustrating streaks — showing the same quote three times in two days while burying another item for a month. Ember implements a persisted **shuffle bag**:
- Rotating item IDs enter a persisted bag.
- Each session draws items without replacement.
- An item cannot be drawn again until the entire bag has been exhausted and refilled, ensuring every item in your pool cycles evenly.

### 3. Intentional Feedback: "This Helped" Without Dopamine Traps
Commercial platforms interpret a 2-second linger or an accidental pause as "engagement." Ember only cares about one question: *did this actually serve you?*
- A single tap on "This helped" registers an explicit positive signal.
- The selection engine dynamically boosts that item's draw weight (`1 + 0.4 × helpedCount`) over a rolling 90-day window.
- The system gently elevates what has recently proven effective, while allowing older items to naturally cool down so the rotation does not calcify.

### 4. Context Isolation: Independent Space Calibration
What primes you before a workout or a challenging meeting (Charge) is often unhelpful or counterproductive when you are overwhelmed and struggling to begin (Rescue). Commercial feeds mix everything into a single engagement slurry. Ember strictly partitions stats and weights by space:
- Marking an item helpful in **Charge** boosts its frequency in Charge.
- It never alters that item's weight, priority, or statistics in **Start** or **Rescue**.
- Each space develops its own independent intelligence calibrated solely to that mental state.

### 5. Habituation Intelligence & Pruning
Even resonant content loses its impact if repeated too often (semantic satiation). Over time, the brain tunes out static reminders.
- If an item appears 8 or more times in a space with zero "This helped" marks, Ember flags it as **"Not landing in [Space]"**.
- A prominent one-tap **Retire** shortcut appears in both the Library and Item Detail view.
- This creates a healthy pruning mechanism, encouraging you to retire stale items so your spaces remain sharp and effective.

### 6. Pacing & Cadence Control
You determine how content is metered:
- **Refresh Policy**: Choose between **Daily** (Ember locks in one curated set for the calendar day, giving you consistent anchors morning and evening) or **Each session** (a fresh weighted draw on every open).
- **Session Length**: Set exact rotating item counts (e.g., 3 items for a 60-second check-in, or 7 for a deeper reset).
- **Auto-Scaling Opening Ritual**: A breath-paced glowing orb opens sessions (4 seconds on the first morning open, scaling to 1.5 seconds on the second open, and dissolving entirely on subsequent visits so Ember never delays you when you want quick momentum).

---

## Core Design Principles

1. **Finite Sets**: Sessions deliver 3 to 10 deliberate items. When you're done, you leave the app and return to your day.
2. **100% Private & Local-First**: No remote servers, no user accounts, no telemetries, and zero network calls after the initial asset download.
3. **Low-Friction Rescue**: Reaching help when struggling must take only one tap from launch.
4. **Pacing & Typography**: Generous whitespace, Fraunces serif display typography, and breath-paced visual transitions create a sense of calm.
5. **Forgiving Security**: A custom numeric PIN keypad that protects privacy while preventing lockout panics through timestamped delays.
6. **Habituation Intelligence**: Tracks what actually helps you per space over time, flagging items that are "not landing" with one-tap retirement so your spaces remain fresh.

---

## Key Technical Decisions & Architecture

### 1. Local-First IndexedDB Storage with Blobs & Fast Posters
- **Why**: Traditional web apps store user media in cloud object storage (S3) and metadata in a remote database. Ember stores all original photos and videos as raw binary `Blob` records directly in browser IndexedDB (via the `idb` library).
- **Fast Grid Rendering**: To prevent multi-megabyte videos and photos from freezing list screens, Ember generates lightweight 400px JPEG thumbnail `PosterRecord`s upon import. The Library loads instantly without loading heavy video binaries into RAM.
- **Atomic Transactions**: All media creations and deletions run through multi-store atomic IndexedDB transactions, guaranteeing that Blobs, posters, and item metadata stay in sync with zero orphaned records.

### 2. Weighted Selection Engine & Cross-Mode Habituation
- **The Shuffle Bag**: Each space maintains a persisted "shuffle bag" of eligible rotating item IDs. Items are drawn without replacement so you never see repetitive duplicates until the full pool has cycled.
- **Dynamic Weighting**: Items marked with "This helped" receive a dynamic selection boost within a 90-day window (`1 + 0.4 * min(helped, 5)`).
- **Cross-Mode Isolation**: Marking an item as helpful in **Charge** boosts its weight in Charge, but leaves its weight and statistics in **Start** and **Rescue** completely unaffected.
- **Habituation & "Not Landing" Detection**: If an item is shown 8 or more times in a mode with 0 "This helped" marks, Ember flags it as *"Not landing in [Space]"* in both the Library and Item Detail view, providing a one-tap shortcut to retire it from active rotation.

### 3. Forgiving PIN with WebCrypto & Timestamp-Based Timeouts
- **PBKDF2-SHA256 Hashing**: Passkeys are hashed using the browser's native `window.crypto.subtle` API with a random 16-byte salt and 200,000 iterations. The PIN itself is never written to disk.
- **iOS Timer-Free Inactivity Locking**: iOS Safari suspends JavaScript timers (`setTimeout`) when an app enters the background. Rather than relying on unreliable background timers, Ember stores an active timestamp (`lastActiveAt`). Upon cold launch or returning to the foreground (`visibilitychange`), Ember calculates elapsed time against `lockTimeoutMs`.
- **Privacy Curtain**: When switching apps on iOS or desktop, Ember instantly displays an opaque backdrop over the viewport to prevent sensitive affirmations or photos from appearing in the system app-switcher snapshot.

### 4. iOS PWA Constraints & Engineering Solutions
- **Web Share Zip Backup**: Built using `client-zip` and streaming `fflate`. On iPhone, Ember automatically hooks into the native **iOS Web Share API** (`navigator.share({ files })`), enabling users to save their complete offline backup directly into their iCloud Drive or Files app.
- **Streaming Unzip**: Large video imports are decompressed progressively via chunked streaming without holding the entire uncompressed zip in browser memory at once.
- **Audio Permission Continuity**: iOS Safari restricts unmuted video autoplay unless triggered by a user gesture. Ember detects audio capabilities and persists audio elements across session items to prevent repeated permission prompts.
- **Persistent Storage Requests**: Invokes `navigator.storage.persist()` to protect the local IndexedDB database from automatic Safari eviction policies during device storage pressure.

---

## Zero-Network Verification

Section 0 of the Ember technical specification mandates a **zero-network guarantee**: after the initial bundle is served, Ember must never make an outbound network request.

To verify this:
1. Open Ember in Google Chrome or Safari with DevTools open to the **Network** tab.
2. Filter by `Fetch/XHR`.
3. Add a photo, add a video, run a Start session, run a Rescue session, mark items helped, export a backup, and change your PIN.
4. **Result**: Exactly **0 network requests**. All operations execute inside the local browser sandbox and IndexedDB.

---

## How It Was Built

Ember was built end-to-end from a formal technical specification ([SPEC.md](file:///Users/jacqueline/Library/Mobile%20Documents/com~apple~CloudDocs/coding_projects/ember/SPEC.md)) using the **Antigravity CLI** agentic engineering environment:

- **10 Sequential Milestones (M0 - M9)**: From skeleton setup, data migration layer, design tokens, security PIN, media processing pipelines, and session viewers, to habituation engines, Rescue loops, and client-side zip backups.
- **Strict Quality Constraints**:
  - 100% passing automated test suite (**71 Vitest unit & integration tests**).
  - Strict TypeScript mode (`noImplicitAny`, strict null checks).
  - 0 ESLint warnings (`eslint .`).
  - Native CSS tokens with zero third-party UI framework dependencies.
  - Plain-English developer documentation at the top of every file.

---

## Local Development & Testing

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### Setup
```bash
# Clone the repository
git clone https://github.com/your-username/ember.git
cd ember

# Install dependencies
npm install

# Run automated tests
npm run test

# Run ESLint validation
npm run lint

# Start the local development server
npm run dev

# Build production bundle with PWA precaching
npm run build
```

---

## What Comes Next (Later List)

- **Optional Encrypted Storage**: Key derivation using user PIN to encrypt blobs on disk.
- **Light Theme**: Automatic or toggleable light palette for daytime outdoor reading.
- **Shortcuts Integration**: Personal iOS Shortcut automations to trigger sessions at set times of day.
- **Weekly Review Summary**: A quiet reflection screen summarizing what helped most over the past 7 days.
- **Additional Languages**: Localization framework powered by Ember's centralized string dictionary (`src/strings.ts`).

---

## License

MIT License.
