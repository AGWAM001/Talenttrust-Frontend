'use client';

/**
 * DialogsList
 *
 * Renders a filterable list of dialog records and exposes accessible CSV/JSON
 * export controls for the currently-visible (filtered) view.
 *
 * Export behaviour:
 *  - "Export CSV"  — serialises the filtered rows to RFC-4180-compliant CSV
 *    with safe field escaping (commas, quotes, newlines, formula injection)
 *    and triggers a client-side download. No server round-trip.
 *  - "Export JSON" — serialises the filtered rows to pretty-printed JSON and
 *    triggers a client-side download.
 *
 * Both controls are keyboard-operable and labelled for assistive technology.
 * An empty-view export guard disables the buttons when there is nothing to export.
 *
 * Each list item exposes an icon-only "Copy ID" button with a descriptive
 * aria-label so keyboard and assistive-technology users can copy the dialog ID
 * without having to select the code element manually. The button uses the
 * Clipboard API with a documented execCommand fallback and surfaces feedback
 * through the global toast system.
 */

import React, { useCallback, useState, useMemo } from 'react';
import {
  type DialogRecord,
  type DialogStatus,
  downloadDialogsCsv,
  downloadDialogsJson,
} from '@/lib/exportDialogs';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { useToast } from '@/components/toast/toast-provider';

export type { DialogRecord, DialogStatus };

// ---------------------------------------------------------------------------
// execCommandFallback — documented clipboard fallback for environments where
// navigator.clipboard is unavailable (e.g. non-HTTPS contexts, older browsers).
// ---------------------------------------------------------------------------

/**
 * Falls back to the deprecated `document.execCommand('copy')` API when the
 * Clipboard API is not available. Creates a temporary off-screen textarea,
 * selects its value, and invokes execCommand. The textarea is always removed
 * from the DOM regardless of success or failure.
 *
 * @param text - The string to copy to the clipboard.
 * @returns `true` if the execCommand succeeded; `false` otherwise.
 */
export function execCommandFallback(text: string): boolean {
  if (typeof document === 'undefined') return false;

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.top = '-9999px';
  textarea.style.left = '-9999px';
  textarea.setAttribute('aria-hidden', 'true');
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  let success = false;
  try {
    success = document.execCommand('copy');
  } catch {
    // execCommand not supported — success remains false
  } finally {
    document.body.removeChild(textarea);
  }
  return success;
}

// ---------------------------------------------------------------------------
// CopyIdButton — icon-only button with aria-label for each dialog ID
// ---------------------------------------------------------------------------

interface CopyIdButtonProps {
  dialogId: string;
}

function CopyIdButton({ dialogId }: CopyIdButtonProps) {
  const { showSuccess, showError } = useToast();

  const { copied, copy } = useCopyToClipboard({
    onSuccess: () => {
      showSuccess({ title: `Copied "${dialogId}" to clipboard.` });
    },
    onError: () => {
      // Documented fallback: try execCommand when Clipboard API is unavailable
      const success = execCommandFallback(dialogId);
      if (success) {
        showSuccess({ title: `Copied "${dialogId}" to clipboard.` });
      } else {
        showError({ title: `Failed to copy "${dialogId}". Please copy it manually.` });
      }
    },
  });

  const handleClick = useCallback(() => {
    copy(dialogId);
  }, [copy, dialogId]);

  return (
    <button
      type="button"
      aria-label={`Copy dialog ID ${dialogId} to clipboard`}
      aria-pressed={copied}
      data-testid={`copy-dialog-id-btn-${dialogId}`}
      title="Copy ID to clipboard"
      onClick={handleClick}
      className={[
        'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono border',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-blue-500',
        copied
          ? 'bg-green-50 border-green-400 text-green-700'
          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50',
      ].join(' ')}
    >
      {copied ? (
        <>
          <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="none">
            <rect x="1" y="3" width="7" height="8" rx="1" stroke="currentColor" strokeWidth="1.2" />
            <path d="M4 1h6a1 1 0 0 1 1 1v8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          Copy ID
        </>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface DialogsListProps {
  /** The full list of dialog records to display and export. */
  dialogs: DialogRecord[];
  /** When true the loading skeleton is shown. */
  isLoading?: boolean;
  /** When provided the error state is rendered instead of the list. */
  error?: string | null;
}

// ---------------------------------------------------------------------------
// DialogsList
// ---------------------------------------------------------------------------

/**
 * Filterable dialogs list with accessible CSV/JSON export controls.
 *
 * States:
 *  - Loading   — shows an animated skeleton; all other UI is hidden.
 *  - Error     — shows an alert with the error message; all other UI is hidden.
 *  - Empty     — shows a contextual empty-state message after filtering.
 *  - Success   — shows the filtered list and export controls.
 *
 * States are mutually exclusive. Loading takes precedence over error.
 */
export const DialogsList = ({
  dialogs,
  isLoading = false,
  error = null,
}: DialogsListProps) => {
  const [filter, setFilter] = useState<DialogStatus>('All');

  const filteredDialogs = useMemo(() => {
    if (filter === 'All') return dialogs;
    return dialogs.filter((d) => d.status === filter);
  }, [dialogs, filter]);

  // ── Loading state ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div
        aria-busy="true"
        aria-label="Loading dialogs…"
        data-testid="dialogs-loading"
        className="flex flex-col gap-3 p-4 animate-pulse"
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-14 bg-gray-200 dark:bg-gray-700 rounded" />
        ))}
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div
        role="alert"
        data-testid="dialogs-error"
        className="p-4 text-red-700 bg-red-50 rounded"
      >
        <p>{error}</p>
      </div>
    );
  }

  const hasExportData = filteredDialogs.length > 0;

  return (
    <div>
      {/* Filter controls */}
      <div
        role="group"
        aria-label="Filter dialogs by status"
        className="flex gap-2 mb-4"
      >
        {(['All', 'Open', 'Pending', 'Closed'] as const).map((status) => (
          <button
            key={status}
            type="button"
            aria-pressed={filter === status}
            aria-label={`Filter dialogs by ${status} status`}
            onClick={() => setFilter(status)}
            className={[
              'px-3 py-1 rounded text-sm border',
              filter === status
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50',
            ].join(' ')}
          >
            {`Filter ${status}`}
          </button>
        ))}
      </div>

      {/* Export controls */}
      <div
        aria-label="Export dialogs"
        className="flex gap-2 mb-4"
        data-testid="dialogs-export-controls"
      >
        <button
          type="button"
          disabled={!hasExportData}
          aria-label="Export dialogs as CSV"
          data-testid="export-csv-btn"
          onClick={() => downloadDialogsCsv(filteredDialogs)}
          className={[
            'px-3 py-1 rounded text-sm border',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-blue-500',
            hasExportData
              ? 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed',
          ].join(' ')}
        >
          Export CSV
        </button>
        <button
          type="button"
          disabled={!hasExportData}
          aria-label="Export dialogs as JSON"
          data-testid="export-json-btn"
          onClick={() => downloadDialogsJson(filteredDialogs)}
          className={[
            'px-3 py-1 rounded text-sm border',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-blue-500',
            hasExportData
              ? 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed',
          ].join(' ')}
        >
          Export JSON
        </button>
      </div>

      {/* Empty state */}
      {filteredDialogs.length === 0 ? (
        <div
          data-testid="dialogs-empty"
          className="py-12 text-center text-gray-500"
        >
          <p className="text-lg font-medium">No dialogs found</p>
          <p className="text-sm mt-1">
            {filter === 'All'
              ? 'There are no dialogs to display.'
              : `No dialogs match the "${filter}" filter.`}
          </p>
        </div>
      ) : (
        /* Success / list state */
        <ul
          data-testid="dialogs-list"
          className="divide-y divide-gray-100"
        >
          {filteredDialogs.map((d) => (
            <li
              key={d.id}
              data-testid={`dialog-item-${d.id}`}
              className="py-3 flex items-start justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{d.title}</p>
                <p className="text-sm text-gray-500 truncate">{d.description}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span
                  data-testid={`dialog-status-${d.id}`}
                  className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700"
                >
                  {d.status}
                </span>
                <div className="flex items-center gap-1.5">
                  <code
                    data-testid={`dialog-id-${d.id}`}
                    className="text-xs text-gray-400 font-mono"
                  >
                    {d.id}
                  </code>
                  <CopyIdButton dialogId={d.id} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
