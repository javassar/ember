// Custom large numeric keypad for PIN entry with physical keyboard fallback.

import React, { useEffect, useCallback } from 'react';
import { IconDeleteKey } from '../Icons';
import { STRINGS } from '../../strings';
import './NumberPad.css';

export interface NumberPadProps {
  onDigit: (digit: string) => void;
  onDelete: () => void;
  onClear?: () => void;
  disabled?: boolean;
  className?: string;
}

export const NumberPad: React.FC<NumberPadProps> = ({
  onDigit,
  onDelete,
  onClear,
  disabled = false,
  className = '',
}) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (disabled) return;
      if (/^[0-9]$/.test(e.key)) {
        onDigit(e.key);
      } else if (e.key === 'Backspace') {
        onDelete();
      } else if (e.key === 'Escape' && onClear) {
        onClear();
      }
    },
    [disabled, onDigit, onDelete, onClear]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div className={`ember-numberpad ${className}`} role="group" aria-label="PIN numeric keypad">
      {digits.map((digit) => (
        <button
          key={digit}
          type="button"
          className="pad-key"
          disabled={disabled}
          onClick={() => onDigit(digit)}
        >
          {digit}
        </button>
      ))}

      {/* Clear or blank */}
      <div className="pad-key-placeholder">
        {onClear && (
          <button
            type="button"
            className="pad-key pad-key--secondary"
            disabled={disabled}
            onClick={onClear}
            aria-label="Clear all digits"
          >
            C
          </button>
        )}
      </div>

      {/* 0 */}
      <button
        type="button"
        className="pad-key"
        disabled={disabled}
        onClick={() => onDigit('0')}
      >
        0
      </button>

      {/* Backspace */}
      <button
        type="button"
        className="pad-key pad-key--action"
        disabled={disabled}
        onClick={onDelete}
        aria-label={STRINGS.accessibility.deletePinDigit}
      >
        <IconDeleteKey size={24} />
      </button>
    </div>
  );
};
