import React, { useState, useMemo, useCallback } from 'react';
import { Skeleton } from './Skeleton';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { useToast } from '@/components/toast/toast-provider';
import { exportData } from '@/utils/export';

export type FormStatus = 'All' | 'Draft' | 'Published';

export interface Form {
  id: string;
  title: string;
  status: FormStatus;
}

export interface FormsListProps {
  forms: Form[];
  /** When true the loading skeleton is shown. */
  isLoading?: boolean;
  /** When provided the error state is rendered. */
  error?: string | null;
}

interface CopyIdButtonProps {
  formId: string;
}

function CopyIdButton({ formId }: CopyIdButtonProps) {
  const { showSuccess, showError } = useToast();

  const { copied, copy } = useCopyToClipboard({
    onSuccess: () => {
      showSuccess({ title: `Copied "${formId}" to clipboard.` });
    },
    onError: () => {
      const success = execCommandFallback(formId);
      if (success) {
        showSuccess({ title: `Copied "${formId}" to clipboard.` });
      } else {
        showError({ title: `Failed to copy "${formId}". Please copy it manually.` });
      }
    },
  });

  const handleClick = useCallback(() => {
    copy(formId);
  }, [copy, formId]);

  return (
    <button
      type="button"
      aria-label={`Copy id ${formId}`}
      aria-pressed={copied}
      data-testid={`copy-id-${formId}`}
      onClick={handleClick}
      className={[
        'inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-mono border',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-blue-500',
        copied
          ? 'bg-green-50 border-green-400 text-green-700'
          : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50',
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
          Copy
        </>
      )}
    </button>
  );
}

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

export const FormsList = ({ forms, isLoading = false, error = null }: FormsListProps) => {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<FormStatus>('All');
  const pageSize = 10;

  const filteredForms = useMemo(() => {
    if (filter === 'All') return forms;
    return forms.filter((f) => f.status === filter);
  }, [forms, filter]);

  const handleExport = (format: 'csv' | 'json') => {
    exportData(filteredForms as unknown as Record<string, unknown>[], 'forms_export', format);
  };

  const displayedForms = filteredForms.slice(0, page * pageSize);
  const hasMore = displayedForms.length < filteredForms.length;

  if (isLoading) {
    return (
      <div>
        <div
          role="status"
          aria-label="Loading forms"
          aria-live="polite"
          aria-busy="true"
          data-testid="forms-loading"
        >
          {error ? (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
          {!error ? (
            <>
              <div className="mb-4 flex flex-wrap gap-2" aria-hidden="true">
                <Skeleton width="w-24" height="h-9" rounded="rounded-lg" />
                <Skeleton width="w-24" height="h-9" rounded="rounded-lg" />
                <Skeleton width="w-28" height="h-9" rounded="rounded-lg" />
              </div>
              <ul data-testid="forms-list-skeleton" aria-hidden="true" className="space-y-2">
                {Array.from({ length: 10 }, (_, index) => (
                  <li key={`skeleton-${index}`} data-testid="forms-skeleton-row" className="py-2">
                    <Skeleton width="w-full" height="h-5" rounded="rounded-md" className="max-w-[18rem]" />
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          <span className="sr-only">Loading forms</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" data-testid="forms-error" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div role="group" aria-label="Filter forms by status" className="flex gap-2">
          <button type="button" onClick={() => { setFilter('All'); setPage(1); }}>Filter All</button>
          <button type="button" onClick={() => { setFilter('Draft'); setPage(1); }}>Filter Draft</button>
          <button type="button" onClick={() => { setFilter('Published'); setPage(1); }}>Filter Published</button>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            aria-label="Export forms as CSV"
            data-testid="export-csv-button"
            onClick={() => handleExport('csv')}
            disabled={filteredForms.length === 0}
            className="px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Export CSV
          </button>
          <button
            type="button"
            aria-label="Export forms as JSON"
            data-testid="export-json-button"
            onClick={() => handleExport('json')}
            disabled={filteredForms.length === 0}
            className="px-3 py-1 text-xs font-medium bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
          >
            Export JSON
          </button>
        </div>
      </div>

      {filteredForms.length === 0 ? (
        <div data-testid="forms-empty" className="py-12 text-center text-gray-500">
          <p className="text-lg font-medium">No forms found</p>
          <p className="text-sm mt-1">
            {filter === 'All'
              ? 'There are no forms to display.'
              : `No forms match the "${filter}" filter.`}
          </p>
        </div>
      ) : (
        <>
          <ul data-testid="forms-list">
            {displayedForms.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 py-2">
                <span>{f.title}</span>
                <span className="flex items-center gap-2">
                  <code
                    className="text-xs text-gray-500 font-mono"
                    data-testid={`form-id-${f.id}`}
                  >
                    {f.id}
                  </code>
                  <CopyIdButton formId={f.id} />
                </span>
              </li>
            ))}
          </ul>
          {hasMore && (
            <button type="button" onClick={() => setPage((p) => p + 1)}>Load More</button>
          )}
          {!hasMore && displayedForms.length > 0 && <div>End of list</div>}
        </>
      )}
    </div>
  );
};