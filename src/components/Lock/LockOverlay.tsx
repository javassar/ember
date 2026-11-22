// Fullscreen Lock screen overlay requiring PIN authentication with auto-submit and forgot-PIN erase.

import React, { useState, useEffect } from 'react';
import { useLock } from '../../context/LockContext';
import { NumberPad } from '../NumberPad/NumberPad';
import { Sheet } from '../Sheet/Sheet';
import { Button } from '../Button/Button';
import { APP_NAME } from '../../config';
import { STRINGS } from '../../strings';
import './LockOverlay.css';

export const LockOverlay: React.FC = () => {
  const {
    isLocked,
    pinLength,
    remainingBlockSeconds,
    verifyAttempt,
    resetAndErase,
  } = useLock();

  const [enteredDigits, setEnteredDigits] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [isForgotSheetOpen, setIsForgotSheetOpen] = useState<boolean>(false);
  const [eraseConfirmText, setEraseConfirmText] = useState<string>('');

  // Auto-submit when entered length matches the stored PIN length
  useEffect(() => {
    if (!isLocked) {
      setEnteredDigits('');
      setErrorMessage(null);
      return;
    }

    if (enteredDigits.length === pinLength) {
      const submitPin = async () => {
        const result = await verifyAttempt(enteredDigits);
        if (!result.success) {
          setIsShaking(true);
          setTimeout(() => setIsShaking(false), 500);

          if (result.remainingSeconds && result.remainingSeconds > 0) {
            setErrorMessage(STRINGS.lock.blockedNotice(result.remainingSeconds));
          } else {
            setErrorMessage(STRINGS.lock.wrongPinAttempts(result.attempts, 5));
          }
          setEnteredDigits('');
        }
      };
      submitPin();
    }
  }, [enteredDigits, pinLength, isLocked, verifyAttempt]);

  if (!isLocked) return null;

  const isBlocked = remainingBlockSeconds > 0;

  const handleDigit = (digit: string) => {
    if (isBlocked) return;
    if (enteredDigits.length < pinLength) {
      setErrorMessage(null);
      setEnteredDigits((prev) => prev + digit);
    }
  };

  const handleDelete = () => {
    if (isBlocked) return;
    setEnteredDigits((prev) => prev.slice(0, -1));
    setErrorMessage(null);
  };

  const handleForgotErase = async () => {
    if (eraseConfirmText.trim() === 'ERASE') {
      await resetAndErase();
      setIsForgotSheetOpen(false);
      setEraseConfirmText('');
    }
  };

  return (
    <div className="ember-lock-overlay" role="dialog" aria-modal="true" aria-label={STRINGS.lock.title}>
      <div className="lock-content">
        <header className="lock-header">
          <h1 className="lock-app-title">{APP_NAME}</h1>
          <p className="lock-subtitle">{STRINGS.lock.enterPin}</p>
        </header>

        {/* Lockout countdown notification */}
        {isBlocked ? (
          <div className="lock-blocked-banner" role="alert">
            {STRINGS.lock.blockedNotice(remainingBlockSeconds)}
          </div>
        ) : errorMessage ? (
          <div className="lock-error-text" role="alert">
            {errorMessage}
          </div>
        ) : null}

        {/* PIN Dot Indicators */}
        <div className={`lock-pin-dots ${isShaking ? 'lock-pin-dots--shake' : ''}`}>
          {Array.from({ length: pinLength }).map((_, i) => (
            <span
              key={i}
              className={`pin-dot-indicator ${i < enteredDigits.length ? 'pin-dot-indicator--filled' : ''}`}
              aria-hidden="true"
            />
          ))}
        </div>

        {/* Custom NumberPad */}
        <NumberPad
          onDigit={handleDigit}
          onDelete={handleDelete}
          disabled={isBlocked}
          className="lock-numberpad"
        />

        {/* Forgot PIN Link */}
        <footer className="lock-footer">
          <button
            type="button"
            className="forgot-pin-btn"
            onClick={() => setIsForgotSheetOpen(true)}
          >
            {STRINGS.lock.forgotPin}
          </button>
        </footer>
      </div>

      {/* Forgot PIN Confirmation Sheet */}
      <Sheet
        isOpen={isForgotSheetOpen}
        onClose={() => setIsForgotSheetOpen(false)}
        title={STRINGS.lock.forgotTitle}
      >
        <div className="forgot-sheet-content">
          <p className="forgot-explanation">{STRINGS.lock.forgotExplanation}</p>
          <label htmlFor="erase-confirm-input" className="erase-prompt-label">
            {STRINGS.lock.typeErasePrompt}
          </label>
          <input
            id="erase-confirm-input"
            type="text"
            className="erase-input"
            placeholder="ERASE"
            value={eraseConfirmText}
            onChange={(e) => setEraseConfirmText(e.target.value)}
            autoCapitalize="characters"
            autoComplete="off"
          />
          <Button
            variant="danger"
            fullWidth
            disabled={eraseConfirmText.trim() !== 'ERASE'}
            onClick={handleForgotErase}
          >
            {STRINGS.lock.eraseButton}
          </Button>
        </div>
      </Sheet>
    </div>
  );
};
