// Comprehensive design styleguide showcasing typography, color tokens, and all UI components.

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { STRINGS } from '../strings';
import {
  LivingBackground,
  ScreenLayout,
  Button,
  IconButton,
  IconSettings,
  IconLibrary,
  IconClose,
  IconBack,
  IconPlus,
  IconCheck,
  IconHelped,
  IconVolumeOn,
  IconVolumeOff,
  Toggle,
  SegmentedControl,
  Chip,
  TextArea,
  ProgressDots,
  NumberPad,
  Sheet,
  Toast,
} from '../components';
import type { Mode, Membership } from '../types';
import './StyleguideScreen.css';

export const StyleguideScreen: React.FC = () => {
  // Living background preview mode
  const [bgMode, setBgMode] = useState<Mode | 'home'>('home');

  // Interactive component states
  const [toggleVal, setToggleVal] = useState(true);
  const [segmentVal, setSegmentVal] = useState<'daily' | 'each-session'>('daily');
  const [chipState, setChipState] = useState<Membership>('rotating');
  const [textVal, setTextVal] = useState('Write something to your future self...');
  const [dotStep, setDotStep] = useState(2);
  const [pinDigits, setPinDigits] = useState('');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [helpedActive, setHelpedActive] = useState(false);
  const [btnLoading, setBtnLoading] = useState(false);

  const cycleChip = () => {
    if (chipState === 'off') setChipState('rotating');
    else if (chipState === 'rotating') setChipState('core');
    else setChipState('off');
  };

  const handleDigit = (digit: string) => {
    if (pinDigits.length < 6) {
      setPinDigits((prev) => prev + digit);
    }
  };

  const handleDeleteDigit = () => {
    setPinDigits((prev) => prev.slice(0, -1));
  };

  return (
    <>
      <LivingBackground mode={bgMode} />

      <ScreenLayout maxWidth="lg" className="styleguide-layout">
        <header className="styleguide-header">
          <Link to="/" className="back-link">
            ← {STRINGS.nav.home}
          </Link>
          <h1 className="styleguide-title">{STRINGS.styleguide.title}</h1>
          <p className="styleguide-desc">{STRINGS.styleguide.description}</p>
        </header>

        {/* Living Background Mode Switcher */}
        <section className="guide-card" aria-labelledby="bg-heading">
          <h2 id="bg-heading" className="card-title">
            {STRINGS.styleguide.backgroundSection}
          </h2>
          <p className="card-sub">
            Switch the living background mode to preview the GPU-accelerated gradient cross-fade (1.2s transition).
          </p>
          <div className="bg-buttons-row">
            <Button
              variant={bgMode === 'home' ? 'primary' : 'secondary'}
              onClick={() => setBgMode('home')}
            >
              Home (Blended)
            </Button>
            <Button
              variant={bgMode === 'start' ? 'primary' : 'secondary'}
              modeAccent={bgMode === 'start' ? 'start' : undefined}
              onClick={() => setBgMode('start')}
            >
              Start (Warm Amber)
            </Button>
            <Button
              variant={bgMode === 'charge' ? 'primary' : 'secondary'}
              modeAccent={bgMode === 'charge' ? 'charge' : undefined}
              onClick={() => setBgMode('charge')}
            >
              Charge (Hot Coral)
            </Button>
            <Button
              variant={bgMode === 'rescue' ? 'primary' : 'secondary'}
              modeAccent={bgMode === 'rescue' ? 'rescue' : undefined}
              onClick={() => setBgMode('rescue')}
            >
              Rescue (Calm Teal)
            </Button>
          </div>
        </section>

        {/* Typography Scale */}
        <section className="guide-card" aria-labelledby="type-heading">
          <h2 id="type-heading" className="card-title">
            {STRINGS.styleguide.typographySection}
          </h2>

          <div className="type-showcase">
            <div className="type-sample">
              <span className="type-meta">Fraunces • Display Hero (clamp 2.5rem - 3.75rem)</span>
              <p className="type-hero">Deliberate Attention</p>
            </div>
            <div className="type-sample">
              <span className="type-meta">Fraunces • Display Heading 1 (2.25rem)</span>
              <p className="type-title-1">Set your intention for the morning.</p>
            </div>
            <div className="type-sample">
              <span className="type-meta">Fraunces • Display Heading 2 (1.5rem)</span>
              <p className="type-title-2">“Quiet mornings make room for clear thoughts.”</p>
            </div>
            <div className="type-sample">
              <span className="type-meta">Inter • Interface Body (1rem, 1.5 line-height)</span>
              <p className="type-body-inter">
                Content apps are built to never end and follow someone else’s algorithm. Ember shows
                only content you chose in finite sessions.
              </p>
            </div>
            <div className="type-sample">
              <span className="type-meta">Inter • Caption & Metadata (0.8125rem)</span>
              <p className="type-caption-inter">Updated 2 minutes ago • Core item in Rescue</p>
            </div>
          </div>
        </section>

        {/* Color Tokens & Mode Accents */}
        <section className="guide-card" aria-labelledby="color-heading">
          <h2 id="color-heading" className="card-title">
            {STRINGS.styleguide.colorsSection}
          </h2>
          <div className="color-swatches-grid">
            <div className="swatch-card">
              <div className="swatch-box swatch--base" />
              <span className="swatch-name">Base Background</span>
              <span className="swatch-code">#0B0B10</span>
            </div>
            <div className="swatch-card">
              <div className="swatch-box swatch--surface" />
              <span className="swatch-name">Surface</span>
              <span className="swatch-code">#16161F</span>
            </div>
            <div className="swatch-card">
              <div className="swatch-box swatch--elevated" />
              <span className="swatch-name">Elevated</span>
              <span className="swatch-code">#1F1F2B</span>
            </div>
            <div className="swatch-card">
              <div className="swatch-box swatch--start" />
              <span className="swatch-name">Start Accent</span>
              <span className="swatch-code">#F4B97A</span>
            </div>
            <div className="swatch-card">
              <div className="swatch-box swatch--charge" />
              <span className="swatch-name">Charge Accent</span>
              <span className="swatch-code">#FF6B6B</span>
            </div>
            <div className="swatch-card">
              <div className="swatch-box swatch--rescue" />
              <span className="swatch-name">Rescue Accent</span>
              <span className="swatch-code">#5EC9B8</span>
            </div>
          </div>
        </section>

        {/* Buttons & IconButtons */}
        <section className="guide-card" aria-labelledby="btn-heading">
          <h2 id="btn-heading" className="card-title">
            {STRINGS.styleguide.buttonsSection}
          </h2>

          <div className="component-row">
            <Button variant="primary">Primary Button</Button>
            <Button variant="secondary">Secondary Button</Button>
            <Button variant="danger">Danger Button</Button>
            <Button variant="ghost">Ghost Button</Button>
            <Button
              variant="secondary"
              loading={btnLoading}
              onClick={() => {
                setBtnLoading(true);
                setTimeout(() => setBtnLoading(false), 1500);
              }}
            >
              {btnLoading ? 'Loading' : 'Click to Load'}
            </Button>
            <Button variant="primary" disabled>
              Disabled
            </Button>
          </div>

          <div className="component-row" style={{ marginTop: 'var(--space-4)' }}>
            <IconButton aria-label="Settings" variant="quiet">
              <IconSettings />
            </IconButton>
            <IconButton aria-label="Library" variant="filled">
              <IconLibrary />
            </IconButton>
            <IconButton aria-label="Add" variant="bordered">
              <IconPlus />
            </IconButton>
            <IconButton aria-label="Check" variant="filled">
              <IconCheck />
            </IconButton>
            <IconButton aria-label="Back" variant="quiet">
              <IconBack />
            </IconButton>
            <IconButton aria-label="Close" variant="quiet">
              <IconClose />
            </IconButton>
            <IconButton
              aria-label="Helped"
              variant="quiet"
              active={helpedActive}
              onClick={() => setHelpedActive(!helpedActive)}
            >
              <IconHelped active={helpedActive} />
            </IconButton>
            <IconButton aria-label="Sound on" variant="quiet">
              <IconVolumeOn />
            </IconButton>
            <IconButton aria-label="Sound off" variant="quiet">
              <IconVolumeOff />
            </IconButton>
          </div>
        </section>

        {/* Form Controls: Toggle & SegmentedControl */}
        <section className="guide-card" aria-labelledby="controls-heading">
          <h2 id="controls-heading" className="card-title">
            {STRINGS.styleguide.controlsSection}
          </h2>
          <div className="controls-grid">
            <Toggle
              checked={toggleVal}
              onChange={setToggleVal}
              label="Breath-paced ritual opening"
              description="Displays gentle glow before content begins"
            />

            <div style={{ marginTop: 'var(--space-4)' }}>
              <span className="field-title">Refresh Interval</span>
              <SegmentedControl
                value={segmentVal}
                onChange={setSegmentVal}
                options={[
                  { value: 'daily', label: 'Daily Refresh' },
                  { value: 'each-session', label: 'Each Session' },
                ]}
              />
            </div>
          </div>
        </section>

        {/* Chips & Mode Cycling */}
        <section className="guide-card" aria-labelledby="chips-heading">
          <h2 id="chips-heading" className="card-title">
            {STRINGS.styleguide.chipsSection}
          </h2>
          <p className="card-sub">
            Tap a chip to cycle through membership states (Off → Rotating → Core).
          </p>
          <div className="component-row">
            <Chip
              label="Start"
              state={chipState}
              modeAccent="start"
              onClick={cycleChip}
            />
            <Chip
              label="Charge"
              state="core"
              modeAccent="charge"
            />
            <Chip
              label="Rescue"
              state="rotating"
              modeAccent="rescue"
            />
            <Chip
              label="All Items"
              selected
            />
          </div>
        </section>

        {/* TextArea */}
        <section className="guide-card" aria-labelledby="textarea-heading">
          <h2 id="textarea-heading" className="card-title">
            TextArea Component
          </h2>
          <TextArea
            label="Write something to your future self"
            hint="Line breaks are respected. Font size scales with length."
            value={textVal}
            maxLength={300}
            showCharCount
            onChange={(e) => setTextVal(e.target.value)}
          />
        </section>

        {/* Progress Dots */}
        <section className="guide-card" aria-labelledby="dots-heading">
          <h2 id="dots-heading" className="card-title">
            {STRINGS.styleguide.dotsSection}
          </h2>
          <div className="dots-demo-row">
            <ProgressDots total={5} current={dotStep} />
            <div className="dots-stepper">
              <Button
                size="sm"
                variant="secondary"
                disabled={dotStep <= 0}
                onClick={() => setDotStep(dotStep - 1)}
              >
                Previous Step
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={dotStep >= 4}
                onClick={() => setDotStep(dotStep + 1)}
              >
                Next Step
              </Button>
            </div>
          </div>
        </section>

        {/* NumberPad (PIN Keypad) */}
        <section className="guide-card" aria-labelledby="keypad-heading">
          <h2 id="keypad-heading" className="card-title">
            {STRINGS.styleguide.keypadSection}
          </h2>
          <div className="pin-demo-container">
            <div className="pin-display" aria-label="Entered PIN">
              {Array.from({ length: 4 }).map((_, i) => (
                <span
                  key={i}
                  className={`pin-dot ${i < pinDigits.length ? 'pin-dot--filled' : ''}`}
                />
              ))}
            </div>

            <NumberPad
              onDigit={handleDigit}
              onDelete={handleDeleteDigit}
              onClear={() => setPinDigits('')}
            />
          </div>
        </section>

        {/* Overlays: Bottom Sheet & Toast */}
        <section className="guide-card" aria-labelledby="sheet-heading">
          <h2 id="sheet-heading" className="card-title">
            {STRINGS.styleguide.sheetSection} & Toasts
          </h2>
          <div className="component-row">
            <Button variant="primary" onClick={() => setIsSheetOpen(true)}>
              {STRINGS.styleguide.openSheet}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setToastMsg('Sample notification triggered!')}
            >
              {STRINGS.styleguide.triggerToast}
            </Button>
          </div>
        </section>

        {/* Active Sheet Overlay */}
        <Sheet
          isOpen={isSheetOpen}
          onClose={() => setIsSheetOpen(false)}
          title="Bottom Sheet Preview"
        >
          <div className="sheet-preview-content">
            <p className="sheet-text">
              This is a fluid bottom sheet with backdrop blur, drag handle, and Esc key dismissal.
              It adapts smoothly to mobile screens and desktop dialogs.
            </p>
            <Button
              variant="primary"
              fullWidth
              style={{ marginTop: 'var(--space-6)' }}
              onClick={() => setIsSheetOpen(false)}
            >
              Close Sheet
            </Button>
          </div>
        </Sheet>

        {/* Floating Toast Notification */}
        {toastMsg && (
          <Toast
            message={toastMsg}
            type="success"
            onDismiss={() => setToastMsg(null)}
          />
        )}
      </ScreenLayout>
    </>
  );
};
