// Root application component configuring routing and layouts.

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomeScreen } from './screens/HomeScreen';
import { DevScreen } from './screens/DevScreen';

export const App: React.FC = () => {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/dev" element={<DevScreen />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
