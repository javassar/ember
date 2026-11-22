// Living background with slow-drifting blurred radial orbs and smooth mode accent cross-fading.

import React, { useEffect, useState } from 'react';
import type { Mode } from '../../types';
import './LivingBackground.css';

export interface LivingBackgroundProps {
  mode?: Mode | 'home';
  className?: string;
}

export const LivingBackground: React.FC<LivingBackgroundProps> = ({
  mode = 'home',
  className = '',
}) => {
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPaused(document.visibilityState === 'hidden');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return (
    <div
      className={`ember-living-background mode-${mode} ${isPaused ? 'bg--paused' : ''} ${className}`}
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
