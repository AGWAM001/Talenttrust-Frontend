'use client';

import React, { useEffect, useId, useRef, useCallback } from 'react';
import { StatusType } from '@/components/StatusBadge';

export interface BulkActionToolbarProps {
  selectedCount: number;
  totalCount: number;
  onClearSelection: () => void;
  onExport: () => void;
  onStatusUpdate: (status: StatusType) => void;
  onDelete: () => void;
}

const FOCUSABLE_SELECTORS =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const STATUS_OPTIONS: StatusType[] = ['Pending', 'Active', 'Completed', 'Paid', 'Disputed'];

const focusRingClass =
  'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-500';

export const BulkActionToolbar: React.FC<BulkActionToolbarProps> = ({
  selectedCount,
  totalCount,
  onClearSelection,
  onExport,
  onStatusUpdate,
  onDelete,
}) => {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const clearBtnRef = useRef<HTMLButtonElement>(null);
  const statusSelectRef = useRef<HTMLSelectElement>(null);
  const prevSelectedCountRef = useRef(selectedCount);

  const countId = useId();

  useEffect(() => {
    if (prevSelectedCountRef.current === 0 && selectedCount > 0) {
      clearBtnRef.current?.focus();
    }
    prevSelectedCountRef.current = selectedCount;
  }, [selectedCount]);

  const getFocusableInToolbar = useCallback((): HTMLElement[] => {
    const toolbar = toolbarRef.current;
    if (!toolbar) return [];
    return Array.from(toolbar.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS));
  }, []);

  useEffect(() => {
    if (selectedCount === 0) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const toolbar = toolbarRef.current;
      const isInsideToolbar = toolbar && target && toolbar.contains(target);

      if (event.key === 'Escape') {
        event.preventDefault();
        onClearSelection();
        return;
      }

      if (!isInsideToolbar) return;

      const focusable = getFocusableInToolbar();
      if (focusable.length === 0) return;

      const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
      if (currentIndex === -1) return;

      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault();
        const nextIndex = (currentIndex + 1) % focusable.length;
        focusable[nextIndex].focus();
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        const prevIndex = (currentIndex - 1 + focusable.length) % focusable.length;
        focusable[prevIndex].focus();
      } else if (event.key === 'Home') {
        event.preventDefault();
        focusable[0].focus();
      } else if (event.key === 'End') {
        event.preventDefault();
        focusable[focusable.length - 1].focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedCount, onClearSelection, getFocusableInToolbar]);

  if (selectedCount === 0) return null;

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as StatusType;
    if (value && STATUS_OPTIONS.includes(value)) {
      onStatusUpdate(value);
      e.target.value = '';
    }
  };

  return (
    <div
      ref={toolbarRef}
      role="toolbar"
      aria-labelledby={countId}
      aria-label="Bulk milestone actions"
      className="sticky top-2 z-20 mb-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 shadow-md"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span
            id={countId}
            className="text-sm font-semibold text-blue-900"
            aria-live="polite"
            aria-atomic="true"
          >
            {selectedCount} of {totalCount} {selectedCount === 1 ? 'item' : 'items'} selected
          </span>
          <button
            ref={clearBtnRef}
            type="button"
            onClick={onClearSelection}
            aria-label="Clear selection"
            className={`rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 ${focusRingClass}`}
          >
            Clear
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <label
              htmlFor="bulk-status-select"
              className="sr-only"
            >
              Change status of selected milestones
            </label>
            <select
              ref={statusSelectRef}
              id="bulk-status-select"
              value=""
              onChange={handleStatusChange}
              aria-label="Change status of selected milestones"
              className={`rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 ${focusRingClass}`}
            >
              <option value="" disabled>
                Change status…
              </option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={onExport}
            aria-label={`Export ${selectedCount} selected ${selectedCount === 1 ? 'milestone' : 'milestones'}`}
            className={`rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-50 ${focusRingClass}`}
          >
            Export
          </button>

          <button
            type="button"
            onClick={onDelete}
            aria-label={`Delete ${selectedCount} selected ${selectedCount === 1 ? 'milestone' : 'milestones'}`}
            className={`rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 ${focusRingClass}`}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkActionToolbar;
