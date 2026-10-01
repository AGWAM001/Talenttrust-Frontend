import { useCallback, useEffect, useRef, useState } from 'react';
import { StatusType, statusColorMap, statusIconMap } from './StatusBadge';
import MilestoneRow from './milestones/MilestoneRow';
import { BulkActionToolbar } from './milestones/BulkActionToolbar';
import { ConfirmDialog } from './ConfirmDialog';
import { usePreferences } from '@/lib/preferences';
import { isDueSoon } from '@/lib/dueSoon';
import { findCurrencyMismatches, normalizeCurrencyCode } from '@/lib/currencyMismatch';
import { milestoneStatusTally } from '@/lib/milestoneStatusTally';

export type Milestone = {
  id: string;
  title: string;
  status: StatusType;
  payout: number;
  currency: string;
  dueDate?: string;
  /** Id of the parent `Contract` this milestone belongs to, when known. */
  contractId?: string;
  /**
   * Monotonically-increasing version counter used by the stale-overwrite
   * guard in the persistence layer. Starts at `1` for new milestones and
   * increments on each successful upsert. Callers reading from the
   * repository can pass the stored version back so `upsertMilestone` can
   * reject writes that would silently overwrite a newer version persisted
   * by another session tab.
   */
  version?: number;
  createdAt?: string;    
  updatedAt?: string;    
};

export const PAGE_SIZE_DEFAULT = 5;

export type MilestonesListProps = {
  milestones: Milestone[];
  contractCurrency?: string;
  onUpdateMilestone?: (id: string, patch: Partial<Milestone>) => boolean;
  pageSize?: number;
  /** Callback when the selection changes. Passes an array of selected milestone ids. */
  onSelectionChange?: (selectedIds: string[]) => void;
  /** Callback to export the selected milestones. */
  onBulkExport?: (selectedMilestones: Milestone[]) => void;
  /** Callback to delete selected milestones. Should return the number successfully deleted. */
  onBulkDelete?: (selectedIds: string[]) => number;
  /** Callback to update the status of selected milestones. Should return the number successfully updated. */
  onBulkStatusUpdate?: (selectedIds: string[], status: StatusType) => number;
};

export const REMINDER_WINDOW_DAYS = 7;

const MilestonesList = ({
  milestones,
  contractCurrency,
  onUpdateMilestone,
  pageSize = PAGE_SIZE_DEFAULT,
  onSelectionChange,
  onBulkExport,
  onBulkDelete,
  onBulkStatusUpdate,
}: MilestonesListProps) => {
  const { formatAmount, preferences, updatePreference } = usePreferences();
  const [displayCount, setDisplayCount] = useState(pageSize);
  const [isDensityAnnounced, setIsDensityAnnounced] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  /**
   * Tracks which row is currently in inline edit mode. Mutually exclusive —
   * opening one row closes any other row that was being edited so we never
   * have two dirty unsaved edit states competing for focus or screen reader
   * output.
   */
  const [editingId, setEditingId] = useState<string | null>(null);
  /**
   * Set of selected milestone IDs for multi-select / bulk actions.
   */
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  /**
   * Screen-reader announcement text for selection changes.
   */
  const [selectionAnnouncement, setSelectionAnnouncement] = useState('');
  /**
   * Whether the delete confirmation dialog is open.
   */
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  /**
   * Polite live-region message conveyed to assistive technologies after a
   * save / save-failure. Cleared on the *next* save so repeated messages
   * are always announced (screen readers intentionally skip repeat strings).
   */
  const [announcement, setAnnouncement] = useState('');
  /**
   * We force-bump a key on the live region right before writing the message
   * so ATs re-announce identical strings ("Milestone saved.") on repeat.
   */
  const [announcementNonce, setAnnouncementNonce] = useState(0);

  const listContainerRef = useRef<HTMLDivElement>(null);

  /**
   * Roving-tabindex state for the milestone list (WAI-ARIA roving tabindex).
   * Exactly one row — the "active" row — is in the tab order at a time: it
   * carries tabIndex={0} while every other row carries tabIndex={-1}. Arrow
   * keys move the active row, Home/End jump to the first/last row, and
   * Enter/Space activate the focused row (open its inline edit form).
   */
  const [activeIndex, setActiveIndex] = useState(0);
  /** Mirror of `activeIndex` for use inside effects without stale closures. */
  const activeIndexRef = useRef(0);
  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);
  /**
   * The last element that held focus inside the list. Lets the list-change
   * sync effect distinguish "focus was in the list and its element was
   * removed" (restore focus to the active row) from "focus was never in the
   * list" (must NOT move focus).
   */
  const lastFocusedInListRef = useRef<HTMLElement | null>(null);

  const isCompact = preferences.milestonesDensity === 'compact';

  // Reset to the first page whenever the underlying list or page size
  // changes (e.g. a status filter narrows the results).
  useEffect(() => {
    setDisplayCount(pageSize);
  }, [milestones, pageSize]);

  const today = new Date();
  const visibleMilestones = milestones.slice(0, displayCount);
  const hasMore = displayCount < milestones.length;

  // Track the last element focused inside the list so the sync effect below
  // can tell "the focused row was removed" apart from "focus never entered
  // the list" (which must not move focus). See `lastFocusedInListRef`.
  useEffect(() => {
    const container = listContainerRef.current;
    if (!container) return;
    const handleFocusIn = () => {
      lastFocusedInListRef.current = document.activeElement as HTMLElement | null;
    };
    const handleFocusOut = (event: FocusEvent) => {
      const next = event.relatedTarget as Node | null;
      // Only forget the tracked element when focus moved to a real element
      // outside the list. A null relatedTarget means the focused element was
      // removed or focus was lost — keep the ref so the sync effect can
      // restore focus (it re-checks via `isConnected`).
      if (next && !container.contains(next)) {
        lastFocusedInListRef.current = null;
      }
    };
    container.addEventListener('focusin', handleFocusIn);
    container.addEventListener('focusout', handleFocusOut);
    return () => {
      container.removeEventListener('focusin', handleFocusIn);
      container.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  // Keep the roving active index valid when the list changes (status filter,
  // pagination, bulk delete) and, if the element that had focus inside the
  // list was removed by the change, move focus to the clamped active row so
  // keyboard users don't fall out of the list to <body>.
  useEffect(() => {
    const count = visibleMilestones.length;
    if (count === 0) {
      setActiveIndex(0);
      return;
    }
    setActiveIndex((prev) => Math.min(prev, count - 1));
    const lastFocused = lastFocusedInListRef.current;
    if (lastFocused && !lastFocused.isConnected) {
      const rows = listContainerRef.current?.querySelectorAll<HTMLElement>(
        '[data-milestone-row]',
      );
      const targetIndex = Math.min(activeIndexRef.current, count - 1);
      rows?.[targetIndex]?.focus();
    }
  }, [visibleMilestones.length]);

  const mismatchedMilestoneIds = contractCurrency
    ? new Set(findCurrencyMismatches(contractCurrency, milestones))
    : new Set<string>();

  const mismatchedMilestones = milestones.filter((milestone) =>
    mismatchedMilestoneIds.has(milestone.id),
  );

  const mismatchCurrencies = Array.from(
    new Set(mismatchedMilestones.map((milestone) => normalizeCurrencyCode(milestone.currency))),
  ).sort();

  const normalizedContractCurrency = contractCurrency
    ? normalizeCurrencyCode(contractCurrency)
    : undefined;

  const tallies = milestoneStatusTally(milestones);

  // Filter due-soon milestones:
  // - Exclude terminal statuses: Paid, Completed
  // - Check if due date is within REMINDER_WINDOW_DAYS
  const dueSoonMilestones = milestones.filter(
    (m) =>
      m.status !== 'Paid' &&
      m.status !== 'Completed' &&
      isDueSoon(m.dueDate, today, REMINDER_WINDOW_DAYS),
  );

  const showBanner = dueSoonMilestones.length > 0 && !isDismissed;

  const handleToggleDensity = () => {
    const next: 'comfortable' | 'compact' = isCompact ? 'comfortable' : 'compact';
    updatePreference('milestonesDensity', next);
    setIsDensityAnnounced(true);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    // Programmatically shift focus to the list container to avoid focus loss (WCAG 2.1.1)
    listContainerRef.current?.focus();
  };

  const pushAnnouncement = useCallback((message: string) => {
    setAnnouncement('');
    // Bump the nonce on the wrapper span so a same-message repeat still
    // announces (some SRs dedupe on identical text + key).
    setAnnouncementNonce((n) => n + 1);
    // Defer the actual write so React mounts a fresh text node first.
    requestAnimationFrame(() => setAnnouncement(message));
  }, []);

  const handleSave = useCallback(
    (id: string, patch: Partial<Milestone>) => {
      const ok = onUpdateMilestone ? onUpdateMilestone(id, patch) : true;
      if (ok) {
        setEditingId(null);
        // The row component also announces via `onAnnounce`. We deliberately
        // re-announce here so an `onUpdateMilestone` that returns `true`
        // still resolves to a "saved" status even if the row's local
        // announcer was bypassed (e.g. parent owns the milestone copy).
      } else {
        pushAnnouncement('Failed to save milestone.');
      }
    },
    [onUpdateMilestone, pushAnnouncement],
  );

  const handleCancel = useCallback(() => {
    setEditingId(null);
    setAnnouncement('');
  }, []);

  const prevMilestonesRef = useRef(milestones);
  useEffect(() => {
    if (editingId && prevMilestonesRef.current !== milestones) {
      setEditingId(null);
    }
    prevMilestonesRef.current = milestones;
  }, [milestones, editingId]);

  // --------------------------------------------------------------------------
  // Multi-select handlers
  // --------------------------------------------------------------------------

  const allSelected = milestones.length > 0 && selectedIds.size === milestones.length;
  const hasSelection = selectedIds.size > 0;

  const announceSelection = useCallback((ids: Set<string>) => {
    const count = ids.size;
    if (count === 0) {
      requestAnimationFrame(() => setSelectionAnnouncement('Selection cleared'));
    } else {
      requestAnimationFrame(() =>
        setSelectionAnnouncement(`${count} ${count === 1 ? 'milestone' : 'milestones'} selected`),
      );
    }
  }, []);

  const handleToggleSelect = useCallback(
    (id: string) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        announceSelection(next);
        onSelectionChange?.(Array.from(next));
        return next;
      });
    },
    [onSelectionChange, announceSelection],
  );

  const handleToggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === milestones.length) {
        announceSelection(new Set());
        onSelectionChange?.([]);
        return new Set();
      }
      const all = new Set(milestones.map((m) => m.id));
      announceSelection(all);
      onSelectionChange?.(Array.from(all));
      return all;
    });
  }, [milestones, onSelectionChange, announceSelection]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
    announceSelection(new Set());
    onSelectionChange?.([]);
  }, [onSelectionChange, announceSelection]);

  const handleBulkExport = useCallback(() => {
    const selected = milestones.filter((m) => selectedIds.has(m.id));
    onBulkExport?.(selected);
  }, [milestones, selectedIds, onBulkExport]);

  const handleBulkStatusUpdate = useCallback(
    (status: StatusType) => {
      const ids = Array.from(selectedIds);
      onBulkStatusUpdate?.(ids, status);
      setSelectedIds(new Set());
      onSelectionChange?.([]);
    },
    [selectedIds, onBulkStatusUpdate, onSelectionChange],
  );

  const handleDeleteConfirm = useCallback(() => {
    const ids = Array.from(selectedIds);
    onBulkDelete?.(ids);
    setShowDeleteDialog(false);
    setSelectedIds(new Set());
    onSelectionChange?.([]);
  }, [selectedIds, onBulkDelete, onSelectionChange]);

  const isIndeterminate = hasSelection && !allSelected;

  // --------------------------------------------------------------------------
  // Roving-tabindex keyboard navigation
  // --------------------------------------------------------------------------

  const focusRowAtIndex = (index: number) => {
    const rows = listContainerRef.current?.querySelectorAll<HTMLElement>(
      '[data-milestone-row]',
    );
    rows?.[index]?.focus();
  };

  /**
   * Handles the list's roving-tabindex keys via event delegation on the
   * scroll region. Key events are only intercepted when the event target IS
   * a milestone row element (identified via `data-milestone-row`), so inner
   * controls keep their native behaviour: Space still toggles a focused
   * checkbox, arrows still move the caret inside edit-form fields, and the
   * region itself still scrolls with arrow keys when focused.
   *
   * - ArrowDown / ArrowUp  -> move focus to the next / previous row
   * - Home / End           -> jump to the first / last row
   * - Enter / Space        -> activate the focused row (open edit mode)
   */
  const handleListKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const row = target.closest<HTMLElement>('[data-milestone-row]');
    if (!row || row !== target) return;

    const currentIndex = Number(row.dataset.rowIndex);
    const lastIndex = visibleMilestones.length - 1;
    if (Number.isNaN(currentIndex) || lastIndex < 0) return;

    if (event.key === 'Enter' || event.key === ' ') {
      // Activate the focused row — the same action as clicking its Edit
      // button.
      event.preventDefault();
      const milestone = visibleMilestones[currentIndex];
      if (milestone) setEditingId(milestone.id);
      return;
    }

    let nextIndex: number | null = null;
    if (event.key === 'ArrowDown') {
      nextIndex = Math.min(currentIndex + 1, lastIndex);
    } else if (event.key === 'ArrowUp') {
      nextIndex = Math.max(currentIndex - 1, 0);
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = lastIndex;
    }
    if (nextIndex === null) return;

    // Consume the key so the page / scroll region doesn't also scroll.
    event.preventDefault();
    if (nextIndex === currentIndex) return;
    setActiveIndex(nextIndex);
    focusRowAtIndex(nextIndex);
  };

  return (
    <section aria-labelledby="milestones-title" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <h2 id="milestones-title" className="text-xl font-semibold text-slate-900">
          Milestones
        </h2>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleToggleDensity}
            aria-pressed={isCompact}
            aria-label={isCompact ? 'Switch to comfortable density' : 'Switch to compact density'}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-slate-400 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
          >
            <svg
              aria-hidden="true"
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              {isCompact ? (
                <>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16" />
                </>
              ) : (
                <>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </>
              )}
            </svg>
            {isCompact ? 'Compact' : 'Comfortable'}
          </button>
          <span id="milestones-count" className="text-sm text-slate-500">{milestones.length} total</span>
        </div>
      </div>

      {/* aria-live region: announces density change to screen readers */}
      <span
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      >
        {isDensityAnnounced ? `Milestones density set to ${isCompact ? 'compact' : 'comfortable'}` : ''}
      </span>

      {tallies.length > 0 && (
        <div
          role="list"
          aria-label="Milestone status summary"
          className={`flex flex-wrap gap-2 ${isCompact ? 'mt-2' : 'mt-4'}`}
        >
          {tallies.map(({ status, count }) => (
            <span
              key={status}
              role="listitem"
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${statusColorMap[status]}`}
            >
              <span aria-hidden="true">{statusIconMap[status]}</span>
              {status}
              <span className="ml-0.5 rounded-full bg-white/40 px-1.5 py-0.5 text-[10px] font-bold leading-none">
                {count}
              </span>
            </span>
          ))}
        </div>
      )}

      {normalizedContractCurrency && mismatchedMilestones.length > 0 ? (
        <div
          role="alert"
          className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
        >
          <p className="font-semibold">
            {mismatchedMilestones.length}{' '}
            {mismatchedMilestones.length === 1 ? 'milestone uses' : 'milestones use'}{' '}
            {mismatchCurrencies.join(', ')} instead of {normalizedContractCurrency}.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {mismatchedMilestones.map((milestone) => (
              <li key={milestone.id}>
                {milestone.title}: {formatAmount(milestone.payout, milestone.currency)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {showBanner && (
        <div
          role="status"
          className="mt-6 flex items-start gap-3 rounded-3xl border border-amber-200 bg-amber-50/50 p-4 text-amber-900 shadow-sm backdrop-blur-sm dark:border-amber-500/20 dark:bg-amber-500/5 dark:text-amber-200"
        >
          <div className="flex-1">
            <p className="font-semibold text-sm">
              {dueSoonMilestones.length} {dueSoonMilestones.length === 1 ? 'milestone is' : 'milestones are'} due within {REMINDER_WINDOW_DAYS} days
            </p>
            <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-amber-800 dark:text-amber-300">
              {dueSoonMilestones.map((m, idx) => (
                <li key={m.id} className="flex items-center gap-1.5">
                  {idx > 0 && <span className="text-amber-400 select-none" aria-hidden="true">•</span>}
                  <a
                    href={`#milestone-${m.id}`}
                    className="font-medium underline hover:text-amber-950 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 rounded"
                  >
                    {m.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss reminder"
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-amber-600 hover:bg-amber-100 hover:text-amber-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1 dark:text-amber-400 dark:hover:bg-amber-500/10 dark:hover:text-amber-200 transition-colors"
          >
            <span aria-hidden="true" className="text-lg leading-none">&times;</span>
          </button>
        </div>
      )}

      {/* Polite live region for save / save-failure announcements. The wrapping
          span's `key` (via `key={announcementNonce}`) is bumped on every
          write so screen readers re-announce identical strings. Controlled
          entirely from `MilestoneRow.onAnnounce` and the parent save handler. */}
      <span
        key={announcementNonce}
        data-testid="milestones-announcement"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </span>

      {/* Screen-reader announcement for selection changes */}
      <span
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-label="Milestone selection announcements"
        className="sr-only"
      >
        {selectionAnnouncement}
      </span>

      {/*
        Labelling (WCAG 1.3.1 / 4.1.2):
        aria-labelledby references both the visible "Milestones" heading (milestones-title) and the live
        count span (milestones-count) so AT users hear e.g. "Milestones, 3 total – region" rather than
        a disconnected static string. This keeps the accessible name in sync with both the heading and
        the rendered item count without duplicating text.

        Why the region is tabIndex={-1} (programmatically focusable only):
        The milestone rows own the list's single tab stop via roving tabindex (one active row has
        tabIndex={0}, every other row tabIndex={-1}), so the scroll container itself must stay out of
        the natural tab order — otherwise the list would have two tab stops and "Tab enters the list at
        one item" would be violated. It remains focusable programmatically so the due-soon banner
        dismiss flow (WCAG 2.4.3) can move focus into the list, and arrow keys still scroll it when it
        is focused.

        Why tabIndex is always applied when the list is populated:
        1. Consistency between SSR and client hydration avoids layout/hydration shifts.
        2. Testability in JSDOM where clientHeight/scrollHeight are always zero.
      */}
      {milestones.length > 0 && (
        <div
          role="group"
          aria-label="Milestone selection controls"
          className={`flex items-center ${isCompact ? 'mt-2' : 'mt-4'}`}
        >
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = isIndeterminate;
              }}
              onChange={handleToggleSelectAll}
              aria-checked={isIndeterminate ? 'mixed' : allSelected}
              aria-label={
                allSelected
                  ? 'Deselect all milestones'
                  : 'Select all milestones'
              }
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span>{allSelected ? 'Deselect all' : 'Select all'}</span>
          </label>
        </div>
      )}

      <BulkActionToolbar
        selectedCount={selectedIds.size}
        totalCount={milestones.length}
        onClearSelection={handleClearSelection}
        onExport={handleBulkExport}
        onStatusUpdate={handleBulkStatusUpdate}
        onDelete={() => setShowDeleteDialog(true)}
      />

      <ConfirmDialog
        isOpen={showDeleteDialog}
        title={`Delete ${selectedIds.size} ${selectedIds.size === 1 ? 'milestone' : 'milestones'}?`}
        description={`Are you sure you want to delete ${selectedIds.size} selected ${selectedIds.size === 1 ? 'milestone' : 'milestones'}? This action cannot be undone.`}
        confirmLabel={`Delete ${selectedIds.size} ${selectedIds.size === 1 ? 'item' : 'items'}`}
        tone="destructive"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteDialog(false)}
      />

      <div
        ref={listContainerRef}
        role={milestones.length > 0 ? 'region' : undefined}
        aria-labelledby={milestones.length > 0 ? 'milestones-title milestones-count' : undefined}
        tabIndex={milestones.length > 0 ? -1 : undefined}
        onKeyDown={handleListKeyDown}
        className={`max-h-[calc(100vh-260px)] overflow-y-auto pr-2 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 ${isCompact ? 'mt-4 space-y-2' : 'mt-6 space-y-4'}`}
      >
        {visibleMilestones.map((milestone, index) => (
          <MilestoneRow
            key={milestone.id}
            milestone={milestone}
            rowIndex={index}
            tabIndex={index === activeIndex ? 0 : -1}
            isSelected={selectedIds.has(milestone.id)}
            onToggleSelect={handleToggleSelect}
            isEditing={editingId === milestone.id}
            onRequestEdit={() => {
              setEditingId(milestone.id);
              // Interacting with a row (clicking Edit) makes it the active
              // roving row so focus stays consistent after save/cancel.
              setActiveIndex(index);
            }}
            onSave={handleSave}
            onCancel={handleCancel}
            onAnnounce={pushAnnouncement}
          />
        ))}
        {hasMore && (
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={() => setDisplayCount((prev) => Math.min(prev + pageSize, milestones.length))}
              data-testid="load-more-btn"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              Load More ({milestones.length - displayCount} remaining)
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default MilestonesList;
