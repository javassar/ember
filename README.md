# Ember

Ember is a private, local-first web application (PWA) designed to provide a calm, deliberate relationship with motivating personal content (text affirmations, photos, and hype videos).

Unlike traditional algorithmic feeds designed for infinite scrolling, Ember presents content in finite, structured sessions tailored to three distinct modes:
- **Start**: Calm, intention-setting sessions (e.g. morning affirmations).
- **Charge**: High-energy priming (e.g. pre-workout or before a challenging task).
- **Rescue**: Rapid, low-friction momentum when struggling to begin an action.

---

## Key Principles & Privacy Promise

- **Zero Network Footprint**: After the initial web load, Ember makes zero network requests. No third-party trackers, analytics, or remote API calls. All personal data, media, and viewing habits remain strictly on your local device.
- **Finite Sessions**: Every session has a clear, mindful conclusion ("That's your set"). No infinite loops.
- **Offline First**: Fully installable as a Progressive Web App (PWA) on iPhone (iOS 16.4+), Android, and desktop browsers, operating reliably without an internet connection.
- **Forgiving Security**: Protects your private space with a local PIN and automatic lock screen.

---

## Tech Stack

- **Framework & Language**: React 18, TypeScript (strict mode), Vite
- **PWA & Offline**: `vite-plugin-pwa` (Workbox service worker precaching)
- **Routing**: `react-router-dom` v6
- **Typography**: Self-hosted `@fontsource-variable/fraunces` (display) and `@fontsource-variable/inter` (interface)
- **Styling**: Native CSS tokens and CSS custom properties (no external UI libraries)
- **Storage**: IndexedDB (via `idb` library) for structured data and media Blobs
- **Testing**: Vitest

---

## Running Locally

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### Installation & Development
1. Clone the repository and enter the directory:
   ```bash
   cd ember
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Generate application icons:
   ```bash
   npm run generate-icons
   ```
4. Start the local development server:
   ```bash
   npm run dev
   ```
5. Open your browser to the local address displayed in the terminal (typically `http://localhost:5173`).

### Building & Testing
- **Typecheck & Production Build**: `npm run build`
- **Lint Codebase**: `npm run lint`
- **Execute Test Suite**: `npm run test`
- **Preview Production Build**: `npm run preview`
