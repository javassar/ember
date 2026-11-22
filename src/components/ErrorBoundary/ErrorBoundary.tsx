// React Error Boundary component catching unhandled rendering crashes and providing a calm recovery UI.

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '../Button/Button';
import './ErrorBoundary.css';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Unhandled Ember exception caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReload = (): void => {
    window.location.href = '/';
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <main className="ember-error-boundary" role="alert">
          <div className="error-boundary-card">
            <div className="error-boundary-icon" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h1 className="error-boundary-title">Something paused unexpectedly</h1>
            <p className="error-boundary-desc">
              Ember encountered an unexpected error, but your personal affirmations, photos, and settings remain safe on this device.
            </p>
            <div className="error-boundary-actions">
              <Button variant="primary" onClick={this.handleReload}>
                Reload Ember
              </Button>
            </div>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
