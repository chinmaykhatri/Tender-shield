'use client';

import { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * React Error Boundary for graceful failure handling.
 * Catches JavaScript errors in child components and displays
 * a user-friendly fallback UI instead of a white screen.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    // In production, send to error tracking service (Sentry, etc.)
    console.error('[TenderShield Error Boundary]', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex items-center justify-center min-h-[400px] p-8">
          <div className="card-glass p-8 max-w-lg w-full text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-display font-bold mb-2">Something went wrong</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              An unexpected error occurred. Our team has been notified.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <pre className="text-xs text-left bg-[var(--bg-secondary)] p-4 rounded-lg mb-4 overflow-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="px-6 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: 'linear-gradient(135deg, #FF9933, #6366f1)' }}
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2.5 rounded-xl text-sm font-medium bg-[var(--bg-secondary)] hover:bg-[var(--bg-card-hover)] transition-all"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Inline error state component for sections that fail to load.
 */
export function ErrorState({
  title = 'Failed to load',
  message = 'Something went wrong while loading this section.',
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="card-glass p-6 text-center">
      <span className="text-3xl block mb-3">❌</span>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-[var(--text-secondary)] mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 text-sm rounded-lg bg-[var(--accent)] text-white hover:opacity-90 transition-opacity"
        >
          Retry
        </button>
      )}
    </div>
  );
}

/**
 * Empty state component when no data is available.
 */
export function EmptyState({
  icon = '📭',
  title = 'No data found',
  message = 'There are no items to display.',
  actionLabel,
  onAction,
}: {
  icon?: string;
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="card-glass p-8 text-center">
      <span className="text-4xl block mb-3">{icon}</span>
      <h3 className="font-display font-semibold text-lg mb-1">{title}</h3>
      <p className="text-sm text-[var(--text-secondary)] mb-4">{message}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-5 py-2.5 text-sm rounded-xl font-medium"
          style={{ background: 'linear-gradient(135deg, #FF9933, #6366f1)', color: 'white' }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
