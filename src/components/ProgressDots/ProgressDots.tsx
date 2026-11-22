// Quiet progress dots indicator ("2 of 5") with glowing active indicator.

import React from 'react';
import './ProgressDots.css';

export interface ProgressDotsProps {
  total: number;
  current: number; // 0-based or 1-based index (will be normalized)
  modeAccent?: 'start' | 'charge' | 'rescue';
  className?: string;
}

export const ProgressDots: React.FC<ProgressDotsProps> = ({
  total,
  current,
  modeAccent,
  className = '',
}) => {
  if (total <= 1) return null;

  // Normalized to 0-based index
  const activeIndex = current > total ? total - 1 : current >= 0 ? current : 0;

  return (
    <div
      role="progressbar"
      aria-valuenow={activeIndex + 1}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-label={`Step ${activeIndex + 1} of ${total}`}
      className={`ember-progress-dots ${modeAccent ? `progress--accent-${modeAccent}` : ''} ${className}`}
    >
      {Array.from({ length: total }, (_, i) => {
        const isCurrent = i === activeIndex;
        const isPassed = i < activeIndex;
        return (
          <span
            key={i}
            className={`dot ${isCurrent ? 'dot--active' : ''} ${isPassed ? 'dot--passed' : ''}`}
            aria-hidden="true"
          />
        );
      })}
    </div>
  );
};
