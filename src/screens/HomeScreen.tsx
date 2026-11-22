// Placeholder Home screen displaying the Ember brand and skeleton layout.

import React from 'react';
import { Link } from 'react-router-dom';
import { APP_NAME } from '../config';
import { STRINGS } from '../strings';
import './HomeScreen.css';

export const HomeScreen: React.FC = () => {
  return (
    <main className="home-screen" role="main">
      <div className="home-hero">
        <div className="ember-glow-orb" aria-hidden="true" />
        <h1 className="app-title">{APP_NAME}</h1>
        <p className="app-tagline">{STRINGS.app.tagline}</p>
        <p className="app-subtagline">{STRINGS.app.taglineSub}</p>
      </div>

      <footer className="home-footer">
        <span className="offline-pill">
          <span className="status-dot" aria-hidden="true" />
          {STRINGS.home.offlineReady}
        </span>
        <Link to="/dev" className="dev-link">
          Open Dev Diagnostics (/dev) →
        </Link>
      </footer>
    </main>
  );
};
