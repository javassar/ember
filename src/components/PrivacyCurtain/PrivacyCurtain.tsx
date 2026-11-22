// Privacy curtain providing an opaque cover on page hide to protect content from the iOS app-switcher snapshot.

import React, { useState, useEffect } from 'react';
import './PrivacyCurtain.css';

export const PrivacyCurtain: React.FC = () => {
  const [isHidden, setIsHidden] = useState<boolean>(false);

  useEffect(() => {
    const handleVisibility = () => {
      setIsHidden(document.visibilityState === 'hidden');
    };

    const handlePageHide = () => {
      setIsHidden(true);
    };

    const handlePageShow = () => {
      setIsHidden(false);
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  if (!isHidden) return null;

  return <div className="ember-privacy-curtain" aria-hidden="true" />;
};
