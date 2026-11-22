// Root application component configuring routing, security providers, and overlays.

import React, { useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LockProvider, useLock } from './context/LockContext';
import { LockOverlay } from './components/Lock/LockOverlay';
import { PrivacyCurtain } from './components/PrivacyCurtain/PrivacyCurtain';
import { HomeScreen } from './screens/HomeScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { SessionScreen } from './screens/SessionScreen';
import { ModeSettingsScreen } from './screens/ModeSettingsScreen';
import { LibraryScreen } from './screens/LibraryScreen';
import { ItemEditScreen } from './screens/ItemEditScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { DevScreen } from './screens/DevScreen';
import { StyleguideScreen } from './screens/StyleguideScreen';

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
      </Routes>
    </>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <LockProvider>
        <AppRoutes />
      </LockProvider>
    </BrowserRouter>
  );
};

export default App;
