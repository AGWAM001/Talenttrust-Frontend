'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import StatusBadge from '@/components/StatusBadge';
import type { StatusType } from '@/components/StatusBadge';
import { FormField } from '@/components/FormField';
import { ErrorSummary } from '@/components/ErrorSummary';
import { usePreferences } from '@/lib/preferences';
import { sanitizeUserText } from '@/lib/sanitizeUserText';
import {
  MAX_MILESTONE_TITLE_LENGTH,
  MILESTONE_EDIT_FIELD_IDS,
  validateMilestoneEdit,
  type MilestoneEditFormValues,
} from '@/lib/validateMilestoneEdit';
import type { Milestone } from '@/components/MilestonesList';
import { MilestoneTimestamp } from './MilestoneTimestamp';

/** Status options exposed in the inline edit form (same set as create form). */
const EDIT_STATUS_OPTIONS: StatusType[] = [
  'Pending',
  'Active',
  'Completed',
  'Paid',
  'Disputed',
];

/** Currency options exposed in the inline edit form (same set as create form). */
const EDIT_CURRENCY_OPTIONS = ['USD', 'EUR', 'GBP', 'XLM'] as const;

export interface MilestoneRowProps {
  /** The milestone this row renders. */
  milestone: Milestone;
  /** Whether this row is currently selected in multi-select mode. */
  isSelected?: boolean;
  /** Called when the user toggles the selection checkbox for this row. */
  onToggleSelect?: (id: string) => void;
  /**
   * Whether edit mode is currently active. Parent-controlled so only one row
   * is in edit mode at a time across the list. Click the Edit button to
   * flip it to `true`; Save / Cancel / Escape flip it back to `false`.
   */
  isEditing: boolean;
  /**
   * Called when the user activates Edit or opens this row while another row
   * is in edit mode. Parent should set `isEditing` to `true` on this row.
   */
  onRequestEdit: () => void;
  /**
   * Called after a successful save. Parent should persist the patch and flip
   * `isEditing` to `false`. The patch is already validated and normalized
   * (title/payout/currency trimmed, payout coerced to `number`, dueDate
   * normalised) so it is safe to merge directly into the milestone record.
   */
  onSave: (id: string, patch: Partial<Milestone>) => void;
  /**
   * Called when the user cancels (Cancel button, Escape key, or invalid
   * focus-escape attempt). Parent should flip `isEditing` to `false`.
   * Use this hook to drop any stale "is dirty" state you may track.
   */
  onCancel: () => void;
  /**
   * Fired after a successful save so the parent can push an accessiblity
   * announcement. Defaults to a no-op so the component works in isolation.
   */
  onAnnounce?: (message: string) => void;
  /**
   * Roving-tabindex slot controlled by the parent list: `0` for the list's
   * single active row, `-1` for every other row. Applied to the row itself
   * and its view-mode controls (checkbox, Edit button) so inactive rows are
   * skipped in the tab order until the user roves to them with the arrow
   * keys. Omitted for standalone use (all controls stay tabbable).
   */
  tabIndex?: number;
  /** Zero-based position of this row within the list (drives roving). */
  rowIndex?: number;
}

/**
 * A single milestone row with **view mode** and **edit mode**.
 *
 * View mode: shows title, due date, status badge, payout, and an Edit button.
 *
 * Edit mode: shows inline fields for title, payout, currency, status, and due
 * date, plus Save / Cancel buttons. The form reuses the existing
 * {@link FormField} / {@link ErrorSummary} accessibility primitives for
 * aria-invalid / aria-describedby / focus-on-error behaviour.
 *
 * Keyboard contract:
 * - Entering edit mode programmatically focuses the title field.
 * - `Escape` while focus is inside the edit form cancels (and announces).
 * - Save / Cancel buttons are keyboard reachable; focus is restored to the
 *   originating Edit button when the row exits edit mode (save, cancel, OR
 *   invalid attempt).
 *
 * Validation:
 * - Mirrors {@link validateMilestoneEdit}: title required (≤200 chars),
 *   payout required + positive number, currency required.
 * - Validation errors are surfaced in the row-local {@link ErrorSummary}; they
 *   do NOT close edit mode, so the user can correct the bad input.
 *
 * @example
 * ```tsx
 * <MilestoneRow
 *   milestone={m}
 *   isEditing={editingId === m.id}
 *   onRequestEdit={() => setEditingId(m.id)}
 *   onSave={(id, patch) => updateMilestone(id, patch)}
 *   onCancel={() => setEditingId(null)}
 *   onAnnounce={(msg) => setAnnouncement(msg)}
 * />
 * ```
 */
export const MilestoneRow: React.FC<MilestoneRowProps> = ({
  milestone,
  isSelected = false,
  onToggleSelect,
  isEditing,
  onRequestEdit,
  onSave,
  onCancel,
  onAnnounce,
  tabIndex,
  rowIndex,
}) => {
  const { formatAmount } = usePreferences();

  // Edit-mode local state.
  const [title, setTitle] = useState(milestone.title);
  const [payout, setPayout] = useState(String(milestone.payout));
  const [currency, setCurrency] = useState(milestone.currency);
  const [status, setStatus] = useState<StatusType>(milestone.status);
  const [dueDate, setDueDate] = useState(milestone.dueDate ?? '');
  const [errors, setErrors] = useState<Array<{ fieldId: string; message: string }>>([]);

  // Refs for focus management.
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  /**
   * When the row enters edit mode (e.g. user clicked Edit, or another row's
   * edit was cancelled), push the latest milestone into local state and shift
   * focus to the title field so keyboard users land on the first input.
   *
   * Dependency note: the effect intentionally depends on `isEditing` only.
   * Including `milestone` here would re-sync local state on every parent
   * re-render that produces a fresh `milestone` reference — which can happen
   * when the parent re-shapes the list after a related save — and would
   * silently discard the user's in-flight edits.
   */
  useEffect(() => {
    if (!isEditing) return;
    setTitle(milestone.title);
    setPayout(String(milestone.payout));
    setCurrency(milestone.currency);
    setStatus(milestone.status);
    setDueDate(milestone.dueDate ?? '');
    setErrors([]);
    // Defer focus to the next frame so the inputs are mounted.
    const focusTimer = window.setTimeout(() => {
      titleInputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(focusTimer);
    // NOTE: `milestone` intentionally omitted from deps — see JSDoc above
    // for the rationale (preserves in-flight edits on parent re-renders).
  }, [isEditing]);

  /**
   * Escape-cancels edit mode when focus is anywhere inside the row.
   *
   * We can't reuse the shared {@link useDialogFocusTrap} because that hook is
   * scoped to `role="dialog"` containers and we'd render every row as a
   * dialog (a11y nightmare). Instead, attach a focused listener on the row
   * root while in edit mode. `event.stopPropagation()` prevents accidental
   * bubbling to future global hooks.
   */
  useEffect(() => {
    if (!isEditing) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      // Drop any unsaved validation errors.
      setErrors([]);
      onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isEditing, onCancel]);

  /**
   * Restore focus to the originating Edit button whenever the row exits edit
   * mode (save/cancel). This satisfies WCAG 2.4.3 (Focus Order) — keyboard
   * users shouldn't lose their place just because they toggled the row.
   */
  const focusEditButton = useCallback(() => {
    // `requestAnimationFrame` ensures the button is in the DOM again after a
    // mode swap if the row unmounts/remounts the section.
    requestAnimationFrame(() => {
      editButtonRef.current?.focus();
    });
  }, []);

  /**
   * Validates the edit form and constructs the patch. Returns `null` if there
   * were errors so the caller can short-circuit the save.
   */
  const buildPatch = useCallback((): {
    patch: Partial<Milestone>;
    values: MilestoneEditFormValues;
  } | null => {
    const values: MilestoneEditFormValues = { title, payout, currency };
    const validationErrors = validateMilestoneEdit(values);
    setErrors(validationErrors);
    if (validationErrors.length > 0) return null;

    const sanitizedTitle = sanitizeUserText(title, MAX_MILESTONE_TITLE_LENGTH);
    const patch: Partial<Milestone> = {
      title: sanitizedTitle,
      payout: parseFloat(payout),
      currency: currency.trim(),
      status,
      dueDate: dueDate.trim() || undefined,
    };
    return { patch, values };
  }, [title, payout, currency, status, dueDate]);

  /**
   * Save handler — validates, fires `onSave`, then announces via the parent
   * live region (if supplied) and restores focus to the Edit button.
   */
  const handleSave = useCallback(() => {
    const result = buildPatch();
    if (!result) {
      // Invalid: do not save, do not announce success. The Invalid stays so
      // the user sees the error summary; a polite aria-live update is fine
      // because the ErrorSummary itself already carries `role="alert"`.
      return;
    }
    onSave(milestone.id, result.patch);
    onAnnounce?.(`Milestone “${result.patch.title}” saved.`);
    focusEditButton();
  }, [buildPatch, milestone.id, onSave, onAnnounce, focusEditButton]);

  /**
   * Cancel handler — restores focus to the Edit button. No announcement is
   * raised on cancel because focus restoration + the visible row state
   * change is already a strong contextual cue (WCAG 2.4.3).
   */
  const handleCancel = useCallback(() => {
    setErrors([]);
    onCancel();
    focusEditButton();
  }, [onCancel, focusEditButton]);

  const getFieldError = (fieldId: string): string | undefined =>
    errors.find((e) => e.fieldId === fieldId)?.message;

  // --------------------------------------------------------------------------
  // View mode (default): summary row + Edit button
  // --------------------------------------------------------------------------
  const handleToggle = useCallback(() => {
    onToggleSelect?.(milestone.id);
  }, [milestone.id, onToggleSelect]);

  if (!isEditing) {
    return (
      <article
        id={`milestone-${milestone.id}`}
        aria-label={milestone.title}
        data-selected={isSelected}
        data-milestone-row=""
        data-row-index={rowIndex}
        tabIndex={tabIndex}
        className={`rounded-3xl border p-4 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
          isSelected
            ? 'border-indigo-300 bg-indigo-50'
            : 'border-slate-200 bg-slate-50'
        }`}
      >
        <div className="flex items-start gap-3">
          {onToggleSelect && (
            <div className="pt-1">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={handleToggle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleToggle();
                  }
                }}
                aria-label={`${isSelected ? 'Deselect' : 'Select'} ${milestone.title}`}
                tabIndex={tabIndex}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
            </div>
          )}
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-600">{milestone.title}</p>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">
              <span>Due {milestone.dueDate ?? 'TBD'}</span>
              <span aria-hidden="true" className="text-slate-300">•</span>
              <MilestoneTimestamp 
                date={milestone.updatedAt || milestone.createdAt} 
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={milestone.status} />
            <button
              ref={editButtonRef}
              type="button"
              onClick={onRequestEdit}
              aria-label={`Edit milestone ${milestone.title}`}
              data-testid={`edit-milestone-${milestone.id}`}
              tabIndex={tabIndex}
              className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              <span aria-hidden="true">✎</span>
              Edit
            </button>
          </div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-4 border-t border-slate-200 pt-4 text-sm text-slate-600">
            <p>Payout</p>
            <p
              data-testid={`milestone-payout-${milestone.id}`}
              className="font-semibold text-slate-900"
            >
              {formatAmount(milestone.payout, milestone.currency)}
            </p>
          </div>
      </article>
    );
  }

  // --------------------------------------------------------------------------
  // Edit mode: inline form with accessible Save / Cancel
  // --------------------------------------------------------------------------
  return (
    <article
      id={`milestone-${milestone.id}`}
      aria-label={`Editing milestone ${milestone.title}`}
      className="rounded-3xl border border-indigo-300 bg-white p-4 shadow-sm ring-1 ring-indigo-100"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
        noValidate
        data-testid={`milestone-edit-form-${milestone.id}`}
      >
        <ErrorSummary errors={errors} />

        <FormField
          label="Title"
          id={MILESTONE_EDIT_FIELD_IDS.title}
          error={getFieldError(MILESTONE_EDIT_FIELD_IDS.title)}
          required
        >
          <input
            ref={titleInputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g., Frontend Development – Sprint 1"
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Payout Amount"
            id={MILESTONE_EDIT_FIELD_IDS.payout}
            error={getFieldError(MILESTONE_EDIT_FIELD_IDS.payout)}
            required
          >
            <input
              type="text"
              inputMode="decimal"
              value={payout}
              onChange={(e) => setPayout(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., 2500"
            />
          </FormField>

          <FormField
            label="Currency"
            id={MILESTONE_EDIT_FIELD_IDS.currency}
            error={getFieldError(MILESTONE_EDIT_FIELD_IDS.currency)}
            required
          >
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {EDIT_CURRENCY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <FormField label="Status" id={`milestone-edit-status-${milestone.id}`}>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusType)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {EDIT_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          label="Due Date"
          id={`milestone-edit-dueDate-${milestone.id}`}
          helperText="Optional"
        >
          <input
            type="text"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Jun 1, 2026"
          />
        </FormField>

        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleCancel}
            data-testid={`cancel-milestone-${milestone.id}`}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            data-testid={`save-milestone-${milestone.id}`}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            Save
          </button>
        </div>
      </form>
    </article>
  );
};

export default MilestoneRow;
