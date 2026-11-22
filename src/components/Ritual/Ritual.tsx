// Breath-paced opening ritual with glowing orb animation and cue text.
// Automatically scales based on daily session frequency and user settings.

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { RITUAL_FULL_MS, RITUAL_SHORT_MS } from '../../config';
import type { Mode } from '../../types';
import './Ritual.css';

export interface RitualProps {
  mode: Mode;
  cue: string;
  ritualEnabled: boolean;
  ritualScale: 'auto' | 'full' | 'short';
  sessionNumberToday: number;
  onComplete: () => void;
}

export type EffectiveRitualScale = 'full' | 'short' | 'none';

export function computeEffectiveRitualScale(
  mode: Mode,
  ritualEnabled: boolean,
  ritualScale: 'auto' | 'full' | 'short',
  sessionNumberToday: number
): EffectiveRitualScale {
  if (!ritualEnabled) {
    return 'none';
  }

  let scale: EffectiveRitualScale = 'full';

  if (ritualScale === 'auto') {
    if (sessionNumberToday <= 1) {
      scale = 'full';
    } else if (sessionNumberToday === 2) {
      scale = 'short';
    } else {
      return 'none';
    }
  } else if (ritualScale === 'short') {
    scale = 'short';
  } else {
    scale = 'full';
  }

  // Rescue mode is always capped at short regardless of session count
  if (mode === 'rescue' && scale === 'full') {
    scale = 'short';
  }

  return scale;
}

export const Ritual: React.FC<RitualProps> = ({
  mode,
  cue,
  ritualEnabled,
  ritualScale,
  sessionNumberToday,
  onComplete,
}) => {
  const completedRef = useRef(false);
  const [isFading, setIsFading] = useState(false);

  const effectiveScale = computeEffectiveRitualScale(
    mode,
    ritualEnabled,
    ritualScale,
    sessionNumberToday
  );

  const handleFinish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setIsFading(true);
    // Dissolve into the underlying content over 400ms
    setTimeout(() => {
      onComplete();
    }, 400);
  }, [onComplete]);

  useEffect(() => {
    if (effectiveScale === 'none') {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete();
      }
      return;
    }

    const duration = effectiveScale === 'full' ? RITUAL_FULL_MS : RITUAL_SHORT_MS;
    // Begin dissolving 400ms before total duration
    const timer = setTimeout(() => {
      handleFinish();
    }, Math.max(0, duration - 400));

    return () => clearTimeout(timer);
  }, [effectiveScale, handleFinish, onComplete]);

  if (effectiveScale === 'none') {
    return null;
  }

  return (
    <div
      className={`ritual-overlay ritual-overlay--${effectiveScale} ${
        isFading ? 'ritual-overlay--fading' : ''
      }`}
      onClick={handleFinish}
      role="button"
      tabIndex={0}
      aria-label="Tap to skip ritual"
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') {
          handleFinish();
        }
      }}
    >
      <div className="ritual-orb-container">
        <div className={`ritual-orb ritual-orb--${mode}`} />
        {effectiveScale === 'full' && (
          <p className="ritual-cue-text">“{cue}”</p>
        )}
      </div>
      <span className="ritual-skip-hint">Tap to skip</span>
    </div>
  );
};
