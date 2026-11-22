// Session screen delivering breath-paced rituals, finite feed items, media playback, and end flows.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Ritual,
  computeEffectiveRitualScale,
  IconButton,
  IconClose,
  IconBack,
  IconForward,
  IconHelped,
  IconVolumeOn,
  IconVolumeOff,
  ProgressDots,
  Button,
} from '../components';
import {
  initializeSession,
  drawExtraItem,
  recordItemShown,
  finalizeItemDwell,
  type LoadedSession,
} from '../engine';
import { getBlob, createNextStep } from '../data';
import { EXTRA_ITEMS_MAX } from '../config';
import { STRINGS } from '../strings';
import type { Mode, Item, ShowEvent } from '../types';
import './SessionScreen.css';

export const SessionScreen: React.FC = () => {
  const { mode: modeParam } = useParams<{ mode: string }>();
  const navigate = useNavigate();

  const mode: Mode =
    modeParam === 'charge' || modeParam === 'rescue' ? modeParam : 'start';

  // Loaded session data
  const [sessionData, setSessionData] = useState<LoadedSession | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRitualActive, setIsRitualActive] = useState(true);
  const [extrasDrawnCount, setExtrasDrawnCount] = useState(0);
  const [hasExhaustedPool, setHasExhaustedPool] = useState(false);

  // Chrome visibility (auto-hides after 2s of inactivity)
  const [isChromeVisible, setIsChromeVisible] = useState(true);
  const hideChromeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Media URLs and preloaded assets
  const [mediaUrls, setMediaUrls] = useState<Map<string, string>>(new Map());
  const [videoError, setVideoError] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showSoundHint, setShowSoundHint] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Dwell tracking and "helped" flag for the current item
  const currentEventRef = useRef<ShowEvent | null>(null);
  const itemShownAtRef = useRef<number>(0);
  const [currentHelped, setCurrentHelped] = useState(false);
  const [helpedToast, setHelpedToast] = useState<string | null>(null);
  const helpedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Touch gesture tracking for swipes
  const touchStartXRef = useRef<number | null>(null);

  // Rescue next-step input
  const [rescueInput, setRescueInput] = useState('');
  const [isSavingRescue, setIsSavingRescue] = useState(false);

  // 1. Reset chrome inactivity timer
  const touchActivity = useCallback(() => {
    setIsChromeVisible(true);
    if (hideChromeTimerRef.current) {
      clearTimeout(hideChromeTimerRef.current);
    }
    hideChromeTimerRef.current = setTimeout(() => {
      setIsChromeVisible(false);
    }, 2000);
  }, []);

  // 2. Load session on mount (guarded against React StrictMode double invocation)
  const sessionPromiseRef = useRef<Promise<LoadedSession> | null>(null);

  useEffect(() => {
    let isCancelled = false;

    if (!sessionPromiseRef.current) {
      sessionPromiseRef.current = initializeSession(mode);
    }

    sessionPromiseRef.current
      .then((loaded) => {
        if (!isCancelled) {
          setSessionData(loaded);
          setItems(loaded.items);
          setIsMuted(!loaded.settings.soundOnByDefault);
          const effective = computeEffectiveRitualScale(
            mode,
            loaded.settings.ritualEnabled,
            loaded.settings.ritualScale,
            loaded.sessionNumberToday
          );
          if (effective === 'none') {
            setIsRitualActive(false);
          }
        }
      })
      .catch((err) => {
        console.error('Failed to initialize session:', err);
      });

    return () => {
      isCancelled = true;
      if (hideChromeTimerRef.current) {
        clearTimeout(hideChromeTimerRef.current);
      }
    };
  }, [mode]);

  // 3. Preload media for current and next item
  useEffect(() => {
    if (items.length === 0 || currentIndex >= items.length) {
      return;
    }

    const itemsToPreload = [items[currentIndex]];
    if (currentIndex + 1 < items.length) {
      itemsToPreload.push(items[currentIndex + 1]);
    }

    itemsToPreload.forEach(async (item) => {
      if (item.type !== 'text' && item.mediaId && !mediaUrls.has(item.mediaId)) {
        try {
          const record = await getBlob(item.mediaId);
          if (record?.blob) {
            const url = URL.createObjectURL(record.blob);
            setMediaUrls((prev) => new Map(prev).set(item.mediaId!, url));
          }
        } catch (err) {
          console.error('Failed to load media blob:', err);
        }
      }
    });
  }, [items, currentIndex, mediaUrls]);

  // Clean up object URLs and timers on unmount
  useEffect(() => {
    const urlsToRevoke = mediaUrls;
    return () => {
      urlsToRevoke.forEach((url) => URL.revokeObjectURL(url));
      if (helpedTimeoutRef.current) {
        clearTimeout(helpedTimeoutRef.current);
      }
    };
  }, [mediaUrls]);

  // 4. Log ShowEvent and start dwell timer on item change
  const finalizeCurrentItemEvent = useCallback(async () => {
    if (currentEventRef.current && itemShownAtRef.current > 0) {
      const dwellMs = Date.now() - itemShownAtRef.current;
      await finalizeItemDwell(
        currentEventRef.current.id,
        dwellMs,
        currentEventRef.current.helped
      );
      currentEventRef.current = null;
      itemShownAtRef.current = 0;
    }
  }, []);

  useEffect(() => {
    if (isRitualActive || items.length === 0 || !sessionData) {
      return;
    }

    if (currentIndex < items.length) {
      const item = items[currentIndex];
      setVideoError(false);
      setVideoProgress(0);
      setCurrentHelped(false);
      itemShownAtRef.current = Date.now();

      recordItemShown(item.id, mode, sessionData.sessionId).then((ev) => {
        currentEventRef.current = ev;
      });
    }

    return () => {
      finalizeCurrentItemEvent();
    };
  }, [currentIndex, isRitualActive, items, mode, sessionData, finalizeCurrentItemEvent]);

  // 5. Navigation handlers
  const handleNext = useCallback(async () => {
    touchActivity();
    if (currentIndex <= items.length) {
      await finalizeCurrentItemEvent();
      setCurrentIndex((prev) => Math.min(prev + 1, items.length));
    }
  }, [currentIndex, items.length, touchActivity, finalizeCurrentItemEvent]);

  const handleBack = useCallback(async () => {
    touchActivity();
    if (currentIndex > 0) {
      await finalizeCurrentItemEvent();
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex, touchActivity, finalizeCurrentItemEvent]);

  // Toggle "This helped"
  const handleToggleHelped = async () => {
    touchActivity();
    const nextState = !currentHelped;
    setCurrentHelped(nextState);
    if (currentEventRef.current) {
      currentEventRef.current.helped = nextState;
      const dwell = Date.now() - itemShownAtRef.current;
      await finalizeItemDwell(currentEventRef.current.id, dwell, nextState);
    }
    if (helpedTimeoutRef.current) {
      clearTimeout(helpedTimeoutRef.current);
    }
    setHelpedToast(
      nextState ? STRINGS.session.helpedMarked : STRINGS.session.helpedUnmarked
    );
    helpedTimeoutRef.current = setTimeout(() => {
      setHelpedToast(null);
    }, 1800);
  };

  // "Show me more" handler
  const handleShowMore = async () => {
    if (extrasDrawnCount >= EXTRA_ITEMS_MAX || hasExhaustedPool) {
      return;
    }

    try {
      const currentIds = items.map((i) => i.id);
      const extraItem = await drawExtraItem(mode, currentIds);
      if (extraItem) {
        setItems((prev) => [...prev, extraItem]);
        setExtrasDrawnCount((prev) => prev + 1);
        setCurrentIndex(items.length); // Immediately show the new extra item
      } else {
        setHasExhaustedPool(true);
      }
    } catch (err) {
      console.error('Failed to draw extra item:', err);
    }
  };

  // Rescue next-step save
  const handleSaveRescueStep = async () => {
    if (!rescueInput.trim()) {
      navigate('/');
      return;
    }

    setIsSavingRescue(true);
    try {
      await createNextStep({
        id: crypto.randomUUID(),
        text: rescueInput.trim(),
        createdAt: Date.now(),
        doneAt: null,
      });
      navigate('/');
    } catch (err) {
      console.error('Failed to save rescue next step:', err);
      setIsSavingRescue(false);
    }
  };

  // Skip straight to Rescue next-step
  const handleSkipToNextStep = async () => {
    await finalizeCurrentItemEvent();
    setCurrentIndex(items.length);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      touchActivity();
      if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handleBack();
      } else if (e.key === 'Escape') {
        navigate('/');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handleBack, navigate, touchActivity]);

  // Touch swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    touchActivity();
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchActivity();
    if (touchStartXRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    touchStartXRef.current = null;

    if (deltaX < -50) {
      handleNext();
    } else if (deltaX > 50) {
      handleBack();
    }
  };

  // Video playback & sound toggle
  const toggleSound = () => {
    touchActivity();
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    setShowSoundHint(false);
    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
    }
  };

  const handleVideoClick = () => {
    touchActivity();
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  };

  // 1. While initial session data is loading from storage
  if (!sessionData) {
    return (
      <div
        className="session-container"
        style={{ backgroundColor: 'var(--color-bg-base)' }}
      />
    );
  }

  // 2. Handle empty state: mode has no eligible items
  if (items.length === 0) {
    return (
      <div className="session-container" onClick={touchActivity}>
        <div className="session-chrome session-chrome--visible">
          <div className="session-chrome-top">
            <Link to="/">
              <IconButton aria-label={STRINGS.common.close} variant="quiet">
                <IconClose />
              </IconButton>
            </Link>
          </div>
        </div>

        <main className="session-stage">
          <div className="session-empty-card">
            <h2 className="session-empty-title">{STRINGS.session.emptyModeTitle}</h2>
            <p className="session-empty-subtitle">{STRINGS.session.emptyModeSubtitle}</p>
            <Link to="/library/new">
              <Button variant="primary" size="md">
                {STRINGS.library.addItem}
              </Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const isEndScreen = currentIndex >= items.length;
  const currentItem = items[currentIndex];

  // Helper to determine text size class by length
  const getTextSizeClass = (length: number) => {
    if (length <= 60) return 'session-text--large';
    if (length <= 160) return 'session-text--medium';
    if (length <= 400) return 'session-text--regular';
    return 'session-text--small';
  };

  const currentMediaUrl = currentItem?.mediaId
    ? mediaUrls.get(currentItem.mediaId)
    : undefined;

  return (
    <div
      className="session-container"
      onMouseMove={touchActivity}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Breath-paced Opening Ritual Overlay (dissolves gently into the first item) */}
      {isRitualActive && (
        <Ritual
          mode={mode}
          cue={sessionData.modeConfig.cue}
          ritualEnabled={sessionData.settings.ritualEnabled}
          ritualScale={sessionData.settings.ritualScale}
          sessionNumberToday={sessionData.sessionNumberToday}
          onComplete={() => setIsRitualActive(false)}
        />
      )}

      {/* Floating UI Chrome */}
      <div
        className={`session-chrome ${
          isChromeVisible ? 'session-chrome--visible' : 'session-chrome--hidden'
        }`}
      >
        <div className="session-chrome-top">
          <div className="session-chrome-top-left">
            <Link to="/" tabIndex={-1}>
              <IconButton aria-label={STRINGS.common.close} variant="quiet">
                <IconClose />
              </IconButton>
            </Link>
          </div>

          <div className="session-chrome-top-center">
            {!isEndScreen && (
              <ProgressDots
                total={items.length}
                current={currentIndex}
                modeAccent={mode}
              />
            )}
          </div>

          <div className="session-chrome-top-right">
            {mode === 'rescue' && !isEndScreen && (
              <button
                type="button"
                className="session-skip-next-link"
                onClick={handleSkipToNextStep}
              >
                {STRINGS.session.skipToNextStep}
              </button>
            )}

            {!isEndScreen && currentItem?.type === 'video' && (
              <IconButton
                aria-label={STRINGS.accessibility.toggleSound}
                variant="quiet"
                onClick={toggleSound}
              >
                {isMuted ? <IconVolumeOff /> : <IconVolumeOn />}
              </IconButton>
            )}
          </div>
        </div>

        {!isEndScreen && (
          <div className="session-chrome-bottom">
            <button
              type="button"
              className="session-nav-btn"
              disabled={currentIndex === 0}
              onClick={handleBack}
              aria-label={STRINGS.common.back}
            >
              <IconBack size={20} />
            </button>

            <IconButton
              aria-label={STRINGS.accessibility.markHelped}
              title={
                currentHelped
                  ? STRINGS.session.helpedUnmarked
                  : STRINGS.session.thisHelped
              }
              variant="quiet"
              active={currentHelped}
              onClick={handleToggleHelped}
            >
              <IconHelped size={24} active={currentHelped} />
            </IconButton>

            <button
              type="button"
              className="session-nav-btn"
              onClick={handleNext}
              aria-label={STRINGS.common.next}
            >
              <IconForward size={20} />
            </button>
          </div>
        )}

        {helpedToast && (
          <div className="session-helped-toast" role="status" aria-live="polite">
            <IconHelped size={14} active={true} />
            <span>{helpedToast}</span>
          </div>
        )}
      </div>

      {/* Tap layers for left 1/3 and right 2/3 navigation */}
      {!isEndScreen && (
        <div className="session-tap-layer" aria-hidden="true">
          <div className="session-tap-zone--left" onClick={handleBack} />
          <div className="session-tap-zone--right" onClick={handleNext} />
        </div>
      )}

      {/* Main Content Presentation */}
      <main className="session-stage" role="main">
        {isEndScreen ? (
          // End Screens
          mode === 'rescue' ? (
            // Rescue 2-minute Next-Step Prompt
            <div className="session-rescue-card">
              <h2 className="session-rescue-title">
                {STRINGS.session.rescuePromptTitle}
              </h2>
              <input
                type="text"
                className="session-rescue-input"
                placeholder={STRINGS.session.rescuePromptPlaceholder}
                value={rescueInput}
                onChange={(e) => setRescueInput(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveRescueStep();
                }}
              />
              <div className="session-rescue-actions">
                <Button
                  variant="primary"
                  fullWidth
                  onClick={handleSaveRescueStep}
                  disabled={isSavingRescue}
                >
                  {STRINGS.session.rescueSaveBtn}
                </Button>
                <button
                  type="button"
                  className="session-rescue-skip-btn"
                  onClick={() => navigate('/')}
                >
                  {STRINGS.common.skip}
                </button>
              </div>
            </div>
          ) : (
            // Standard End Screen (Start & Charge)
            <div className="session-end-card">
              <h2 className="session-end-title">{STRINGS.session.endTitle}</h2>
              <p className="session-end-subtitle">{STRINGS.session.endSubtitle}</p>
              <div className="session-end-actions">
                <Button variant="primary" fullWidth onClick={() => navigate('/')}>
                  {STRINGS.session.doneBtn}
                </Button>
                <Button
                  variant="secondary"
                  fullWidth
                  disabled={
                    extrasDrawnCount >= EXTRA_ITEMS_MAX || hasExhaustedPool
                  }
                  onClick={handleShowMore}
                >
                  {extrasDrawnCount >= EXTRA_ITEMS_MAX || hasExhaustedPool
                    ? STRINGS.session.showMoreExhausted
                    : STRINGS.session.showMoreRemaining(
                        EXTRA_ITEMS_MAX - extrasDrawnCount
                      )}
                </Button>
              </div>
            </div>
          )
        ) : currentItem?.type === 'text' ? (
          // Text Content Item
          <div className="session-text-content">
            <p className={getTextSizeClass((currentItem.text || '').length)}>
              {currentItem.text}
            </p>
          </div>
        ) : currentItem?.type === 'image' ? (
          // Image Item with blurred background
          <div className="session-image-wrapper">
            {currentMediaUrl && (
              <div
                className="session-backdrop-blur"
                style={{ backgroundImage: `url(${currentMediaUrl})` }}
                aria-hidden="true"
              />
            )}
            {currentMediaUrl ? (
              <img
                src={currentMediaUrl}
                alt={currentItem.text || 'Session image'}
                className="session-image-element"
              />
            ) : (
              <div className="session-media-error">
                <span>{STRINGS.common.loading}</span>
              </div>
            )}
            {currentItem.text && (
              <p className="session-caption">{currentItem.text}</p>
            )}
          </div>
        ) : (
          // Video Item
          <div className="session-video-wrapper">
            {videoError ? (
              <div className="session-media-error">
                <p>{STRINGS.session.videoUnsupported}</p>
              </div>
            ) : currentMediaUrl ? (
              <>
                <video
                  ref={videoRef}
                  src={currentMediaUrl}
                  className="session-video-element"
                  playsInline
                  autoPlay
                  muted={isMuted}
                  loop={false}
                  onClick={handleVideoClick}
                  onTimeUpdate={(e) => {
                    const v = e.currentTarget;
                    if (v.duration > 0) {
                      setVideoProgress((v.currentTime / v.duration) * 100);
                    }
                  }}
                  onError={() => setVideoError(true)}
                />
                <div
                  className="session-video-progress"
                  style={{ width: `${videoProgress}%` }}
                />
                {showSoundHint && (
                  <div className="session-sound-hint">
                    {STRINGS.session.tapForSound}
                  </div>
                )}
              </>
            ) : (
              <div className="session-media-error">
                <span>{STRINGS.common.loading}</span>
              </div>
            )}
            {currentItem?.text && (
              <p className="session-caption">{currentItem.text}</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
