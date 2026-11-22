// Settings screen managing security PIN, lock timeouts, preferences, storage, backup & restore, and resets.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ScreenLayout,
  LivingBackground,
  Button,
  IconButton,
  IconBack,
  Sheet,
  NumberPad,
  SegmentedControl,
  Toggle,
  Toast,
} from '../components';
import { useLock } from '../context/LockContext';
import { STRINGS } from '../strings';
import {
  getStorageEstimate,
  checkPersistentStorage,
  requestPersistentStorage,
  type StorageEstimateInfo,
} from '../lib/storage';
import {
  exportBackupZip,
  triggerBackupDownload,
  importBackupZip,
} from '../lib/backup';
import { seedSampleContent } from '../data';
import type { Mode } from '../types';
import './SettingsScreen.css';

export const SettingsScreen: React.FC = () => {
  const navigate = useNavigate();
  const {
    hasPin,
    pinLength,
    settings,
    setPin,
    setTimeoutMs,
    updateSettings,
    resetAndErase,
  } = useLock();

  // PIN modal flow
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinModalMode, setPinModalMode] = useState<'create' | 'change' | 'remove'>('create');
  const [enteredNewPin, setEnteredNewPin] = useState('');
  const [enteredConfirmPin, setEnteredConfirmPin] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  // Storage and Persistence
  const [storageInfo, setStorageInfo] = useState<StorageEstimateInfo | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);

  // Backup & Restore
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedBackupFile, setSelectedBackupFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Erase All Data modal
  const [isEraseModalOpen, setIsEraseModalOpen] = useState(false);
  const [eraseInput, setEraseInput] = useState('');
  const [isErasing, setIsErasing] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadStorageMetrics = useCallback(async () => {
    try {
      const [estimate, isPersisted] = await Promise.all([
        getStorageEstimate(),
        checkPersistentStorage(),
      ]);
      setStorageInfo(estimate);
      setPersisted(isPersisted);
    } catch (err) {
      console.error('Failed to load storage estimates:', err);
    }
  }, []);

  useEffect(() => {
    loadStorageMetrics();
  }, [loadStorageMetrics]);

  const timeoutOptions = [
    { value: '0', label: 'Every time' },
    { value: '60000', label: '1 min' },
    { value: '300000', label: '5 min' },
    { value: '900000', label: '15 min' },
    { value: '3600000', label: '1 hour' },
  ];

  const currentTimeoutVal = String(settings?.lockTimeoutMs ?? 300000);

  const handleTimeoutChange = async (val: string) => {
    await setTimeoutMs(Number(val));
    setToastMessage('Lock timeout updated.');
  };

  const handleOpenIntoChange = async (val: string) => {
    await updateSettings({ openInto: val as 'home' | Mode });
    setToastMessage('Startup destination updated.');
  };

  const handleRitualToggle = async (enabled: boolean) => {
    await updateSettings({ ritualEnabled: enabled });
    setToastMessage(enabled ? 'Ritual opening enabled.' : 'Ritual opening disabled.');
  };

  const handleRitualScaleChange = async (scale: string) => {
    await updateSettings({ ritualScale: scale as 'auto' | 'full' | 'short' });
    setToastMessage('Ritual length updated.');
  };

  const handleSoundToggle = async (soundOn: boolean) => {
    await updateSettings({ soundOnByDefault: soundOn });
    setToastMessage(soundOn ? 'Sound on by default enabled.' : 'Sound on by default disabled.');
  };

  const handleThemeChange = async (val: string) => {
    await updateSettings({ theme: val as 'system' | 'dark' | 'light' });
    setToastMessage('Appearance updated.');
  };

  const openPinModal = (mode: 'create' | 'change' | 'remove') => {
    setPinModalMode(mode);
    setEnteredNewPin('');
    setEnteredConfirmPin('');
    setIsConfirming(false);
    setPinError(null);
    setIsPinModalOpen(true);
  };

  const handleDigit = (digit: string) => {
    setPinError(null);
    if (!isConfirming) {
      if (enteredNewPin.length < 8) {
        setEnteredNewPin((prev) => prev + digit);
      }
    } else {
      if (enteredConfirmPin.length < 8) {
        setEnteredConfirmPin((prev) => prev + digit);
      }
    }
  };

  const handleDelete = () => {
    setPinError(null);
    if (!isConfirming) {
      setEnteredNewPin((prev) => prev.slice(0, -1));
    } else {
      setEnteredConfirmPin((prev) => prev.slice(0, -1));
    }
  };

  const handleSavePin = async () => {
    if (pinModalMode === 'remove') {
      await setPin(null);
      setIsPinModalOpen(false);
      setToastMessage('PIN protection removed.');
      return;
    }

    if (!isConfirming) {
      if (enteredNewPin.length < 4) {
        setPinError('PIN must be at least 4 digits.');
        return;
      }
      setIsConfirming(true);
      return;
    }

    if (enteredConfirmPin !== enteredNewPin) {
      setPinError('PINs do not match. Try again.');
      setEnteredConfirmPin('');
      return;
    }

    await setPin(enteredNewPin);
    setIsPinModalOpen(false);
    setToastMessage(pinModalMode === 'create' ? 'PIN enabled.' : 'PIN updated.');
  };

  const handleRequestPersistence = async () => {
    const granted = await requestPersistentStorage();
    setPersisted(granted);
    setToastMessage(
      granted
        ? 'Persistent storage granted.'
        : 'Browser declined or already manages persistent storage.'
    );
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const { blob, filename } = await exportBackupZip();
      await triggerBackupDownload(blob, filename);
      await updateSettings({ lastExportAt: Date.now() });
      setToastMessage('Backup archive downloaded successfully.');
    } catch (err) {
      console.error('Export failed:', err);
      setToastMessage(
        'Export failed. If on iPhone with very large videos, try removing some media before exporting.'
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedBackupFile(e.target.files[0]);
      setIsImportModalOpen(true);
      e.target.value = ''; // Reset input
    }
  };

  const handleConfirmImport = async () => {
    if (!selectedBackupFile) return;
    setIsImporting(true);
    try {
      const result = await importBackupZip(selectedBackupFile, importMode);
      setIsImportModalOpen(false);
      setSelectedBackupFile(null);
      await loadStorageMetrics();
      setToastMessage(
        result.mode === 'merge'
          ? STRINGS.settings.importSuccessMerge
          : STRINGS.settings.importSuccessReplace
      );
      // Refresh settings in lock context
      await updateSettings({});
    } catch (err) {
      console.error('Import failed:', err);
      setToastMessage(
        (err as Error).message || STRINGS.settings.importErrorInvalid
      );
    } finally {
      setIsImporting(false);
    }
  };

  const handleLoadSamples = async () => {
    try {
      await seedSampleContent();
      await loadStorageMetrics();
      setToastMessage(STRINGS.settings.loadSamplesSuccess);
    } catch (err) {
      console.error('Load samples failed:', err);
      setToastMessage('Failed to load sample content.');
    }
  };

  const handleConfirmErase = async () => {
    if (eraseInput.trim() !== 'ERASE') {
      return;
    }
    setIsErasing(true);
    try {
      await resetAndErase();
      setIsEraseModalOpen(false);
      navigate('/');
    } catch (err) {
      console.error('Erase failed:', err);
      setToastMessage('Failed to erase content.');
      setIsErasing(false);
    }
  };

  return (
    <>
      <LivingBackground mode="home" />

      <ScreenLayout maxWidth="md" className="settings-layout">
        <header className="settings-header">
          <Link to="/" tabIndex={-1}>
            <IconButton aria-label={STRINGS.common.back} variant="quiet">
              <IconBack />
            </IconButton>
          </Link>
          <h1 className="settings-title">{STRINGS.settings.title}</h1>
          <div style={{ width: 44 }} />
        </header>

        <main className="settings-body" role="main">
          {/* Security & PIN Section */}
          <section className="settings-card" aria-labelledby="sec-heading">
            <h2 id="sec-heading" className="settings-card-title">
              {STRINGS.settings.securitySection}
            </h2>

            <div className="pin-status-row">
              <div className="pin-status-info">
                <span className="pin-status-label">
                  {hasPin ? STRINGS.settings.pinEnabled : STRINGS.settings.pinDisabled}
                </span>
                {hasPin && (
                  <span className="pin-status-sub">
                    {pinLength}-digit numeric passkey active
                  </span>
                )}
              </div>

              <div className="pin-actions">
                {!hasPin ? (
                  <Button variant="primary" size="sm" onClick={() => openPinModal('create')}>
                    {STRINGS.settings.setPinBtn}
                  </Button>
                ) : (
                  <div className="pin-actions-split">
                    <Button variant="secondary" size="sm" onClick={() => openPinModal('change')}>
                      {STRINGS.settings.changePinBtn}
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => openPinModal('remove')}>
                      {STRINGS.settings.removePinBtn}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Lock Timeout (only active when PIN is set) */}
            {hasPin && (
              <div className="lock-timeout-container">
                <div className="timeout-header">
                  <span className="timeout-label">{STRINGS.settings.lockTimeoutTitle}</span>
                  <span className="timeout-desc">{STRINGS.settings.lockTimeoutDesc}</span>
                </div>
                <SegmentedControl
                  value={currentTimeoutVal}
                  options={timeoutOptions}
                  onChange={handleTimeoutChange}
                />
              </div>
            )}

            {/* Honesty Note */}
            <div className="honesty-note-box">
              <span className="honesty-note-title">
                {STRINGS.settings.honestyNoteTitle}
              </span>
              <p className="honesty-note-body">
                {STRINGS.settings.honestyNoteBody}
              </p>
            </div>
          </section>

          {/* Preferences: Appearance, Open-Into, Ritual, Sound */}
          <section className="settings-card" aria-labelledby="pref-heading">
            <h2 id="pref-heading" className="settings-card-title">
              {STRINGS.settings.preferencesSection}
            </h2>

            {/* Appearance / Theme */}
            <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <div className="settings-row-info" style={{ marginBottom: 'var(--space-2)' }}>
                <span className="settings-row-label">{STRINGS.settings.appearanceTitle}</span>
                <span className="settings-row-desc">{STRINGS.settings.appearanceDesc}</span>
              </div>
              <SegmentedControl
                value={settings?.theme || 'dark'}
                options={[
                  { value: 'dark', label: STRINGS.settings.themeDark },
                  { value: 'light', label: STRINGS.settings.themeLight },
                  { value: 'system', label: STRINGS.settings.themeSystem },
                ]}
                onChange={handleThemeChange}
              />
            </div>

            {/* Open Into */}
            <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <div className="settings-row-info" style={{ marginBottom: 'var(--space-2)' }}>
                <span className="settings-row-label">{STRINGS.settings.openIntoTitle}</span>
                <span className="settings-row-desc">{STRINGS.settings.openIntoDesc}</span>
              </div>
              <SegmentedControl
                value={settings?.openInto || 'home'}
                options={[
                  { value: 'home', label: 'Home' },
                  { value: 'start', label: 'Start' },
                  { value: 'charge', label: 'Charge' },
                  { value: 'rescue', label: 'Rescue' },
                ]}
                onChange={handleOpenIntoChange}
              />
            </div>

            {/* Ritual opening toggle */}
            <div className="settings-row">
              <div className="settings-row-info">
                <span className="settings-row-label">{STRINGS.settings.ritualTitle}</span>
                <span className="settings-row-desc">{STRINGS.settings.ritualDesc}</span>
              </div>
              <Toggle
                checked={settings?.ritualEnabled ?? true}
                onChange={handleRitualToggle}
                label={STRINGS.settings.ritualTitle}
              />
            </div>

            {/* Ritual Scale */}
            {settings?.ritualEnabled && (
              <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <div className="settings-row-info" style={{ marginBottom: 'var(--space-2)' }}>
                  <span className="settings-row-label">{STRINGS.settings.ritualScaleTitle}</span>
                </div>
                <SegmentedControl
                  value={settings?.ritualScale || 'auto'}
                  options={[
                    { value: 'auto', label: 'Auto' },
                    { value: 'full', label: 'Full' },
                    { value: 'short', label: 'Short' },
                  ]}
                  onChange={handleRitualScaleChange}
                />
              </div>
            )}

            {/* Sound On By Default */}
            <div className="settings-row">
              <div className="settings-row-info">
                <span className="settings-row-label">{STRINGS.settings.soundDefaultTitle}</span>
                <span className="settings-row-desc">{STRINGS.settings.soundDefaultDesc}</span>
              </div>
              <Toggle
                checked={settings?.soundOnByDefault ?? false}
                onChange={handleSoundToggle}
                label={STRINGS.settings.soundDefaultTitle}
              />
            </div>
          </section>

          {/* Manage Spaces & Modes */}
          <section className="settings-card" aria-labelledby="spaces-heading">
            <h2 id="spaces-heading" className="settings-card-title">
              {STRINGS.settings.spacesSection}
            </h2>

            <div className="space-settings-item">
              <div className="settings-row-info">
                <span className="space-badge-name">
                  {settings?.modes?.start?.label || 'Start'}
                </span>
                <span className="settings-row-desc">
                  {settings?.modes?.start?.description || 'Morning intention'}
                </span>
              </div>
              <Link to="/modes/start">
                <Button variant="secondary" size="sm">
                  Configure
                </Button>
              </Link>
            </div>

            <div className="space-settings-item">
              <div className="settings-row-info">
                <span className="space-badge-name">
                  {settings?.modes?.charge?.label || 'Charge'}
                </span>
                <span className="settings-row-desc">
                  {settings?.modes?.charge?.description || 'Gather energy'}
                </span>
              </div>
              <Link to="/modes/charge">
                <Button variant="secondary" size="sm">
                  Configure
                </Button>
              </Link>
            </div>

            <div className="space-settings-item">
              <div className="settings-row-info">
                <span className="space-badge-name">
                  {settings?.modes?.rescue?.label || 'Rescue'}
                </span>
                <span className="settings-row-desc">
                  {settings?.modes?.rescue?.description || 'Low-friction push'}
                </span>
              </div>
              <Link to="/modes/rescue">
                <Button variant="secondary" size="sm">
                  Configure
                </Button>
              </Link>
            </div>
          </section>

          {/* Device Storage & Persistence */}
          <section className="settings-card" aria-labelledby="storage-heading">
            <h2 id="storage-heading" className="settings-card-title">
              {STRINGS.settings.storageSection}
            </h2>

            <div className="storage-meter-grid">
              <div className="storage-meter-item">
                <span className="storage-meter-label">{STRINGS.settings.storageUsedLabel}</span>
                <span className="storage-meter-val">{storageInfo?.formattedUsed ?? '—'}</span>
                {storageInfo && (
                  <span className="storage-meter-sub">{storageInfo.percentage.toFixed(2)}% used</span>
                )}
              </div>

              <div className="storage-meter-item">
                <span className="storage-meter-label">{STRINGS.settings.storageQuotaLabel}</span>
                <span className="storage-meter-val">{storageInfo?.formattedQuota ?? '—'}</span>
              </div>

              <div className="storage-meter-item">
                <span className="storage-meter-label">{STRINGS.settings.storagePersistLabel}</span>
                <span className="storage-meter-val">
                  {persisted ? 'Protected' : 'Default'}
                </span>
                {!persisted && (
                  <button
                    type="button"
                    className="persist-action-btn"
                    onClick={handleRequestPersistence}
                  >
                    {STRINGS.settings.storagePersistBtn}
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Backup & Restore */}
          <section className="settings-card" aria-labelledby="backup-heading">
            <h2 id="backup-heading" className="settings-card-title">
              {STRINGS.settings.backupSection}
            </h2>
            <p className="settings-card-desc">{STRINGS.settings.backupDesc}</p>

            <div className="backup-actions-row">
              <Button
                variant="primary"
                onClick={handleExport}
                loading={isExporting}
                disabled={isExporting || isImporting}
              >
                {isExporting ? STRINGS.settings.exportingBtn : STRINGS.settings.exportBtn}
              </Button>

              <Button
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={isExporting || isImporting}
              >
                {STRINGS.settings.importBtn}
              </Button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".zip,application/zip"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>

            <div className="backup-meta-info">
              {settings?.lastExportAt ? (
                <span>
                  {STRINGS.settings.lastExportLabel(
                    new Date(settings.lastExportAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  )}
                </span>
              ) : (
                <span>{STRINGS.settings.noExportYet}</span>
              )}
            </div>
          </section>

          {/* Sample Content */}
          <section className="settings-card" aria-labelledby="sample-heading">
            <h2 id="sample-heading" className="settings-card-title">
              {STRINGS.settings.sampleContentSection}
            </h2>
            <p className="settings-card-desc">
              Restore the original 12 quotes, pictures, and video samples without erasing your existing items.
            </p>
            <Button variant="secondary" onClick={handleLoadSamples}>
              {STRINGS.settings.loadSamplesBtn}
            </Button>
          </section>

          {/* Reset Ember (Danger Zone) */}
          <section className="settings-card settings-card--danger" aria-labelledby="danger-heading">
            <h2 id="danger-heading" className="settings-card-title text-danger">
              {STRINGS.settings.dangerSection}
            </h2>
            <p className="settings-card-desc">
              Permanently erase all your content, next steps, statistics, and settings from this device.
            </p>
            <Button
              variant="danger"
              onClick={() => {
                setEraseInput('');
                setIsEraseModalOpen(true);
              }}
            >
              {STRINGS.settings.eraseAllBtn}
            </Button>
          </section>

          {/* About Ember */}
          <section className="settings-card" aria-labelledby="about-heading">
            <h2 id="about-heading" className="settings-card-title">
              {STRINGS.settings.aboutSection}
            </h2>
            <p className="about-version">{STRINGS.settings.aboutVersion}</p>
            <p className="settings-card-desc">{STRINGS.settings.aboutPrivacy}</p>

            <div className="diag-links-row" style={{ marginTop: 'var(--space-4)' }}>
              <Link to="/dev">
                <Button variant="ghost" size="sm">
                  Developer Diagnostics (/dev)
                </Button>
              </Link>
              <Link to="/dev/styleguide">
                <Button variant="ghost" size="sm">
                  Design Styleguide (/dev/styleguide)
                </Button>
              </Link>
            </div>
          </section>
        </main>

        {/* PIN Setup / Change Modal Sheet */}
        <Sheet
          isOpen={isPinModalOpen}
          onClose={() => setIsPinModalOpen(false)}
          title={
            pinModalMode === 'remove'
              ? 'Remove PIN Protection'
              : isConfirming
              ? 'Confirm New PIN'
              : pinModalMode === 'create'
              ? 'Create New PIN'
              : 'Enter New PIN'
          }
        >
          {pinModalMode === 'remove' ? (
            <div className="pin-remove-content">
              <p className="remove-pin-warning">
                Removing your PIN means Ember will open immediately without asking for a code.
              </p>
              <div className="sheet-action-stack">
                <Button variant="danger" fullWidth onClick={handleSavePin}>
                  Yes, Remove PIN
                </Button>
                <Button variant="ghost" fullWidth onClick={() => setIsPinModalOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="pin-modal-content">
              <p className="pin-modal-sub">
                {isConfirming
                  ? 'Re-enter your PIN to verify'
                  : 'Enter 4 to 8 digits on the keypad'}
              </p>

              {pinError && <p className="pin-error-text">{pinError}</p>}

              <div className="pin-dots-display">
                {Array.from({ length: 4 }).map((_, i) => {
                  const val = isConfirming ? enteredConfirmPin : enteredNewPin;
                  return (
                    <span
                      key={i}
                      className={`pin-dot ${i < val.length ? 'pin-dot--filled' : ''}`}
                    />
                  );
                })}
              </div>

              <NumberPad onDigit={handleDigit} onDelete={handleDelete} />

              <div className="sheet-action-stack" style={{ marginTop: 'var(--space-6)' }}>
                <Button
                  variant="primary"
                  fullWidth
                  disabled={(isConfirming ? enteredConfirmPin : enteredNewPin).length < 4}
                  onClick={handleSavePin}
                >
                  {isConfirming ? 'Save PIN' : 'Continue'}
                </Button>
                <Button variant="ghost" fullWidth onClick={() => setIsPinModalOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </Sheet>

        {/* Import Modal */}
        <Sheet
          isOpen={isImportModalOpen}
          onClose={() => {
            if (!isImporting) {
              setIsImportModalOpen(false);
              setSelectedBackupFile(null);
            }
          }}
          title={STRINGS.settings.importModalTitle}
        >
          <div className="import-modal-content">
            <p className="import-modal-desc">{STRINGS.settings.importModalDesc}</p>

            <div className="import-options-stack">
              <label
                className={`import-option-card ${importMode === 'merge' ? 'selected' : ''}`}
                onClick={() => setImportMode('merge')}
              >
                <input
                  type="radio"
                  name="importMode"
                  value="merge"
                  checked={importMode === 'merge'}
                  onChange={() => setImportMode('merge')}
                />
                <div className="import-option-info">
                  <span className="import-option-title">
                    {STRINGS.settings.importMergeOption}
                  </span>
                  <span className="import-option-desc">
                    {STRINGS.settings.importMergeDesc}
                  </span>
                </div>
              </label>

              <label
                className={`import-option-card ${importMode === 'replace' ? 'selected' : ''}`}
                onClick={() => setImportMode('replace')}
              >
                <input
                  type="radio"
                  name="importMode"
                  value="replace"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                />
                <div className="import-option-info">
                  <span className="import-option-title text-danger">
                    {STRINGS.settings.importReplaceOption}
                  </span>
                  <span className="import-option-desc">
                    {STRINGS.settings.importReplaceDesc}
                  </span>
                </div>
              </label>
            </div>

            <div className="sheet-action-stack" style={{ marginTop: 'var(--space-6)' }}>
              <Button
                variant={importMode === 'replace' ? 'danger' : 'primary'}
                fullWidth
                loading={isImporting}
                disabled={isImporting}
                onClick={handleConfirmImport}
              >
                {isImporting ? STRINGS.settings.importingBtn : STRINGS.settings.importConfirmBtn}
              </Button>
              <Button
                variant="ghost"
                fullWidth
                disabled={isImporting}
                onClick={() => {
                  setIsImportModalOpen(false);
                  setSelectedBackupFile(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Sheet>

        {/* Erase All Confirmation Modal */}
        <Sheet
          isOpen={isEraseModalOpen}
          onClose={() => {
            if (!isErasing) setIsEraseModalOpen(false);
          }}
          title={STRINGS.settings.eraseModalTitle}
        >
          <div className="erase-modal-content">
            <p className="erase-warning-text">{STRINGS.settings.eraseModalWarning}</p>
            <p className="erase-instruction-text">{STRINGS.settings.eraseTypeInstruction}</p>

            <input
              type="text"
              className="erase-confirm-input"
              placeholder="ERASE"
              value={eraseInput}
              onChange={(e) => setEraseInput(e.target.value)}
              autoFocus
            />

            <div className="sheet-action-stack" style={{ marginTop: 'var(--space-6)' }}>
              <Button
                variant="danger"
                fullWidth
                loading={isErasing}
                disabled={eraseInput.trim() !== 'ERASE' || isErasing}
                onClick={handleConfirmErase}
              >
                {STRINGS.settings.eraseConfirmBtn}
              </Button>
              <Button
                variant="ghost"
                fullWidth
                disabled={isErasing}
                onClick={() => setIsEraseModalOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Sheet>

        {toastMessage && (
          <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
        )}
      </ScreenLayout>
    </>
  );
};
