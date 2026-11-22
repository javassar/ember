// Add and Edit item screen supporting text, photos, video, per-mode chips, and multi-file processing.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ScreenLayout,
  LivingBackground,
  Button,
  IconButton,
  IconBack,
  IconPlus,
  IconClose,
  Chip,
  TextArea,
  Sheet,
  Toast,
  DragDropOverlay,
} from '../components';
import {
  getItem,
  createItem,
  updateItem,
  deleteItem,
  getPoster,
  getBlob,
  getEventsForItem,
} from '../data';
import { formatBytes } from '../lib/storage';
import {
  processImage,
  processVideo,
  determineItemCreation,
  type ProcessedMedia,
} from '../lib/media';
import { VIDEO_MAX_BYTES, VIDEO_WARN_BYTES } from '../config';
import { STRINGS } from '../strings';
import type { Item, Mode, Membership, ShowEvent, PosterRecord, BlobRecord } from '../types';
import './ItemEditScreen.css';

interface SelectedFilePreview {
  file: File;
  previewUrl: string;
  type: 'image' | 'video';
  sizeFormatted: string;
}

export const ItemEditScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [text, setText] = useState<string>('');
  const [modes, setModes] = useState<Record<Mode, Membership>>({
    start: 'rotating',
    charge: 'rotating',
    rescue: 'rotating',
  });
  const [selectedFiles, setSelectedFiles] = useState<SelectedFilePreview[]>([]);
  const [existingItem, setExistingItem] = useState<Item | null>(null);
  const [existingPosterUrl, setExistingPosterUrl] = useState<string | null>(null);
  const [existingBlobSize, setExistingBlobSize] = useState<number | null>(null);
  const [itemEvents, setItemEvents] = useState<ShowEvent[]>([]);

  // Processing & UI States
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeleteSheetOpen, setIsDeleteSheetOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load existing item data if editing
  const loadItem = useCallback(async () => {
    if (isNew || !id) return;
    try {
      const item = await getItem(id);
      if (!item) {
        navigate('/library', { replace: true });
        return;
      }
      setExistingItem(item);
      setText(item.text || '');
      setModes(item.modes);

      // Load poster if present
      const poster = await getPoster(item.id);
      if (poster) {
        const pUrl = URL.createObjectURL(poster.blob);
        setExistingPosterUrl(pUrl);
      }

      // Load blob metadata if present
      if (item.mediaId) {
        const blobRecord = await getBlob(item.mediaId);
        if (blobRecord) {
          setExistingBlobSize(blobRecord.size);
        }
      }

      // Load event stats
      const events = await getEventsForItem(item.id);
      setItemEvents(events);
    } catch (err) {
      console.error('Failed to load item:', err);
    }
  }, [id, isNew, navigate]);

  useEffect(() => {
    loadItem();
    return () => {
      if (existingPosterUrl) {
        URL.revokeObjectURL(existingPosterUrl);
      }
    };
  }, [loadItem]);

  // Clean up object URLs when selected files change
  useEffect(() => {
    return () => {
      selectedFiles.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    };
  }, [selectedFiles]);

  const cycleMode = (mode: Mode) => {
    setModes((prev) => {
      const current = prev[mode];
      const next: Membership =
        current === 'off' ? 'rotating' : current === 'rotating' ? 'core' : 'off';
      return { ...prev, [mode]: next };
    });
  };

  const handleFilesSelected = (files: File[]) => {
    const valid = files.filter(
      (f) => f.type.startsWith('image/') || f.type.startsWith('video/')
    );

    const previews: SelectedFilePreview[] = valid.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      type: file.type.startsWith('video/') ? 'video' : 'image',
      sizeFormatted: formatBytes(file.size),
    }));

    setSelectedFiles((prev) => [...prev, ...previews]);
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const now = Date.now();

      // Case 1: Updating existing item
      if (!isNew && existingItem) {
        const updated: Item = {
          ...existingItem,
          text: text.trim() || undefined,
          modes,
          updatedAt: now,
        };
        await updateItem(updated);
        navigate('/library');
        return;
      }

      // Case 2: Creating new item(s)
      const creationRule = determineItemCreation(text, selectedFiles.length);

      // Subcase A: Text-only item
      if (selectedFiles.length === 0) {
        if (!text.trim()) {
          setToastMessage('Please enter some text or add a photo/video.');
          setIsSaving(false);
          return;
        }

        const newItem: Item = {
          id: crypto.randomUUID(),
          type: 'text',
          text: text.trim(),
          modes,
          createdAt: now,
          updatedAt: now,
          retiredAt: null,
        };

        await createItem(newItem);
        navigate('/library');
        return;
      }

      // Subcase B: Media item(s)
      for (let i = 0; i < selectedFiles.length; i++) {
        const itemFile = selectedFiles[i].file;
        setProcessingStatus(
          STRINGS.itemEdit.processingFiles(i + 1, selectedFiles.length)
        );

        // Validation for videos
        if (itemFile.type.startsWith('video/')) {
          if (itemFile.size > VIDEO_MAX_BYTES) {
            setToastMessage(STRINGS.itemEdit.fileTooLarge(500));
            continue;
          }
          if (itemFile.size > VIDEO_WARN_BYTES) {
            // In a production PWA, this prompts the user before proceeding
          }
        }

        try {
          let processed: ProcessedMedia;
          if (itemFile.type.startsWith('video/')) {
            processed = await processVideo(itemFile);
          } else {
            processed = await processImage(itemFile);
          }

          const itemId = crypto.randomUUID();
          const mediaId = crypto.randomUUID();

          const newItem: Item = {
            id: itemId,
            type: itemFile.type.startsWith('video/') ? 'video' : 'image',
            text: creationRule.isMultiFile ? undefined : text.trim() || undefined,
            mediaId,
            width: processed.width,
            height: processed.height,
            durationSec: processed.durationSec,
            modes,
            createdAt: now + i,
            updatedAt: now + i,
            retiredAt: null,
          };

          const blobRecord: BlobRecord = {
            id: mediaId,
            blob: processed.blob,
            mime: processed.mime,
            size: processed.size,
          };

          const posterRecord: PosterRecord = {
            itemId,
            blob: processed.posterBlob,
          };

          await createItem(newItem, blobRecord, posterRecord);
        } catch (err) {
          console.error(`Failed to process file ${itemFile.name}:`, err);
        }
      }

      navigate('/library');
    } catch (err) {
      console.error('Failed to save item:', err);
      setToastMessage('Error saving item. Please try again.');
    } finally {
      setIsSaving(false);
      setProcessingStatus(null);
    }
  };

  const handleRetireToggle = async () => {
    if (!existingItem) return;
    const isRetired = existingItem.retiredAt !== null;
    const updated: Item = {
      ...existingItem,
      retiredAt: isRetired ? null : Date.now(),
      updatedAt: Date.now(),
    };
    await updateItem(updated);
    setExistingItem(updated);
    setToastMessage(isRetired ? 'Item restored to active set.' : 'Item retired.');
  };

  const handleDeleteConfirm = async () => {
    if (!existingItem) return;
    await deleteItem(existingItem.id);
    navigate('/library');
  };

  const isMultiFiles = selectedFiles.length > 1;

  return (
    <>
      <LivingBackground mode="home" />
      <DragDropOverlay onFilesDropped={handleFilesSelected} />

      <ScreenLayout maxWidth="md" className="item-edit-layout">
        <header className="item-edit-header">
          <Link to="/library" tabIndex={-1}>
            <IconButton aria-label={STRINGS.common.back} variant="quiet">
              <IconBack />
            </IconButton>
          </Link>
          <h1 className="item-edit-title">
            {isNew ? STRINGS.itemEdit.newTitle : STRINGS.itemEdit.editTitle}
          </h1>
          <div style={{ width: 44 }} />
        </header>

        <main className="item-edit-body" role="main">
          {processingStatus && (
            <div className="processing-banner" role="status">
              <span className="btn-spinner" aria-hidden="true" />
              <span>{processingStatus}</span>
            </div>
          )}

          {/* Text Box / Caption Area */}
          <div className="form-group">
            <TextArea
              label={STRINGS.itemEdit.textBoxLabel}
              placeholder={STRINGS.itemEdit.textBoxPlaceholder}
              value={text}
              disabled={isMultiFiles}
              onChange={(e) => setText(e.target.value)}
              rows={4}
            />
            {isMultiFiles && (
              <p className="caption-rule-hint">{STRINGS.itemEdit.captionRuleHint}</p>
            )}
          </div>

          {/* Media Picker / Existing Media Preview */}
          <div className="form-group">
            <span className="field-label">Media (Photo or Video)</span>

            {/* Existing media preview if editing */}
            {!isNew && existingItem && existingPosterUrl && (
              <div className="existing-media-preview">
                <img
                  src={existingPosterUrl}
                  alt={existingItem.text || 'Item thumbnail'}
                  className="existing-poster-img"
                />
                <div className="existing-media-meta">
                  <span className="existing-media-type">
                    {existingItem.type.toUpperCase()}
                  </span>
                  {existingBlobSize !== null && (
                    <span className="existing-media-size">
                      {formatBytes(existingBlobSize)}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Selected files preview list */}
            {selectedFiles.length > 0 && (
              <div className="selected-files-list">
                {selectedFiles.map((sf, index) => (
                  <div key={index} className="selected-file-card">
                    {sf.type === 'image' ? (
                      <img src={sf.previewUrl} alt="Preview" className="preview-thumb" />
                    ) : (
                      <div className="video-thumb-placeholder">🎬</div>
                    )}
                    <div className="selected-file-info">
                      <span className="selected-file-name">{sf.file.name}</span>
                      <span className="selected-file-size">{sf.sizeFormatted}</span>
                    </div>
                    <button
                      type="button"
                      className="remove-file-btn"
                      onClick={() => removeSelectedFile(index)}
                      aria-label={STRINGS.itemEdit.removeMediaBtn}
                    >
                      <IconClose size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add media button */}
            {isNew && (
              <div className="media-button-row">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files) {
                      handleFilesSelected(Array.from(e.target.files));
                    }
                  }}
                />
                <Button
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <IconPlus size={18} />
                  <span style={{ marginLeft: 'var(--space-2)' }}>
                    {STRINGS.itemEdit.addMediaBtn}
                  </span>
                </Button>
              </div>
            )}
          </div>

          {/* Mode Membership Chips */}
          <div className="form-group">
            <span className="field-label">{STRINGS.itemEdit.modeSection}</span>
            <p className="field-desc">{STRINGS.itemEdit.modeSectionHelp}</p>
            <div className="mode-chips-row">
              <Chip
                label="Start"
                state={modes.start}
                modeAccent="start"
                onClick={() => cycleMode('start')}
              />
              <Chip
                label="Charge"
                state={modes.charge}
                modeAccent="charge"
                onClick={() => cycleMode('charge')}
              />
              <Chip
                label="Rescue"
                state={modes.rescue}
                modeAccent="rescue"
                onClick={() => cycleMode('rescue')}
              />
            </div>
          </div>

          {/* Viewing Statistics (When editing an existing item) */}
          {!isNew && existingItem && (
            <div className="form-group stats-box">
              <span className="field-label">{STRINGS.stats.title}</span>
              <div className="stats-list">
                <div className="stat-row">
                  <span>{STRINGS.stats.timesShown}</span>
                  <span className="stat-val">{itemEvents.length}</span>
                </div>
                <div className="stat-row">
                  <span>{STRINGS.stats.timesHelped}</span>
                  <span className="stat-val">
                    {itemEvents.filter((ev) => ev.helped).length}
                  </span>
                </div>
                <div className="stat-row">
                  <span>{STRINGS.stats.lastShown}</span>
                  <span className="stat-val">
                    {itemEvents.length > 0
                      ? new Date(
                          Math.max(...itemEvents.map((e) => e.shownAt))
                        ).toLocaleDateString()
                      : STRINGS.stats.never}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="item-actions-stack">
            <Button
              variant="primary"
              fullWidth
              size="lg"
              loading={isSaving}
              onClick={handleSave}
            >
              {isNew ? STRINGS.itemEdit.saveBtn : STRINGS.itemEdit.saveChangesBtn}
            </Button>

            {!isNew && existingItem && (
              <div className="secondary-actions-row">
                <Button variant="secondary" onClick={handleRetireToggle}>
                  {existingItem.retiredAt !== null
                    ? STRINGS.itemEdit.restoreBtn
                    : STRINGS.itemEdit.retireBtn}
                </Button>
                <Button
                  variant="danger"
                  onClick={() => setIsDeleteSheetOpen(true)}
                >
                  {STRINGS.itemEdit.deleteBtn}
                </Button>
              </div>
            )}
          </div>
        </main>

        {/* Delete Confirmation Sheet */}
        <Sheet
          isOpen={isDeleteSheetOpen}
          onClose={() => setIsDeleteSheetOpen(false)}
          title={STRINGS.itemEdit.deleteConfirmTitle}
        >
          <div className="delete-sheet-body">
            <p className="delete-sheet-text">
              {STRINGS.itemEdit.deleteConfirmBody}
            </p>
            <div className="delete-sheet-buttons">
              <Button variant="danger" fullWidth onClick={handleDeleteConfirm}>
                {STRINGS.itemEdit.deleteBtn}
              </Button>
              <Button
                variant="ghost"
                fullWidth
                onClick={() => setIsDeleteSheetOpen(false)}
              >
                {STRINGS.common.cancel}
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
