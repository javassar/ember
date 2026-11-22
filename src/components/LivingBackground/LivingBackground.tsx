// Living background with slow-drifting blurred radial orbs, time-of-day tints, and accent cross-fading.

import React, { useEffect, useState } from 'react';
import type { Mode } from '../../types';
import './LivingBackground.css';

export interface LivingBackgroundProps {
  mode?: Mode | 'home';
  className?: string;
}

function getTimeOfDayClass(): 'tint-morning' | 'tint-day' | 'tint-evening' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'tint-morning'; // 5:00 AM - 11:59 AM: warmer morning tint
  if (hour >= 12 && hour < 18) return 'tint-day';    // 12:00 PM - 5:59 PM: balanced daylight tint
  return 'tint-evening';                            // 6:00 PM - 4:59 AM: cooler evening tint
}

export const LivingBackground: React.FC<LivingBackgroundProps> = ({
  mode = 'home',
  className = '',
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const [timeTint, setTimeTint] = useState<'tint-morning' | 'tint-day' | 'tint-evening'>(getTimeOfDayClass);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPaused(document.visibilityState === 'hidden');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Check time-of-day periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeTint(getTimeOfDayClass());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={`ember-living-background mode-${mode} ${timeTint} ${isPaused ? 'bg--paused' : ''} ${className}`}
      aria-hidden="true"
    >
      <div className="gradient-orb orb-1" />
      <div className="gradient-orb orb-2" />
      <div className="gradient-orb orb-3" />
      <div className="gradient-orb orb-base" />
      <div className="background-noise" />
    </div>
  );
};
