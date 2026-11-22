// Accessible Switch / Toggle component conforming to ARIA role="switch".

import React from 'react';
import './Toggle.css';

export interface ToggleProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export const Toggle: React.FC<ToggleProps> = ({
  id,
  checked,
  onChange,
  label,
  description,
  disabled = false,
}) => {
  const toggleId = id || `toggle-${React.useId()}`;

  const handleClick = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onChange(!checked);
    }
  };

  return (
    <div className={`ember-toggle-wrapper ${disabled ? 'ember-toggle-wrapper--disabled' : ''}`}>
      {label && (
        <label htmlFor={toggleId} className="ember-toggle-label" onClick={handleClick}>
          <span className="toggle-label-text">{label}</span>
          {description && <span className="toggle-desc-text">{description}</span>}
        </label>
      )}

      <button
        id={toggleId}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={`ember-toggle-switch ${checked ? 'ember-toggle-switch--checked' : ''}`}
      >
        <span className="toggle-thumb" aria-hidden="true" />
      </button>
    </div>
  );
};
