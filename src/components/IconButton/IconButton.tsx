// Accessible Icon Button component with guaranteed 44px touch targets.

import React from 'react';
import './IconButton.css';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string; // Enforce accessible label for screen readers
  variant?: 'quiet' | 'filled' | 'bordered';
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
  children: React.ReactNode;
}

export const IconButton: React.FC<IconButtonProps> = ({
  'aria-label': ariaLabel,
  variant = 'quiet',
  size = 'md',
  active = false,
  disabled = false,
  children,
  className = '',
  ...rest
}) => {
  const classes = [
    'ember-icon-btn',
    `ember-icon-btn--${variant}`,
    `ember-icon-btn--${size}`,
    active ? 'ember-icon-btn--active' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={classes}
      aria-label={ariaLabel}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
};
