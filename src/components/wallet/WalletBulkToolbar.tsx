'use client';

import React, { useCallback, useEffect, useRef } from 'react';

export interface WalletBulkToolbarProps {
  /** Total number of currently selected items */
  selectedCount: number;
  /** Callback fired when user clicks Clear Selection or presses Escape key */
  onClearSelection: () => void;
  /** Callback fired when user clicks Export action */
  onExport: () => void;
  /** Callback fired when user clicks Delete action */
  onDelete: () => void;
}

const FOCUSABLE_SELECTORS =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * WalletBulkToolbar — accessible toolbar for multi-selected wallet items.
 *
 * Renders bulk actions (Export, Delete, Clear) when items are selected.
 * Supports keyboard navigation (arrow keys within toolbar, Escape to clear)
 * and screen-reader announcements.
 */
export const WalletBulkToolbar: React.FC<WalletBulkToolbarProps> = ({
  selectedCount,
  onClearSelection,
  onExport,
  onDelete,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);
  const prevSelectedCountRef = useRef(selectedCount);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const getFocusableInToolbar = useCallback((): HTMLElement[] => {
    const toolbar = containerRef.current;
    if (!toolbar) return [];
    return Array.from(toolbar.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS));
  }, []);

  // Auto-focus the first focusable button when toolbar appears
  useEffect(() => {
    if (prevSelectedCountRef.current === 0 && selectedCount > 0) {
      const focusable = getFocusableInToolbar();
      if (focusable.length > 0) {
        focusable[0].focus();
      }
    }
    prevSelectedCountRef.current = selectedCount;
  }, [selectedCount, getFocusableInToolbar]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && selectedCount > 0 && mountedRef.current) {
      e.preventDefault();
      onClearSelection();
      return;
    }

    const toolbar = containerRef.current;
    const target = e.target as HTMLElement | null;
    const isInsideToolbar = toolbar && target && toolbar.contains(target);
    if (!isInsideToolbar) return;

    const focusable = getFocusableInToolbar();
    if (focusable.length === 0) return;

    const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
    if (currentIndex === -1) return;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % focusable.length;
      focusable[nextIndex].focus();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + focusable.length) % focusable.length;
      focusable[prevIndex].focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      focusable[0].focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      focusable[focusable.length - 1].focus();
    }
  }, [selectedCount, onClearSelection, getFocusableInToolbar]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (selectedCount <= 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      role="toolbar"
      aria-label="Bulk actions toolbar"
      data-testid="wallet-bulk-toolbar"
      data-wallet-toolbar
      className="sticky top-20 z-30 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50/95 px-4 py-3 shadow-md backdrop-blur transition-all dark:border-blue-900/50 dark:bg-slate-800/95"
    >
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center justify-center rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-bold text-white">
          {selectedCount}
        </span>
        <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
          {selectedCount === 1 ? '1 item selected' : `${selectedCount} items selected`}
        </span>
        <button
          type="button"
          onClick={onClearSelection}
          className="text-xs font-semibold text-blue-700 underline hover:text-blue-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
          aria-label="Clear item selection"
        >
          Clear selection
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onExport}
          className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
          aria-label={`Export ${selectedCount} selected ${selectedCount === 1 ? 'item' : 'items'}`}
        >
          <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export ({selectedCount})
        </button>

        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center justify-center rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500"
          aria-label={`Delete ${selectedCount} selected ${selectedCount === 1 ? 'item' : 'items'}`}
        >
          <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete ({selectedCount})
        </button>
      </div>
    </div>
  );
};

export default WalletBulkToolbar;
