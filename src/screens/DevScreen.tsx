// Hidden developer diagnostics screen for inspecting storage counts and seeding sample items.

import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { STRINGS } from '../strings';
import {
  countItems,
  countBlobs,
  countPosters,
  countEvents,
  countNextSteps,
  getSettings,
  getEngineState,
  saveEngineState,
  listItems,
  recordEvent,
  seedSampleContent,
  deleteSampleContent,
  clearAllData,
} from '../data';
import {
  getStorageEstimate,
  checkPersistentStorage,
  requestPersistentStorage,
  type StorageEstimateInfo,
} from '../lib/storage';
import './DevScreen.css';

interface StoreCounts {
  items: number;
  sampleItems: number;
  blobs: number;
  posters: number;
  events: number;
  nextSteps: number;
  pinConfigured: boolean;
  startBagCount: number;
  chargeBagCount: number;
  rescueBagCount: number;
  startSessionCount: number;
  chargeSessionCount: number;
  rescueSessionCount: number;
  totalSessionCount: number;
}

export const DevScreen: React.FC = () => {
  const [counts, setCounts] = useState<StoreCounts | null>(null);
  const [storage, setStorage] = useState<StorageEstimateInfo | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<boolean>(false);

  const loadDiagnostics = useCallback(async () => {
    try {
      const [
        items,
        blobs,
        posters,
        events,
        nextSteps,
        settings,
        engineState,
        storageInfo,
        isPersisted,
        allItems,
      ] = await Promise.all([
        countItems(),
        countBlobs(),
        countPosters(),
        countEvents(),
        countNextSteps(),
        getSettings(),
        getEngineState(),
        getStorageEstimate(),
        checkPersistentStorage(),
        listItems({ includeRetired: true }),
      ]);

      const sampleCount = allItems.filter((i) => i.isSample).length;

      setCounts({
        items,
        sampleItems: sampleCount,
        blobs,
        posters,
        events,
        nextSteps,
        pinConfigured: settings.pin !== null,
        startBagCount: engineState.bags.start?.length ?? 0,
        chargeBagCount: engineState.bags.charge?.length ?? 0,
        rescueBagCount: engineState.bags.rescue?.length ?? 0,
        startSessionCount: engineState.sessionCounts?.modeCountsToday?.start ?? 0,
        chargeSessionCount: engineState.sessionCounts?.modeCountsToday?.charge ?? 0,
        rescueSessionCount: engineState.sessionCounts?.modeCountsToday?.rescue ?? 0,
        totalSessionCount: engineState.sessionCounts?.countToday ?? 0,
      });

      setStorage(storageInfo);
      setPersisted(isPersisted);
    } catch (err) {
      console.error('Failed to load dev diagnostics:', err);
      setStatusMessage('Error loading diagnostics.');
    }
  }, []);

  useEffect(() => {
    loadDiagnostics();
  }, [loadDiagnostics]);

  const handleSeed = async () => {
    setBusy(true);
    try {
      const count = await seedSampleContent();
      if (count > 0) {
        setStatusMessage(`Seeded ${count} sample items successfully.`);
      } else {
        setStatusMessage('Sample content is already loaded.');
      }
      await loadDiagnostics();
    } catch (err) {
      console.error('Seed failed:', err);
      setStatusMessage('Failed to seed sample content.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteSample = async () => {
    setBusy(true);
    try {
      const deleted = await deleteSampleContent();
      setStatusMessage(`Deleted ${deleted} sample items.`);
      await loadDiagnostics();
    } catch (err) {
      console.error('Delete sample failed:', err);
      setStatusMessage('Failed to delete sample content.');
    } finally {
      setBusy(false);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm(STRINGS.dev.confirmClear)) {
      return;
    }
    setBusy(true);
    try {
      await clearAllData();
      setStatusMessage(STRINGS.dev.clearSuccess);
      await loadDiagnostics();
    } catch (err) {
      console.error('Clear failed:', err);
      setStatusMessage('Failed to clear data.');
    } finally {
      setBusy(false);
    }
  };

  const handleRequestPersistence = async () => {
    const granted = await requestPersistentStorage();
    setPersisted(granted);
    setStatusMessage(
      granted
        ? 'Persistent storage granted!'
        : 'Browser declined or already manages persistent storage.'
    );
  };

  const handleResetSessionCounts = async () => {
    setBusy(true);
    try {
      await saveEngineState({
        sessionCounts: {
          lastSessionDate: '',
          countToday: 0,
          modeCountsToday: { start: 0, charge: 0, rescue: 0 },
        },
      });
      setStatusMessage('Daily session counts reset to 0. Next session in each space will play the full ritual.');
      await loadDiagnostics();
    } catch (err) {
      console.error('Reset session counts failed:', err);
      setStatusMessage('Failed to reset session counts.');
    } finally {
      setBusy(false);
    }
  };

  const handleSimulateNotLanding = async () => {
    setBusy(true);
    try {
      const items = await listItems({ mode: 'rescue', includeRetired: false });
      if (items.length === 0) {
        setStatusMessage('No active Rescue items found. Please seed sample content or add items first.');
        return;
      }
      const targetItem = items[0];
      const now = Date.now();
      for (let i = 0; i < 8; i++) {
        await recordEvent({
          id: crypto.randomUUID(),
          sessionId: crypto.randomUUID(),
          itemId: targetItem.id,
          mode: 'rescue',
          shownAt: now - (8 - i) * 60000,
          dwellMs: 4000,
          helped: false,
        });
      }
      const label = targetItem.text ? `"${targetItem.text.slice(0, 30)}..."` : targetItem.id.slice(0, 8);
      setStatusMessage(
        `Simulated 8 unhelpful shows in Rescue for item ${label}. Visit Library to see the "Not landing in Rescue" badge!`
      );
      await loadDiagnostics();
    } catch (err) {
      console.error('Simulate not landing failed:', err);
      setStatusMessage('Failed to simulate not landing events.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="dev-screen" role="main">
      <header className="dev-header">
        <Link to="/" className="back-link">
          ← {STRINGS.nav.home}
        </Link>
        <h1 className="dev-title">{STRINGS.dev.title}</h1>
        <p className="dev-desc">{STRINGS.dev.description}</p>
      </header>

      {statusMessage && (
        <div className="status-banner" role="status">
          <span>{statusMessage}</span>
          <button
            type="button"
            className="dismiss-btn"
            onClick={() => setStatusMessage(null)}
            aria-label="Dismiss message"
          >
            ×
          </button>
        </div>
      )}

      {/* Storage Estimate Section */}
      <section className="dev-section" aria-labelledby="storage-heading">
        <h2 id="storage-heading" className="section-title">
          {STRINGS.dev.storageHeader}
        </h2>
        <div className="metrics-grid">
          <div className="metric-card">
            <span className="metric-label">{STRINGS.dev.usedQuota}</span>
            <span className="metric-value">{storage?.formattedUsed ?? '—'}</span>
            <span className="metric-sub">{storage ? `${storage.percentage.toFixed(2)}% of quota` : ''}</span>
          </div>

          <div className="metric-card">
            <span className="metric-label">{STRINGS.dev.quotaLimit}</span>
            <span className="metric-value">{storage?.formattedQuota ?? '—'}</span>
          </div>

          <div className="metric-card">
            <span className="metric-label">{STRINGS.dev.persistence}</span>
            <span className="metric-value">
              {persisted === true ? 'Granted' : persisted === false ? 'Default' : 'Checking...'}
            </span>
            {persisted === false && (
              <button
                type="button"
                className="action-link"
                onClick={handleRequestPersistence}
              >
                Request Persistence
              </button>
            )}
          </div>
        </div>
      </section>

      {/* IndexedDB Store Counts */}
      <section className="dev-section" aria-labelledby="stores-heading">
        <h2 id="stores-heading" className="section-title">
          {STRINGS.dev.storesHeader}
        </h2>
        <div className="counts-list">
          <div className="count-row">
            <span className="count-name">Items (`items`)</span>
            <span className="count-num">
              {counts?.items ?? '—'}
              {counts && counts.sampleItems > 0 && (
                <span className="sample-tag"> ({counts.sampleItems} sample)</span>
              )}
            </span>
          </div>

          <div className="count-row">
            <span className="count-name">Media Blobs (`blobs`)</span>
            <span className="count-num">{counts?.blobs ?? '—'}</span>
          </div>

          <div className="count-row">
            <span className="count-name">Posters (`posters`)</span>
            <span className="count-num">{counts?.posters ?? '—'}</span>
          </div>

          <div className="count-row">
            <span className="count-name">Show Events (`events`)</span>
            <span className="count-num">{counts?.events ?? '—'}</span>
          </div>

          <div className="count-row">
            <span className="count-name">Rescue Next Steps (`nextSteps`)</span>
            <span className="count-num">{counts?.nextSteps ?? '—'}</span>
          </div>

          <div className="count-row">
            <span className="count-name">PIN Protection</span>
            <span className="count-num">
              {counts?.pinConfigured ? 'Enabled' : 'None'}
            </span>
          </div>

          <div className="count-row">
            <span className="count-name">Shuffle Bags Remaining</span>
            <span className="count-num">
              Start: {counts?.startBagCount ?? 0} | Charge: {counts?.chargeBagCount ?? 0} | Rescue: {counts?.rescueBagCount ?? 0}
            </span>
          </div>

          <div className="count-row">
            <span className="count-name">Today's Sessions (Auto-Scaling)</span>
            <span className="count-num">
              Start: {counts?.startSessionCount ?? 0} | Charge: {counts?.chargeSessionCount ?? 0} | Rescue: {counts?.rescueSessionCount ?? 0} (Total: {counts?.totalSessionCount ?? 0})
            </span>
          </div>
        </div>
      </section>

      {/* Action Controls */}
      <section className="dev-section" aria-labelledby="actions-heading">
        <h2 id="actions-heading" className="section-title">
          {STRINGS.dev.actionsHeader}
        </h2>
        <div className="actions-stack">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleResetSessionCounts}
            disabled={busy}
          >
            Reset Daily Session Counts (Test Ritual Again)
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleSimulateNotLanding}
            disabled={busy || !counts || counts.items === 0}
          >
            Simulate 8 Unhelpful Shows (Not Landing Test)
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSeed}
            disabled={busy}
          >
            {STRINGS.dev.seedButton}
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleDeleteSample}
            disabled={busy || !counts || counts.sampleItems === 0}
          >
            {STRINGS.dev.deleteSampleButton}
          </button>

          <button
            type="button"
            className="btn btn-danger"
            onClick={handleClearAll}
            disabled={busy}
          >
            {STRINGS.dev.clearAllButton}
          </button>

          <button
            type="button"
            className="btn btn-quiet"
            onClick={loadDiagnostics}
            disabled={busy}
          >
            {STRINGS.dev.refreshCounts}
          </button>
        </div>
      </section>
    </main>
  );
};
