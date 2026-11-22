// Library screen browsing content items and Rescue next steps with filters and thumbnail grid.

import React, { useState, useEffect, useCallback } from 'react';
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
} from '../components';
import {
  listItems,
  getPoster,
  listNextSteps,
  updateNextStep,
  deleteNextStep,
} from '../data';
import { STRINGS } from '../strings';
import type { Item, Mode, NextStep } from '../types';
import './LibraryScreen.css';

interface ItemWithPoster {
  item: Item;
  posterUrl: string | null;
}

export const LibraryScreen: React.FC = () => {
  const navigate = useNavigate();

  // Active Tab: Items or Next Steps
  const [activeTab, setActiveTab] = useState<'items' | 'nextSteps'>('items');

  // Filter States
  const [modeFilter, setModeFilter] = useState<Mode | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'text' | 'image' | 'video'>('all');
  const [includeRetired, setIncludeRetired] = useState<boolean>(false);

  // Data
  const [itemsWithPosters, setItemsWithPosters] = useState<ItemWithPoster[]>([]);
  const [nextSteps, setNextSteps] = useState<NextStep[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Load items
      const rawItems = await listItems({
        mode: modeFilter === 'all' ? undefined : modeFilter,
        type: typeFilter === 'all' ? undefined : typeFilter,
        includeRetired,
      });

      // Sort newest first
      rawItems.sort((a, b) => b.createdAt - a.createdAt);

      // Load thumbnails for media items
      const loaded: ItemWithPoster[] = await Promise.all(
        rawItems.map(async (item) => {
          let posterUrl: string | null = null;
          if (item.type !== 'text') {
            const posterRecord = await getPoster(item.id);
            if (posterRecord) {
              posterUrl = URL.createObjectURL(posterRecord.blob);
            }
          }
          return { item, posterUrl };
        })
      );

      setItemsWithPosters(loaded);

      // 2. Load next steps
      const steps = await listNextSteps();
      setNextSteps(steps);
    } catch (err) {
      console.error('Failed to load library:', err);
    } finally {
      setIsLoading(false);
    }
  }, [modeFilter, typeFilter, includeRetired]);

  useEffect(() => {
    loadData();
    return () => {
      // Revoke created poster object URLs on unmount or reload
      itemsWithPosters.forEach((ip) => {
        if (ip.posterUrl) URL.revokeObjectURL(ip.posterUrl);
      });
    };
  }, [loadData]);

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

              {/* Retired filter toggle */}
              <div className="filter-group">
                <Chip
                  label={includeRetired ? 'Showing Retired' : 'Active Only'}
                  selected={includeRetired}
                  onClick={() => setIncludeRetired(!includeRetired)}
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
                <p className="empty-title">{STRINGS.library.emptyItems}</p>
                <p className="empty-sub">{STRINGS.library.emptyItemsHelp}</p>
                <Link to="/library/new" style={{ marginTop: 'var(--space-4)' }}>
                  <Button variant="secondary">{STRINGS.home.addContent}</Button>
                </Link>
              </div>
            ) : (
              <div className="items-grid">
                {itemsWithPosters.map(({ item, posterUrl }) => (
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
                      </div>
                    </div>
                  </article>
                ))}
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
                        aria-label={isDone ? 'Mark as incomplete' : 'Mark as done'}
                      >
                        {isDone && <IconCheck size={16} />}
                      </button>

                      <div className="step-card-content">
                        <span className={`step-text ${isDone ? 'step-text--done' : ''}`}>
                          {step.text}
                        </span>
                        <span className="step-date">
                          {new Date(step.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <button
                        type="button"
                        className="step-delete-btn"
                        onClick={() => handleStepDelete(step.id)}
                        aria-label={STRINGS.common.delete}
                      >
                        <IconClose size={18} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        )}
      </ScreenLayout>
    </>
  );
};
