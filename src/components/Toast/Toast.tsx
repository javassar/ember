// Floating Toast notification for quiet user feedback.

import React, { useEffect } from 'react';
import './Toast.css';

export interface ToastProps {
  message: string;
  type?: 'info' | 'success' | 'warning';
  durationMs?: number;
  onDismiss: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  durationMs = 3000,
  onDismiss,
}) => {
  useEffect(() => {
    if (durationMs > 0) {
      const timer = setTimeout(onDismiss, durationMs);
      return () => clearTimeout(timer);
    }
  }, [durationMs, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`ember-toast ember-toast--${type}`}
      onClick={onDismiss}
    >
      <span className="toast-dot" aria-hidden="true" />
      <span className="toast-text">{message}</span>
    </div>
  );
};
