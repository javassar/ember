// Mode settings screen allowing customization of Space names, cues, rotating counts, core ordering, and defaults.

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ScreenLayout,
  LivingBackground,
  Button,
  IconButton,
  IconBack,
  IconArrowUp,
  IconArrowDown,
  SegmentedControl,
  Toast,
} from '../components';
import { getSettings, saveSettings, listItems } from '../data';
import { DEFAULT_MODE_CONFIGS, CORE_WARN_COUNT } from '../config';
import { STRINGS } from '../strings';
import { filterEligibleItems, orderCoreItems } from '../engine';
import type { Mode, ModeConfig, Item } from '../types';
import './ModeSettingsScreen.css';

export const ModeSettingsScreen: React.FC = () => {
  const { mode: modeParam } = useParams<{ mode: string }>();
  const navigate = useNavigate();

  const mode: Mode =
    modeParam === 'charge' || modeParam === 'rescue' ? modeParam : 'start';

  const [config, setConfig] = useState<ModeConfig>(DEFAULT_MODE_CONFIGS[mode]);
  const [coreItems, setCoreItems] = useState<Item[]>([]);
  const [rotatingCountValue, setRotatingCountValue] = useState(config.rotatingCount);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load mode configuration and items
  const loadData = useCallback(async () => {
    try {
      const [settings, allItems] = await Promise.all([getSettings(), listItems()]);
      const currentConfig = settings?.modes?.[mode] || DEFAULT_MODE_CONFIGS[mode];
      setConfig(currentConfig);
      setRotatingCountValue(currentConfig.rotatingCount);

      const { core } = filterEligibleItems(allItems, mode);
      const ordered = orderCoreItems(core, currentConfig.coreOrder, currentConfig.coreOrderIds);
      setCoreItems(ordered);
    } catch (err) {
      console.error('Failed to load mode configuration:', err);
    }
  }, [mode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle reordering of core items in fixed mode
  const handleMoveCoreItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= coreItems.length) {
      return;
    }

    const reordered = [...coreItems];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    setCoreItems(reordered);
    const newOrderIds = reordered.map((i) => i.id);
    setConfig((prev) => ({
      ...prev,
      coreOrderIds: newOrderIds,
    }));
  };

  // Reset current mode to system defaults
  const handleResetDefaults = () => {
    const defaultConfig = DEFAULT_MODE_CONFIGS[mode];
    setConfig(defaultConfig);
    setRotatingCountValue(defaultConfig.rotatingCount);
    setToastMessage(STRINGS.modes.resetSuccess);
  };

  // Save changes to database
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const settings = await getSettings();
      const updatedModes = {
        ...settings.modes,
        [mode]: {
          ...config,
          rotatingCount: rotatingCountValue,
          coreOrderIds: coreItems.map((i) => i.id),
        },
      };

      await saveSettings({ modes: updatedModes });
      setToastMessage('Space settings saved.');
      setTimeout(() => navigate(-1), 600);
    } catch (err) {
      console.error('Failed to save mode settings:', err);
      setIsSaving(false);
    }
  };

  return (
    <>
      <LivingBackground mode={mode} />

      <ScreenLayout maxWidth="md" className="mode-settings-layout">
        <header className="mode-settings-header">
          <Link to="/" tabIndex={-1}>
            <IconButton aria-label={STRINGS.common.back} variant="quiet">
              <IconBack />
            </IconButton>
          </Link>
          <h1 className="mode-settings-title">{STRINGS.modes.settingsTitle(config.label)}</h1>
          <div style={{ width: 44 }} />
        </header>

        <main className="mode-settings-body" role="main">
          {/* Identity: Name, Description, Cue */}
          <section className="mode-card" aria-labelledby="identity-heading">
            <h2 id="identity-heading" className="mode-card-title">Space Details</h2>

            <div className="mode-field-group">
              <label htmlFor="mode-label" className="mode-field-label">
                {STRINGS.modes.labelField}
              </label>
              <input
                id="mode-label"
                type="text"
                className="mode-input-text"
                value={config.label}
                onChange={(e) => setConfig((prev) => ({ ...prev, label: e.target.value }))}
              />
            </div>

            <div className="mode-field-group">
              <label htmlFor="mode-desc" className="mode-field-label">
                {STRINGS.modes.descField}
              </label>
              <input
                id="mode-desc"
                type="text"
                className="mode-input-text"
                value={config.description}
                onChange={(e) => setConfig((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="mode-field-group">
              <label htmlFor="mode-cue" className="mode-field-label">
                {STRINGS.modes.cueField}
              </label>
              <input
                id="mode-cue"
                type="text"
                className="mode-input-text"
                value={config.cue}
                onChange={(e) => setConfig((prev) => ({ ...prev, cue: e.target.value }))}
              />
            </div>
          </section>

          {/* Rotating Pool Settings */}
          <section className="mode-card" aria-labelledby="rotating-heading">
            <h2 id="rotating-heading" className="mode-card-title">Rotating Items</h2>

            <div className="mode-field-group">
              <label className="mode-field-label">{STRINGS.modes.rotatingCountTitle}</label>
              <div className="mode-counter-row">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={rotatingCountValue <= 1}
                  onClick={() => setRotatingCountValue((v) => Math.max(1, v - 1))}
                >
                  -
                </Button>
                <span className="mode-counter-val">{rotatingCountValue}</span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={rotatingCountValue >= 10}
                  onClick={() => setRotatingCountValue((v) => Math.min(10, v + 1))}
                >
                  +
                </Button>
              </div>
            </div>

            <div className="mode-field-group">
              <label className="mode-field-label">{STRINGS.modes.refreshTitle}</label>
              <SegmentedControl
                value={config.rotatingRefresh}
                options={[
                  { value: 'daily', label: 'Daily' },
                  { value: 'each-session', label: 'Each Session' },
                ]}
                onChange={(val) =>
                  setConfig((prev) => ({
                    ...prev,
                    rotatingRefresh: val as 'daily' | 'each-session',
                  }))
                }
              />
            </div>
          </section>

          {/* Core Items Settings */}
          <section className="mode-card" aria-labelledby="core-heading">
            <h2 id="core-heading" className="mode-card-title">Core Items</h2>

            {coreItems.length > CORE_WARN_COUNT && (
              <div className="core-warning-box">
                {STRINGS.modes.coreWarning}
              </div>
            )}

            <div className="mode-field-group">
              <label className="mode-field-label">{STRINGS.modes.coreOrderTitle}</label>
              <SegmentedControl
                value={config.coreOrder}
                options={[
                  { value: 'fixed', label: 'Fixed' },
                  { value: 'shuffle', label: 'Shuffle' },
                ]}
                onChange={(val) =>
                  setConfig((prev) => ({
                    ...prev,
                    coreOrder: val as 'fixed' | 'shuffle',
                  }))
                }
              />
            </div>

            <div className="mode-field-group">
              <label className="mode-field-label">{STRINGS.modes.coreItemsListTitle}</label>
              {coreItems.length === 0 ? (
                <p className="mode-empty-hint">{STRINGS.modes.noCoreItems}</p>
              ) : (
                <div className="core-items-list">
                  {coreItems.map((item, idx) => (
                    <div key={item.id} className="core-item-row">
                      <div className="core-item-info">
                        <span className="core-item-index">{idx + 1}</span>
                        <span className="core-item-text">
                          {item.type === 'text'
                            ? item.text
                            : item.text || `[${item.type}]`}
                        </span>
                      </div>
                      {config.coreOrder === 'fixed' && (
                        <div className="core-item-order-actions">
                          <button
                            type="button"
                            className="reorder-btn"
                            disabled={idx === 0}
                            onClick={() => handleMoveCoreItem(idx, 'up')}
                            aria-label={`Move ${item.text || 'item'} up`}
                          >
                            <IconArrowUp size={16} />
                          </button>
                          <button
                            type="button"
                            className="reorder-btn"
                            disabled={idx === coreItems.length - 1}
                            onClick={() => handleMoveCoreItem(idx, 'down')}
                            aria-label={`Move ${item.text || 'item'} down`}
                          >
                            <IconArrowDown size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Action buttons */}
          <div className="mode-actions-row">
            <Button variant="primary" fullWidth onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Space Settings'}
            </Button>
            <Button variant="ghost" fullWidth onClick={handleResetDefaults}>
              {STRINGS.modes.resetDefaults}
            </Button>
          </div>
        </main>

        {toastMessage && (
          <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
        )}
      </ScreenLayout>
    </>
  );
};
