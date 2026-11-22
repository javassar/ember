// Home screen featuring the LivingBackground, mode tiles, header controls, and Rescue next-step reminders.

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { APP_NAME, DEFAULT_MODE_CONFIGS } from '../config';
import { STRINGS } from '../strings';
import {
  LivingBackground,
  ScreenLayout,
  IconButton,
  IconLibrary,
  IconSettings,
} from '../components';
import { listNextSteps, updateNextStep, getSettings } from '../data';
import type { Mode, NextStep, ModeConfig } from '../types';
import './HomeScreen.css';

const DISMISSED_STEP_KEY = 'ember_dismissed_rescue_steps';

const getDismissedStepIds = (): string[] => {
  try {
    return JSON.parse(sessionStorage.getItem(DISMISSED_STEP_KEY) || '[]');
  } catch {
    return [];
  }
};

export const HomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const [activeAccent, setActiveAccent] = useState<Mode | 'home'>('home');
  const [modesConfig, setModesConfig] = useState<Record<Mode, ModeConfig>>(DEFAULT_MODE_CONFIGS);
  const [lastRescueStep, setLastRescueStep] = useState<NextStep | null>(null);

  const loadHomeData = useCallback(async () => {
    try {
      const settings = await getSettings();
      if (settings?.modes) {
        setModesConfig(settings.modes);
      }

      // Check for an undone Rescue next-step from the last 24 hours
      const steps = await listNextSteps();
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const dismissed = getDismissedStepIds();
      const recentUndone = steps.find(
        (step) =>
          step.doneAt === null &&
          step.createdAt >= oneDayAgo &&
          !dismissed.includes(step.id)
      );
      setLastRescueStep(recentUndone || null);
    } catch (err) {
      console.error('Failed to load home data:', err);
    }
  }, []);

  useEffect(() => {
    loadHomeData();
  }, [loadHomeData]);

  const handleModeClick = (mode: Mode) => {
    navigate(`/session/${mode}`);
  };

  const handleStepDone = async (e: React.MouseEvent, step: NextStep) => {
    e.stopPropagation();
    step.doneAt = Date.now();
    await updateNextStep(step);
    setLastRescueStep(null);
  };

  const handleStepDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lastRescueStep) {
      const dismissed = getDismissedStepIds();
      if (!dismissed.includes(lastRescueStep.id)) {
        sessionStorage.setItem(
          DISMISSED_STEP_KEY,
          JSON.stringify([...dismissed, lastRescueStep.id])
        );
      }
    }
    setLastRescueStep(null);
  };

  return (
    <>
      <LivingBackground mode={activeAccent} />

      <ScreenLayout maxWidth="md" className="home-layout">
        {/* Top Header */}
        <header className="home-top-bar">
          <div className="home-brand">
            <h1 className="home-title">{APP_NAME}</h1>
          </div>

          <nav className="home-nav" aria-label="Quick Navigation">
            <Link to="/library" tabIndex={-1}>
              <IconButton aria-label={STRINGS.accessibility.openLibrary} variant="quiet">
                <IconLibrary size={22} />
              </IconButton>
            </Link>
            <Link to="/settings" tabIndex={-1}>
              <IconButton aria-label={STRINGS.accessibility.openSettings} variant="quiet">
                <IconSettings size={22} />
              </IconButton>
            </Link>
          </nav>
        </header>

        {/* Hero Section */}
        <section className="home-intro">
          <p className="intro-heading">{STRINGS.home.heading}</p>
          <p className="intro-subheading">{STRINGS.home.subheading}</p>
        </section>

        {/* Mode Selection Tiles */}
        <main className="modes-container" role="main">
          {/* Start Mode Tile */}
          <div
            role="button"
            tabIndex={0}
            className="mode-tile mode-tile--start"
            onClick={() => handleModeClick('start')}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') handleModeClick('start');
            }}
            onMouseEnter={() => setActiveAccent('start')}
            onMouseLeave={() => setActiveAccent('home')}
            onFocus={() => setActiveAccent('start')}
            onBlur={() => setActiveAccent('home')}
          >
            <div className="mode-tile-glow" aria-hidden="true" />
            <div className="mode-tile-content">
              <div className="mode-header">
                <div className="mode-header-left">
                  <span className="mode-badge mode-badge--start">Start</span>
                  <span className="mode-cue">“{modesConfig.start.cue}”</span>
                </div>
                <Link
                  to="/modes/start"
                  className="mode-configure-link"
                  aria-label="Configure Start space settings"
                  onClick={(e) => e.stopPropagation()}
                >
                  <IconSettings size={16} />
                </Link>
              </div>
              <h2 className="mode-label">{modesConfig.start.label}</h2>
              <p className="mode-desc">{modesConfig.start.description}</p>
            </div>
          </div>

          {/* Charge Mode Tile */}
          <div
            role="button"
            tabIndex={0}
            className="mode-tile mode-tile--charge"
            onClick={() => handleModeClick('charge')}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') handleModeClick('charge');
            }}
            onMouseEnter={() => setActiveAccent('charge')}
            onMouseLeave={() => setActiveAccent('home')}
            onFocus={() => setActiveAccent('charge')}
            onBlur={() => setActiveAccent('home')}
          >
            <div className="mode-tile-glow" aria-hidden="true" />
            <div className="mode-tile-content">
              <div className="mode-header">
                <div className="mode-header-left">
                  <span className="mode-badge mode-badge--charge">Charge</span>
                  <span className="mode-cue">“{modesConfig.charge.cue}”</span>
                </div>
                <Link
                  to="/modes/charge"
                  className="mode-configure-link"
                  aria-label="Configure Charge space settings"
                  onClick={(e) => e.stopPropagation()}
                >
                  <IconSettings size={16} />
                </Link>
              </div>
              <h2 className="mode-label">{modesConfig.charge.label}</h2>
              <p className="mode-desc">{modesConfig.charge.description}</p>
            </div>
          </div>

          {/* Rescue Mode Tile */}
          <div
            role="button"
            tabIndex={0}
            className="mode-tile mode-tile--rescue"
            onClick={() => handleModeClick('rescue')}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') handleModeClick('rescue');
            }}
            onMouseEnter={() => setActiveAccent('rescue')}
            onMouseLeave={() => setActiveAccent('home')}
            onFocus={() => setActiveAccent('rescue')}
            onBlur={() => setActiveAccent('home')}
          >
            <div className="mode-tile-glow" aria-hidden="true" />
            <div className="mode-tile-content">
              <div className="mode-header">
                <div className="mode-header-left">
                  <span className="mode-badge mode-badge--rescue">Rescue</span>
                  <span className="mode-cue">“{modesConfig.rescue.cue}”</span>
                </div>
                <Link
                  to="/modes/rescue"
                  className="mode-configure-link"
                  aria-label="Configure Rescue space settings"
                  onClick={(e) => e.stopPropagation()}
                >
                  <IconSettings size={16} />
                </Link>
              </div>
              <h2 className="mode-label">{modesConfig.rescue.label}</h2>
              <p className="mode-desc">{modesConfig.rescue.description}</p>

              {/* Last Time Rescue Next-Step */}
              {lastRescueStep && (
                <div
                  className="last-step-box"
                  role="region"
                  aria-label="Previous Rescue step reminder"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="last-step-text">
                    <span className="last-step-prefix">{STRINGS.home.lastTimeLabel}:</span>
                    <span className="last-step-body">{lastRescueStep.text}</span>
                  </div>
                  <div className="last-step-actions">
                    <button
                      type="button"
                      className="step-action-btn step-action--done"
                      onClick={(e) => handleStepDone(e, lastRescueStep)}
                    >
                      {STRINGS.home.markDone}
                    </button>
                    <button
                      type="button"
                      className="step-action-btn step-action--dismiss"
                      onClick={handleStepDismiss}
                    >
                      {STRINGS.home.dismiss}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="home-footer">
          <div className="home-footer-left">
            <span className="offline-pill">
              <span className="status-dot" aria-hidden="true" />
              {STRINGS.home.offlineReady}
            </span>
          </div>

          <div className="home-footer-links">
            <Link to="/dev/styleguide" className="quiet-footer-link">
              Styleguide
            </Link>
            <span className="footer-sep" aria-hidden="true">•</span>
            <Link to="/dev" className="quiet-footer-link">
              Dev Tools
            </Link>
          </div>
        </footer>
      </ScreenLayout>
    </>
  );
};
