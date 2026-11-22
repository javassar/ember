// Reusable Button component adhering to Ember design tokens and 44px touch targets.

import React from 'react';
import './Button.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  modeAccent?: 'start' | 'charge' | 'rescue';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  modeAccent,
  disabled = false,
  children,
  className = '',
  ...rest
}) => {
  const classes = [
    'ember-btn',
    `ember-btn--${variant}`,
    `ember-btn--${size}`,
    fullWidth ? 'ember-btn--full' : '',
    loading ? 'ember-btn--loading' : '',
    modeAccent ? `ember-btn--accent-${modeAccent}` : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading}
      {...rest}
    >
      {loading ? (
        <span className="btn-spinner" aria-hidden="true" />
      ) : null}
      <span className="btn-content">{children}</span>
    </button>
  );
};
