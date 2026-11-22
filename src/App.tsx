// Root application component configuring routing, security providers, and overlays.

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LockProvider, useLock } from './context/LockContext';
import { LockOverlay } from './components/Lock/LockOverlay';
import { PrivacyCurtain } from './components/PrivacyCurtain/PrivacyCurtain';
import { HomeScreen } from './screens/HomeScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { LibraryScreen } from './screens/LibraryScreen';
import { ItemEditScreen } from './screens/ItemEditScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { DevScreen } from './screens/DevScreen';
import { StyleguideScreen } from './screens/StyleguideScreen';

const AppRoutes: React.FC = () => {
  const { settings } = useLock();

  // If settings are loaded and onboarding has not been completed, redirect to /onboarding
  const needsOnboarding = settings !== null && !settings.onboardingDone;

  return (
    <>
      <PrivacyCurtain />
      <LockOverlay />
      <Routes>
        <Route
          path="/"
          element={needsOnboarding ? <Navigate to="/onboarding" replace /> : <HomeScreen />}
        />
        <Route path="/onboarding" element={<OnboardingScreen />} />
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
