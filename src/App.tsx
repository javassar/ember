// Root application component configuring lazy-loaded routing, security providers, and overlays.

import React, { useMemo, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LockProvider, useLock } from './context/LockContext';
import { LockOverlay } from './components/Lock/LockOverlay';
import { PrivacyCurtain } from './components/PrivacyCurtain/PrivacyCurtain';
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary';

// Lazy-load screen routes for optimal startup speed and memory efficiency
const HomeScreen = lazy(() =>
  import('./screens/HomeScreen').then((m) => ({ default: m.HomeScreen }))
);
const OnboardingScreen = lazy(() =>
  import('./screens/OnboardingScreen').then((m) => ({ default: m.OnboardingScreen }))
);
const SessionScreen = lazy(() =>
  import('./screens/SessionScreen').then((m) => ({ default: m.SessionScreen }))
);
const ModeSettingsScreen = lazy(() =>
  import('./screens/ModeSettingsScreen').then((m) => ({ default: m.ModeSettingsScreen }))
);
const LibraryScreen = lazy(() =>
  import('./screens/LibraryScreen').then((m) => ({ default: m.LibraryScreen }))
);
const ItemEditScreen = lazy(() =>
  import('./screens/ItemEditScreen').then((m) => ({ default: m.ItemEditScreen }))
);
const SettingsScreen = lazy(() =>
  import('./screens/SettingsScreen').then((m) => ({ default: m.SettingsScreen }))
);
const DevScreen = lazy(() =>
  import('./screens/DevScreen').then((m) => ({ default: m.DevScreen }))
);
const StyleguideScreen = lazy(() =>
  import('./screens/StyleguideScreen').then((m) => ({ default: m.StyleguideScreen }))
);

const RouteLoadingFallback: React.FC = () => (
  <div
    style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--color-bg-base)',
    }}
    aria-label="Loading page"
  >
    <span className="btn-spinner" aria-hidden="true" style={{ width: 32, height: 32 }} />
  </div>
);

const AppRoutes: React.FC = () => {
  const { settings } = useLock();

  // If settings are loaded and onboarding has not been completed, redirect to /onboarding
  const needsOnboarding = settings !== null && !settings.onboardingDone;

  // Cold launch open-into redirect (e.g. directly into Rescue or Start on initial launch)
  const shouldOpenInto = useMemo(() => {
    if (!settings || !settings.onboardingDone) return null;
    if (settings.openInto && settings.openInto !== 'home') {
      const alreadyHandled = sessionStorage.getItem('ember_cold_open_done');
      if (!alreadyHandled) {
        sessionStorage.setItem('ember_cold_open_done', 'true');
        return `/session/${settings.openInto}`;
      }
    }
    return null;
  }, [settings]);

  return (
    <>
      <PrivacyCurtain />
      <LockOverlay />
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          <Route
            path="/"
            element={
              needsOnboarding ? (
                <Navigate to="/onboarding" replace />
              ) : shouldOpenInto ? (
                <Navigate to={shouldOpenInto} replace />
              ) : (
                <HomeScreen />
              )
            }
          />
          <Route path="/onboarding" element={<OnboardingScreen />} />
          <Route path="/session/:mode" element={<SessionScreen />} />
          <Route path="/modes/:mode" element={<ModeSettingsScreen />} />
          <Route path="/library" element={<LibraryScreen />} />
          <Route path="/library/new" element={<ItemEditScreen />} />
          <Route path="/library/:id" element={<ItemEditScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/dev" element={<DevScreen />} />
          <Route path="/dev/styleguide" element={<StyleguideScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
};

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <LockProvider>
          <AppRoutes />
        </LockProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
