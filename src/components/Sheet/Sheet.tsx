// Accessible Bottom Sheet component with backdrop blur, drag handle, and Esc key dismissal.

import React, { useEffect, useCallback } from 'react';
import { IconClose } from '../Icons';
import { IconButton } from '../IconButton/IconButton';
import { STRINGS } from '../../strings';
import './Sheet.css';

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const Sheet: React.FC<SheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className = '',
}) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="ember-sheet-overlay" onClick={onClose} role="presentation">
      <div
        className={`ember-sheet ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Dialog sheet'}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle" aria-hidden="true" />

        <div className="sheet-header">
          {title ? <h2 className="sheet-title">{title}</h2> : <div />}
          <IconButton
            aria-label={STRINGS.accessibility.closeSheet}
            variant="quiet"
            size="sm"
            onClick={onClose}
          >
            <IconClose size={20} />
          </IconButton>
        </div>

        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
};
