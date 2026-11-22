// Full-window drag-and-drop overlay for dropping media files on desktop.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { STRINGS } from '../../strings';
import './DragDropOverlay.css';

export interface DragDropOverlayProps {
  onFilesDropped: (files: File[]) => void;
  enabled?: boolean;
}

export const DragDropOverlay: React.FC<DragDropOverlayProps> = ({
  onFilesDropped,
  enabled = true,
}) => {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragCounter = useRef<number>(0);

  const handleDragEnter = useCallback(
    (e: DragEvent) => {
      if (!enabled) return;
      e.preventDefault();
      dragCounter.current += 1;
      if (e.dataTransfer && e.dataTransfer.types.includes('Files')) {
        setIsDragging(true);
      }
    },
    [enabled]
  );

  const handleDragLeave = useCallback(
    (e: DragEvent) => {
      if (!enabled) return;
      e.preventDefault();
      dragCounter.current -= 1;
      if (dragCounter.current <= 0) {
        setIsDragging(false);
        dragCounter.current = 0;
      }
    },
    [enabled]
  );

  const handleDragOver = useCallback(
    (e: DragEvent) => {
      if (!enabled) return;
      e.preventDefault();
    },
    [enabled]
  );

  const handleDrop = useCallback(
    (e: DragEvent) => {
      if (!enabled) return;
      e.preventDefault();
      setIsDragging(false);
      dragCounter.current = 0;

      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const files = Array.from(e.dataTransfer.files).filter(
          (f) => f.type.startsWith('image/') || f.type.startsWith('video/')
        );
        if (files.length > 0) {
          onFilesDropped(files);
        }
      }
    },
    [enabled, onFilesDropped]
  );

  useEffect(() => {
    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [handleDragEnter, handleDragLeave, handleDragOver, handleDrop]);

  if (!isDragging) return null;

  return (
    <div className="ember-drag-drop-overlay" role="presentation">
      <div className="drag-drop-card">
        <div className="drag-drop-icon" aria-hidden="true">
          📂
        </div>
        <p className="drag-drop-text">{STRINGS.library.dragDropText}</p>
      </div>
    </div>
  );
};
