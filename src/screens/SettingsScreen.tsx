// Settings screen managing security PIN, lock timeouts, honesty disclosure, and preferences.

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ScreenLayout,
  LivingBackground,
  Button,
  IconButton,
  IconBack,
  Sheet,
  NumberPad,
  SegmentedControl,
  Toast,
} from '../components';
import { useLock } from '../context/LockContext';
import { STRINGS } from '../strings';
import './SettingsScreen.css';

export const SettingsScreen: React.FC = () => {
  const {
    hasPin,
    pinLength,
    settings,
    setPin,
    setTimeoutMs,
  } = useLock();

  // PIN modal flow
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinModalMode, setPinModalMode] = useState<'create' | 'change' | 'remove'>('create');
  const [enteredNewPin, setEnteredNewPin] = useState('');
  const [enteredConfirmPin, setEnteredConfirmPin] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const timeoutOptions = [
    { value: '0', label: 'Every time' },
    { value: '60000', label: '1 min' },
    { value: '300000', label: '5 min' },
    { value: '900000', label: '15 min' },
    { value: '3600000', label: '1 hour' },
  ];

  const currentTimeoutVal = String(settings?.lockTimeoutMs ?? 300000);

  const handleTimeoutChange = async (val: string) => {
    await setTimeoutMs(Number(val));
    setToastMessage('Lock timeout updated.');
  };

  const openPinModal = (mode: 'create' | 'change' | 'remove') => {
    setPinModalMode(mode);
    setEnteredNewPin('');
    setEnteredConfirmPin('');
    setIsConfirming(false);
    setPinError(null);
    setIsPinModalOpen(true);
  };

  const handleDigit = (digit: string) => {
    setPinError(null);
    if (!isConfirming) {
      if (enteredNewPin.length < 8) {
        setEnteredNewPin((prev) => prev + digit);
      }
    } else {
      if (enteredConfirmPin.length < 8) {
        setEnteredConfirmPin((prev) => prev + digit);
      }
    }
  };

  const handleDelete = () => {
    setPinError(null);
    if (!isConfirming) {
      setEnteredNewPin((prev) => prev.slice(0, -1));
    } else {
      setEnteredConfirmPin((prev) => prev.slice(0, -1));
    }
  };

  const handleSavePin = async () => {
    if (pinModalMode === 'remove') {
      await setPin(null);
      setIsPinModalOpen(false);
      setToastMessage('PIN protection removed.');
      return;
    }

    if (!isConfirming) {
      if (enteredNewPin.length < 4) {
        setPinError('PIN must be at least 4 digits.');
        return;
      }
      setIsConfirming(true);
      return;
    }

    if (enteredConfirmPin !== enteredNewPin) {
      setPinError('PINs do not match. Try again.');
      setEnteredConfirmPin('');
      return;
    }

    await setPin(enteredNewPin);
    setIsPinModalOpen(false);
    setToastMessage(pinModalMode === 'create' ? 'PIN enabled.' : 'PIN updated.');
  };

  return (
    <>
      <LivingBackground mode="home" />

      <ScreenLayout maxWidth="md" className="settings-layout">
        <header className="settings-header">
          <Link to="/" tabIndex={-1}>
            <IconButton aria-label={STRINGS.common.back} variant="quiet">
              <IconBack />
            </IconButton>
          </Link>
          <h1 className="settings-title">{STRINGS.settings.title}</h1>
          <div style={{ width: 44 }} />
        </header>

        <main className="settings-body" role="main">
          {/* Security & PIN Section */}
          <section className="settings-card" aria-labelledby="sec-heading">
            <h2 id="sec-heading" className="settings-card-title">
              {STRINGS.settings.securitySection}
            </h2>

            <div className="pin-status-row">
              <div className="pin-status-info">
                <span className="pin-status-label">
                  {hasPin ? STRINGS.settings.pinEnabled : STRINGS.settings.pinDisabled}
                </span>
                {hasPin && (
                  <span className="pin-status-sub">
                    {pinLength}-digit numeric passkey active
                  </span>
                )}
              </div>

              <div className="pin-actions">
                {!hasPin ? (
                  <Button variant="primary" size="sm" onClick={() => openPinModal('create')}>
                    {STRINGS.settings.setPinBtn}
                  </Button>
                ) : (
                  <div className="pin-actions-split">
                    <Button variant="secondary" size="sm" onClick={() => openPinModal('change')}>
                      {STRINGS.settings.changePinBtn}
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => openPinModal('remove')}>
                      {STRINGS.settings.removePinBtn}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Lock Timeout (only active when PIN is set) */}
            {hasPin && (
              <div className="lock-timeout-container">
                <div className="timeout-header">
                  <span className="timeout-label">{STRINGS.settings.lockTimeoutTitle}</span>
                  <span className="timeout-desc">{STRINGS.settings.lockTimeoutDesc}</span>
                </div>
                <SegmentedControl
                  value={currentTimeoutVal}
                  options={timeoutOptions}
                  onChange={handleTimeoutChange}
                />
              </div>
            )}

            {/* Honesty Note */}
            <div className="honesty-note-box">
              <span className="honesty-note-title">
                {STRINGS.settings.honestyNoteTitle}
              </span>
              <p className="honesty-note-body">
                {STRINGS.settings.honestyNoteBody}
              </p>
            </div>
          </section>

          {/* Quick Diagnostics Link */}
          <section className="settings-card" aria-labelledby="diag-heading">
            <h2 id="diag-heading" className="settings-card-title">
              {STRINGS.settings.devSection}
            </h2>
            <div className="diag-links-row">
              <Link to="/dev">
                <Button variant="secondary" size="sm">
                  Developer Diagnostics (/dev)
                </Button>
              </Link>
              <Link to="/dev/styleguide">
                <Button variant="ghost" size="sm">
                  Design Styleguide (/dev/styleguide)
                </Button>
              </Link>
            </div>
          </section>
        </main>

        {/* PIN Setup / Change Modal Sheet */}
        <Sheet
          isOpen={isPinModalOpen}
          onClose={() => setIsPinModalOpen(false)}
          title={
            pinModalMode === 'remove'
              ? 'Remove PIN Protection'
              : isConfirming
              ? 'Confirm New PIN'
              : pinModalMode === 'create'
              ? 'Create New PIN'
              : 'Enter New PIN'
          }
        >
          {pinModalMode === 'remove' ? (
            <div className="pin-remove-content">
              <p className="remove-pin-warning">
                Removing your PIN means Ember will open immediately without asking for a code.
              </p>
              <div className="sheet-action-stack">
                <Button variant="danger" fullWidth onClick={handleSavePin}>
                  Yes, Remove PIN
                </Button>
                <Button variant="ghost" fullWidth onClick={() => setIsPinModalOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="pin-modal-content">
              <p className="pin-modal-sub">
                {isConfirming
                  ? 'Re-enter your PIN to verify'
                  : 'Enter 4 to 8 digits on the keypad'}
              </p>

              {pinError && <p className="pin-error-text">{pinError}</p>}

              <div className="pin-dots-display">
                {Array.from({ length: 4 }).map((_, i) => {
                  const val = isConfirming ? enteredConfirmPin : enteredNewPin;
                  return (
                    <span
                      key={i}
                      className={`pin-dot ${i < val.length ? 'pin-dot--filled' : ''}`}
                    />
                  );
                })}
              </div>

              <NumberPad onDigit={handleDigit} onDelete={handleDelete} />

              <div className="sheet-action-stack" style={{ marginTop: 'var(--space-6)' }}>
                <Button
                  variant="primary"
                  fullWidth
                  disabled={(isConfirming ? enteredConfirmPin : enteredNewPin).length < 4}
                  onClick={handleSavePin}
                >
                  {isConfirming ? 'Save PIN' : 'Continue'}
                </Button>
                <Button variant="ghost" fullWidth onClick={() => setIsPinModalOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </Sheet>

        {toastMessage && (
          <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
        )}
      </ScreenLayout>
    </>
  );
};
