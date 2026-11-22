// Interactive Chip component for filters and mode membership cycling (off, rotating, core).

import React from 'react';
import type { Mode, Membership } from '../../types';
import './Chip.css';

export interface ChipProps {
  label: string;
  state?: Membership;
  modeAccent?: Mode;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  state,
  modeAccent,
  selected = false,
  onClick,
  className = '',
}) => {
  const classes = [
    'ember-chip',
    state ? `ember-chip--state-${state}` : '',
    modeAccent ? `ember-chip--mode-${modeAccent}` : '',
    selected ? 'ember-chip--selected' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={classes}
      onClick={onClick}
    >
      <span className="chip-indicator" aria-hidden="true" />
      <span className="chip-label">{label}</span>
      {state && <span className="chip-state-text">{`(${state})`}</span>}
    </button>
  );
};
