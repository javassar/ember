// Segmented Control component for mutually exclusive selections.

import React from 'react';
import './SegmentedControl.css';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
  className?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel = 'Segmented options',
  className = '',
}: SegmentedControlProps<T>): React.ReactElement {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`ember-segmented-control ${className}`}
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={`segmented-item ${isSelected ? 'segmented-item--active' : ''}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
