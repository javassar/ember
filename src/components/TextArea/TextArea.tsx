// Accessible TextArea component supporting labels, character counters, and auto-sizing.

import React from 'react';
import './TextArea.css';

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  showCharCount?: boolean;
}

export const TextArea: React.FC<TextAreaProps> = ({
  label,
  hint,
  showCharCount = false,
  maxLength,
  value,
  id,
  className = '',
  disabled = false,
  ...rest
}) => {
  const textareaId = id || `textarea-${React.useId()}`;
  const currentLength = typeof value === 'string' ? value.length : 0;

  return (
    <div className={`ember-textarea-container ${disabled ? 'ember-textarea--disabled' : ''}`}>
      {label && (
        <label htmlFor={textareaId} className="textarea-label">
          {label}
        </label>
      )}

      <textarea
        id={textareaId}
        className={`ember-textarea ${className}`}
        value={value}
        maxLength={maxLength}
        disabled={disabled}
        {...rest}
      />

      {(hint || (showCharCount && maxLength)) && (
        <div className="textarea-meta">
          {hint ? <span className="textarea-hint">{hint}</span> : <span />}
          {showCharCount && maxLength && (
            <span className="textarea-char-count">
              {`${currentLength}/${maxLength}`}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
