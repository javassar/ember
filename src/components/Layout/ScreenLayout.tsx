// Responsive screen container providing safe-area insets, max widths, and smooth transitions.

import React from 'react';
import './ScreenLayout.css';

export interface ScreenLayoutProps {
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'full';
  className?: string;
}

export const ScreenLayout: React.FC<ScreenLayoutProps> = ({
  children,
  maxWidth = 'md',
  className = '',
}) => {
  return (
    <div className={`ember-screen-layout ember-screen-layout--${maxWidth} ${className}`}>
      {children}
    </div>
  );
};
