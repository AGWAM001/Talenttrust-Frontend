'use client';

import React, { useRef } from 'react';
import { useToast } from '@/components/toast/toast-provider';

interface BulkActionToolbarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onDelete: () => void;
  onExport: () => void;
  isOpen: boolean;
}

/**
 * BulkActionToolbar
 *
 * Displays a toolbar with bulk action options when contracts are selected.
 * Provides keyboard accessible controls for select-all, clear, delete, and export.
 */
export const BulkActionToolbar: React.FC<BulkActionToolbarProps> = ({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onDelete,
  onExport,
  isOpen,
}) => {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const { showSuccess, showError } = useToast();

  if (!isOpen) {
    return null;
  }

  /**
   * Handles delete action with confirmation and announcement
   */
  const handleDelete = () => {
    const message = `Delete ${selectedCount} contract${selectedCount !== 1 ? 's' : ''}?`;
    const confirmDelete = window.confirm(message);
    
    if (confirmDelete) {
      onDelete();
      showSuccess({
        title: `Successfully deleted ${selectedCount} contract${selectedCount !== 1 ? 's' : ''}.`,
      });
    }
  };

  /**
   * Handles export action with confirmation
   */
  const handleExport = () => {
    try {
      onExport();
      showSuccess({
        title: `Successfully exported ${selectedCount} contract${selectedCount !== 1 ? 's' : ''}.`,
      });
    } catch (_error) {
      showError({
        title: 'Failed to export contracts. Please try again.',
      });
    }
  };

  return (
    <div
      ref={toolbarRef}
      role="region"
      aria-label="Bulk actions toolbar"
      aria-live="polite"
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg"
    >
      <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
        {/* Selection info */}
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-slate-900">
            {selectedCount} of {totalCount} selected
          </span>
          <span className="text-xs text-slate-500">
            {totalCount - selectedCount} remaining
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          {/* Select All button */}
          <button
            type="button"
            onClick={onSelectAll}
            className="px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 transition"
            aria-label={`Select all ${totalCount} contracts`}
          >
            Select All
          </button>

          {/* Clear selection button */}
          <button
            type="button"
            onClick={onClearSelection}
            className="px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 transition"
            aria-label="Clear selection"
          >
            Clear
          </button>

          {/* Export button */}
          <button
            type="button"
            onClick={handleExport}
            disabled={selectedCount === 0}
            className="px-3 py-2 text-sm font-medium text-slate-700 bg-blue-100 rounded-lg hover:bg-blue-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={`Export ${selectedCount} selected contracts`}
          >
            Export
          </button>

          {/* Delete button */}
          <button
            type="button"
            onClick={handleDelete}
            disabled={selectedCount === 0}
            className="px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={`Delete ${selectedCount} selected contracts`}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkActionToolbar;
