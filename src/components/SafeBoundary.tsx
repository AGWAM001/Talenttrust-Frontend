'use client';

import React, { Component, ReactNode } from 'react';
import Link from 'next/link';
import { reportError } from '../lib/errorReporter';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
}

export default class SafeBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _info: React.ErrorInfo) {
    reportError(error, 'SafeBoundary');
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          role="alert"
          aria-live="assertive"
          className="flex flex-col items-center justify-center p-8 rounded-lg border border-red-200 bg-red-50 text-center space-y-4"
        >
          <p className="text-red-700 font-medium">
            {this.props.fallbackTitle ?? 'This section failed to load.'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={this.reset}
              className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              Retry
            </button>
            <Link
              href="/"
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-100 transition-colors"
            >
              Go Home
            </Link>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
