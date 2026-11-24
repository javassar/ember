// Library screen browsing content items and Rescue next steps with filters, thumbnail grid, and "Not landing" badges.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ScreenLayout,
  LivingBackground,
  Button,
  IconButton,
  IconBack,
  IconPlus,
  IconCheck,
  IconClose,
  DragDropOverlay,
  SegmentedControl,
  Chip,
  Toast,
} from '../components';
import {
  listItems,
  getPoster,
  getBlob,
  listNextSteps,
  updateNextStep,
  deleteNextStep,
  listEvents,
  updateItem,
} from '../data';
import { STRINGS } from '../strings';
import { findNotLandingItems } from '../engine';
import { formatBytes } from '../lib/storage';
import type { Item, Mode, NextStep } from '../types';
import './LibraryScreen.css';

interface ItemWithPoster {
  item: Item;
  posterUrl: string | null;
  sizeBytes?: number;
}

export const LibraryScreen: React.FC = () => {
  const navigate = useNavigate();

  // Active Tab: Items or Next Steps
  const [activeTab, setActiveTab] = useState<'items' | 'nextSteps'>('items');

  // Filter States
  const [modeFilter, setModeFilter] = useState<Mode | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'text' | 'image' | 'video'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'retired' | 'notLanding'>('all');

  // Data
  const [itemsWithPosters, setItemsWithPosters] = useState<ItemWithPoster[]>([]);
  const posterUrlsRef = useRef<string[]>([]);
  const isMountedRef = useRef(true);
  const [nextSteps, setNextSteps] = useState<NextStep[]>([]);
  const [notLandingMap, setNotLandingMap] = useState<Map<string, Mode[]>>(new Map());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Load items according to active filters
      const includeRetired = statusFilter === 'retired';
      const rawItems = await listItems({
        mode: modeFilter === 'all' ? undefined : modeFilter,
        type: typeFilter === 'all' ? undefined : typeFilter,
        includeRetired,
      });

      // 2. Load all events to compute "Not landing" habituation flags
      const allEvents = await listEvents();
      const notLanding = findNotLandingItems(rawItems, allEvents);
      setNotLandingMap(notLanding);

      // If status filter is 'notLanding', narrow down to only active items flagged as not landing
      const filtered = statusFilter === 'notLanding'
        ? rawItems.filter((i) => notLanding.has(i.id) && !i.retiredAt)
        : rawItems;

      // Sort newest first
      filtered.sort((a, b) => b.createdAt - a.createdAt);

      // Load thumbnails and sizes for media items
      const loaded: ItemWithPoster[] = await Promise.all(
        filtered.map(async (item) => {
          let posterUrl: string | null = null;
          let sizeBytes: number | undefined;
          if (item.type !== 'text') {
            const [posterRecord, blobRecord] = await Promise.all([
              getPoster(item.id),
              item.mediaId ? getBlob(item.mediaId) : Promise.resolve(undefined),
            ]);
            if (posterRecord) {
              posterUrl = URL.createObjectURL(posterRecord.blob);
            }
            if (blobRecord) {
              sizeBytes = blobRecord.size;
            }
          }
          return { item, posterUrl, sizeBytes };
        })
      );

      const newUrls = loaded
        .map((ip) => ip.posterUrl)
        .filter((u): u is string => Boolean(u));

      if (!isMountedRef.current) {
        newUrls.forEach((u) => URL.revokeObjectURL(u));
        return;
      }

      posterUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      posterUrlsRef.current = newUrls;
      setItemsWithPosters(loaded);

      // 3. Load Rescue next steps
      const steps = await listNextSteps();
      setNextSteps(steps);
    } catch (err) {
      console.error('Failed to load library:', err);
    } finally {
      setIsLoading(false);
    }
  }, [modeFilter, typeFilter, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      posterUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      posterUrlsRef.current = [];
    };
  }, []);

  const handleStepToggleDone = async (step: NextStep) => {
    const updated: NextStep = {
      ...step,
      doneAt: step.doneAt === null ? Date.now() : null,
    };
    await updateNextStep(updated);
    await loadData();
  };

  const handleStepDelete = async (stepId: string) => {
    await deleteNextStep(stepId);
    await loadData();
  };

  const handleOneTapRetire = async (item: Item) => {
    await updateItem({
      ...item,
      retiredAt: Date.now(),
    });
    setToastMessage('Item retired.');
    await loadData();
  };

  const handleFilesDropped = (_files: File[]) => {
    navigate('/library/new');
  };

  return (
    <>
      <LivingBackground mode={modeFilter === 'all' ? 'home' : modeFilter} />
      <DragDropOverlay onFilesDropped={handleFilesDropped} />

      <ScreenLayout maxWidth="lg" className="library-layout">
        {/* Top Header */}
        <header className="library-header">
          <div className="library-header-left">
            <Link to="/" tabIndex={-1}>
              <IconButton aria-label={STRINGS.common.back} variant="quiet">
                <IconBack />
              </IconButton>
            </Link>
            <h1 className="library-title">{STRINGS.library.title}</h1>
          </div>

          <Link to="/library/new">
            <Button variant="primary" size="sm">
              <IconPlus size={18} />
              <span style={{ marginLeft: 'var(--space-2)' }}>{STRINGS.library.addItem}</span>
            </Button>
          </Link>
        </header>

        {/* Tab Selector: Items vs Next Steps */}
        <div className="library-tabs-row">
          <SegmentedControl
            value={activeTab}
            options={[
              { value: 'items', label: `${STRINGS.library.itemsTab} (${itemsWithPosters.length})` },
              { value: 'nextSteps', label: `${STRINGS.library.nextStepsTab} (${nextSteps.length})` },
            ]}
            onChange={(val) => setActiveTab(val as 'items' | 'nextSteps')}
          />
        </div>

        {/* ITEMS TAB */}
        {activeTab === 'items' && (
          <main className="library-items-view" role="main">
            {/* Filters Bar */}
            <div className="filters-bar">
              {/* Mode filter chips */}
              <div className="filter-group">
                <Chip
                  label="All Spaces"
                  selected={modeFilter === 'all'}
                  onClick={() => setModeFilter('all')}
                />
                <Chip
                  label="Start"
                  selected={modeFilter === 'start'}
                  modeAccent="start"
                  onClick={() => setModeFilter('start')}
                />
                <Chip
                  label="Charge"
                  selected={modeFilter === 'charge'}
                  modeAccent="charge"
                  onClick={() => setModeFilter('charge')}
                />
                <Chip
                  label="Rescue"
                  selected={modeFilter === 'rescue'}
                  modeAccent="rescue"
                  onClick={() => setModeFilter('rescue')}
                />
              </div>

              {/* Type filter chips */}
              <div className="filter-group">
                <Chip
                  label="All Types"
                  selected={typeFilter === 'all'}
                  onClick={() => setTypeFilter('all')}
                />
                <Chip
                  label={STRINGS.library.filterText}
                  selected={typeFilter === 'text'}
                  onClick={() => setTypeFilter('text')}
                />
                <Chip
                  label={STRINGS.library.filterImages}
                  selected={typeFilter === 'image'}
                  onClick={() => setTypeFilter('image')}
                />
                <Chip
                  label={STRINGS.library.filterVideos}
                  selected={typeFilter === 'video'}
                  onClick={() => setTypeFilter('video')}
                />
              </div>

              {/* Status filter chips (Active, Retired, Not landing) */}
              <div className="filter-group">
                <Chip
                  label="All Active"
                  selected={statusFilter === 'all'}
                  onClick={() => setStatusFilter('all')}
                />
                <Chip
                  label={STRINGS.library.filterRetired}
                  selected={statusFilter === 'retired'}
                  onClick={() => setStatusFilter('retired')}
                />
                <Chip
                  label={
                    notLandingMap.size > 0
                      ? `${STRINGS.library.filterNotLanding} (${notLandingMap.size})`
                      : STRINGS.library.filterNotLanding
                  }
                  selected={statusFilter === 'notLanding'}
                  onClick={() => setStatusFilter('notLanding')}
                />
              </div>
            </div>

            {/* Items Grid */}
            {isLoading ? (
              <div className="library-loading">
                <span className="btn-spinner" aria-hidden="true" />
                <span>{STRINGS.common.loading}</span>
              </div>
            ) : itemsWithPosters.length === 0 ? (
              <div className="empty-library-card">
                <p className="empty-title">
                  {statusFilter === 'notLanding'
                    ? 'No items are currently flagged as not landing.'
                    : STRINGS.library.emptyItems}
                </p>
                <p className="empty-sub">
                  {statusFilter === 'notLanding'
                    ? 'Items appear here when shown 8+ times without being marked as helpful.'
                    : STRINGS.library.emptyItemsHelp}
                </p>
                {statusFilter !== 'notLanding' && (
                  <Link to="/library/new" style={{ marginTop: 'var(--space-4)' }}>
                    <Button variant="secondary">{STRINGS.home.addContent}</Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="items-grid">
                {itemsWithPosters.map(({ item, posterUrl, sizeBytes }) => {
                  const isNotLanding = notLandingMap.has(item.id);
                  const notLandingModes = notLandingMap.get(item.id) || [];

                  return (
                    <article
                      key={item.id}
                      className={`library-item-card library-item-card--${item.type} ${
                        item.retiredAt ? 'item-card--retired' : ''
                      }`}
                      onClick={() => navigate(`/library/${item.id}`)}
                      tabIndex={0}
                      role="button"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') navigate(`/library/${item.id}`);
                      }}
                    >
                      {/* Media Thumbnail or Text Card Header */}
                      {item.type !== 'text' && posterUrl ? (
                        <div className="item-poster-container">
                          <img
                            src={posterUrl}
                            alt={item.text || 'Item poster'}
                            className="item-poster-img"
                            loading="lazy"
                          />
                          <span className="item-type-badge">
                            {item.type === 'video' ? '🎬' : '📷'}
                          </span>
                        </div>
                      ) : (
                        <div className="text-item-preview">
                          <p className="text-body-snippet">“{item.text}”</p>
                        </div>
                      )}

                      {/* Card Footer Details */}
                      <div className="item-card-footer">
                        {item.type !== 'text' && item.text && (
                          <p className="media-caption-snippet">{item.text}</p>
                        )}

                        <div className="card-tags-row">
                          {item.isSample && (
                            <span className="sample-pill">{STRINGS.common.sampleBadge}</span>
                          )}
                          {item.retiredAt && (
                            <span className="retired-pill">{STRINGS.library.filterRetired}</span>
                          )}
                          {sizeBytes !== undefined && (
                            <span className="item-size-badge">{formatBytes(sizeBytes)}</span>
                          )}
                          {isNotLanding && !item.retiredAt && (
                            <span className="not-landing-pill">
                              {notLandingModes
                                .map((m) => STRINGS.stats.notLandingLabel(m.charAt(0).toUpperCase() + m.slice(1)))
                                .join(' • ')}
                            </span>
                          )}
                          {isNotLanding && !item.retiredAt && (
                            <button
                              type="button"
                              className="card-retire-shortcut"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOneTapRetire(item);
                              }}
                            >
                              {STRINGS.common.retire}
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </main>
        )}

        {/* NEXT STEPS TAB */}
        {activeTab === 'nextSteps' && (
          <main className="library-nextsteps-view" role="main">
            {nextSteps.length === 0 ? (
              <div className="empty-library-card">
                <p className="empty-title">{STRINGS.library.emptyNextSteps}</p>
                <p className="empty-sub">{STRINGS.library.emptyNextStepsHelp}</p>
              </div>
            ) : (
              <div className="nextsteps-list">
                {nextSteps.map((step) => {
                  const isDone = step.doneAt !== null;
                  return (
                    <div
                      key={step.id}
                      className={`nextstep-card ${isDone ? 'nextstep-card--done' : ''}`}
                    >
                      <button
                        type="button"
                        className={`step-checkbox ${isDone ? 'step-checkbox--checked' : ''}`}
                        onClick={() => handleStepToggleDone(step)}
                        aria-label={isDone ? 'Mark incomplete' : 'Mark complete'}
                      >
                        {isDone && <IconCheck size={16} />}
                      </button>

                      <div className="nextstep-content">
                        <span className="nextstep-text">{step.text}</span>
                        <span className="nextstep-date">
                          {new Date(step.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>

                      <IconButton
                        aria-label={STRINGS.common.delete}
                        variant="quiet"
                        size="sm"
                        onClick={() => handleStepDelete(step.id)}
                      >
                        <IconClose size={16} />
                      </IconButton>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        )}

        {toastMessage && (
          <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
        )}
      </ScreenLayout>
    </>
  );
};
