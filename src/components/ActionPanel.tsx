'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { ConfirmDialog } from './ConfirmDialog';
import { DISPUTE_REASON_MAX_LENGTH, validateDisputeReason } from '@/lib/disputeReason';

/**
 * Defines the per-action screen-reader-only disabled reasons.
 * When a reason is provided for an action, the corresponding button is disabled,
 * and the reason text is rendered into a visually hidden `span` that is linked
 * to the button via `aria-describedby` (e.g., `id="action-panel-submitMilestone-reason"`).
 */
export type ActionPanelDisabledReasons = {
  /** Screen-reader description for why "Submit Milestone" is disabled. */
  submitMilestone?: string;
  /** Screen-reader description for why "Release Funds" is disabled. */
  releaseFunds?: string;
  /** Screen-reader description for why "Dispute" is disabled. */
  dispute?: string;
  /** Screen-reader description for why "View Summary" is disabled. */
  viewSummary?: string;
};

/**
 * Props for the ActionPanel component.
 */
export type ActionPanelProps = {
  /**
   * Current lifecycle status of the contract.
   * Drives which actions are visible and their order (mapped via `getActionButtons`).
   */
  status: 'Active' | 'Completed' | 'Disputed' | 'Pending';
  /** Callback triggered when the user initiates a milestone submission. */
  onSubmitMilestone?: () => void;
  /**
   * Callback triggered when the user confirms a dispute with a reason.
   * Receives the trimmed, non-empty reason string (max 500 chars).
   */
  onDispute?: (reason: string) => void;
  /** Callback triggered when the user releases funds to the freelancer. */
  onReleaseFunds?: () => void;
  /** Callback triggered to view the summary of a completed contract. */
  onViewSummary?: () => void;
  /**
   * Disables every visible action button globally and maps their `aria-describedby`
   * to a shared loading reason (`action-panel-loading-reason`). Use this while
   * fetching contract or wallet state.
   */
  isLoading?: boolean;
  /**
   * Render a `role="alert"` region above the actions to announce transient
   * errors (like network failures) to assistive technologies.
   */
  errorMessage?: string;
  /**
   * Per-action accessible reason for why a specific button is disabled.
   * Useful for wallet-gating, unmet conditions, or missing permissions.
   */
  disabledReasons?: ActionPanelDisabledReasons;
  /**
   * Chooses whether Dispute uses the newer inline reason form or the legacy
   * confirmation dialog expected by older page-level flows.
   */
  disputeFlow?: 'inline' | 'confirm';
  /**
   * When true, disables all mutation actions (submit, release, dispute) to prevent
   * unsafe changes while offline or when viewing stale cached data.
   */
  disableMutations?: boolean;
};

const LOADING_REASON = 'Action is disabled while contract data is loading.';
const LOADING_DESCRIPTION_ID = 'action-panel-loading-reason';

const DISPUTE_REASON_ERROR_ID = 'dispute-reason-error';
const DISPUTE_REASON_HINT_ID = 'dispute-reason-hint';
const DISPUTE_REASON_COUNTER_ID = 'dispute-reason-counter';
const DISPUTE_REASON_ASSERTIVE_THRESHOLD = 50;
const DISPUTE_WALLET_ERROR = 'Connect your wallet before submitting a dispute.';

const getActionButtons = (status: ActionPanelProps['status']) => {
  if (status === 'Active') return ['Submit Milestone', 'Release Funds', 'Dispute'];
  if (status === 'Pending') return ['Release Funds', 'Dispute'];
  if (status === 'Disputed') return ['Dispute'];
  return ['View Summary'];
};

type ConfirmAction = keyof typeof CONFIRM_COPY | null;

const CONFIRM_COPY = {
  submit: {
    title: 'Confirm Submit Milestone',
    description: 'Are you sure you want to submit this milestone for approval? This action cannot be undone.',
    confirmLabel: 'Submit Milestone',
  },
  release: {
    title: 'Confirm Release Funds',
    description: 'Are you sure you want to release funds? This action cannot be undone.',
    confirmLabel: 'Release Funds',
  },
  dispute: {
    title: 'Confirm Dispute',
    description: 'Are you sure you want to open a dispute for this contract? This action cannot be undone.',
    confirmLabel: 'Dispute',
  },
} as const;

const ActionPanel = ({
  status,
  onSubmitMilestone,
  onDispute,
  onReleaseFunds,
  onViewSummary,
  isLoading = false,
  errorMessage,
  disabledReasons,
  disputeFlow: _disputeFlow = 'inline',
  disableMutations = false,
}: ActionPanelProps) => {
  const actions = getActionButtons(status);
  const { address } = useWallet();
  const isWalletConnected = !!address;
  const noWalletMsg = 'Connect wallet to perform this action';
  const mutationsDisabledMsg = disableMutations ? 'Actions disabled while offline or viewing stale data' : undefined;
  const panelRef = useRef<HTMLElement | null>(null);

  const describedBy = (perActionId: string | undefined) =>
    isLoading ? LOADING_DESCRIPTION_ID : perActionId;
  const describedById = (key: keyof ActionPanelDisabledReasons) =>
    disabledReasons?.[key] ? `action-panel-${key}-reason` : undefined;

  const focusRingClass =
    'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-500';

  // Submit / Release confirmation dialog state.
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  /**
   * Holds a reference to the button that opened the confirmation dialog or the
   * dispute form. After closing, focus is restored here to satisfy WCAG 2.1
   * SC 3.2.2 and the APG dialog pattern.
   */
  const triggerElementRef = useRef<HTMLButtonElement | null>(null);

  const handleOpenConfirm = (
    action: Exclude<ConfirmAction, null>,
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    if (disableMutations) return;
    triggerElementRef.current = event.currentTarget;
    setConfirmAction(action);
  };

  const handleConfirm = () => {
    if (disableMutations) {
      setConfirmAction(null);
      return;
    }
    if (confirmAction === 'submit') {
      onSubmitMilestone?.();
    } else if (confirmAction === 'release') {
      onReleaseFunds?.();
    } else if (confirmAction === 'dispute') {
      onDispute?.('Dispute opened from action panel.');
    }
    setConfirmAction(null);
  };

  const handleCancel = () => {
    setConfirmAction(null);
  };

  // Inline dispute form state.
  const [disputeFormOpen, setDisputeFormOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeReasonError, setDisputeReasonError] = useState('');
  const [liveAnnouncement, setLiveAnnouncement] = useState('');
  const disputeTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const previousConfirmActionRef = useRef<ConfirmAction>(null);
  const disputeTriggerRef = useRef<HTMLButtonElement | null>(null);

  /** Opens the inline dispute form and moves focus to the textarea. */
  const handleOpenDisputeForm = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (disableMutations) return;
    triggerElementRef.current = event.currentTarget;
    disputeTriggerRef.current = event.currentTarget;
    setDisputeReason('');
    setDisputeReasonError('');
    setDisputeFormOpen(true);
  };

  const previousDisputeFormOpenRef = useRef(false);

  // Move focus into the textarea when the form becomes visible, or restore focus when it closes.
  useLayoutEffect(() => {
    if (disputeFormOpen) {
      disputeTextareaRef.current?.focus();
    } else if (previousDisputeFormOpenRef.current) {
      // Form was closed, restore focus to the button that opened it.
      const triggerButton = disputeTriggerRef.current;
      if (triggerButton && document.contains(triggerButton) && !triggerButton.disabled) {
        triggerButton.focus();
      } else {
        panelRef.current?.focus();
      }
    }
    previousDisputeFormOpenRef.current = disputeFormOpen;
  }, [disputeFormOpen]);

  // Manage debounced/throttled screen reader announcements for character count
  useEffect(() => {
    if (!disputeFormOpen) {
      setLiveAnnouncement('');
      return;
    }

    const remaining = DISPUTE_REASON_MAX_LENGTH - disputeReason.length;
    const announcement = `${disputeReason.length} of ${DISPUTE_REASON_MAX_LENGTH} characters`;

    const isBoundary = (chars: number) => {
      if (chars <= 0) return true;
      if (chars <= 10) return true;
      if (chars <= 50) return chars % 10 === 0;
      return chars % 50 === 0;
    };

    if (isBoundary(remaining)) {
      setLiveAnnouncement(announcement);
      return;
    }

    const timeoutId = setTimeout(() => {
      setLiveAnnouncement(announcement);
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [disputeReason, disputeFormOpen]);

  useLayoutEffect(() => {
    const wasDialogOpen = previousConfirmActionRef.current !== null;

    if (!wasDialogOpen || confirmAction !== null || isLoading) {
      previousConfirmActionRef.current = confirmAction;
      return;
    }

    const triggerButton = triggerElementRef.current;
    if (triggerButton && document.contains(triggerButton) && !triggerButton.disabled) {
      triggerButton.focus();
    } else {
      panelRef.current?.focus();
    }

    previousConfirmActionRef.current = confirmAction;
  }, [confirmAction, isLoading]);

  /** Closes the inline form and returns focus to the button that opened it. */
  const closeDisputeForm = () => {
    setDisputeFormOpen(false);
    setDisputeReason('');
    setDisputeReasonError('');
  };

  const handleDisputeReasonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    // Enforce hard max-length in the handler as a safety net in addition to
    // the maxLength attribute; silently truncate to avoid confusing the user
    // mid-keystroke (the character counter below communicates the limit).
    if (value.length <= DISPUTE_REASON_MAX_LENGTH) {
      setDisputeReason(value);
    }
    // Clear the validation error as soon as the user starts correcting input.
    if (disputeReasonError && value.trim().length > 0) {
      setDisputeReasonError('');
    }
  };

  /**
   * Validates and submits the dispute reason.
   *
   * Validation rules:
   *   1. Wallet must still be connected at submit time.
   *   2. Reason must not be empty / whitespace-only.
   *   3. Trimmed length must not exceed DISPUTE_REASON_MAX_LENGTH.
   *
   * On success the trimmed reason is forwarded to `onDispute` and the form
   * is closed; focus returns to the originating "Dispute" button.
   */
  const handleDisputeSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (disableMutations) {
      closeDisputeForm();
      return;
    }

    if (!isWalletConnected) {
      setDisputeReasonError(DISPUTE_WALLET_ERROR);
      disputeTextareaRef.current?.focus();
      return;
    }

    const validation = validateDisputeReason(disputeReason);
    if (!validation.valid) {
      setDisputeReasonError(validation.error || '');
      disputeTextareaRef.current?.focus();
      return;
    }

    onDispute?.(disputeReason.trim());
    closeDisputeForm();
  };

  const remainingChars = DISPUTE_REASON_MAX_LENGTH - disputeReason.length;
  const isOverLimit = disputeReason.length >= DISPUTE_REASON_MAX_LENGTH;

  return (
    <aside
      ref={panelRef}
      tabIndex={-1}
      aria-labelledby="action-panel-heading"
      className="sticky top-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="mb-6">
        <p className="text-sm text-slate-500 uppercase tracking-[0.24em]">Action Panel</p>
        <h2 id="action-panel-heading" className="mt-2 text-xl font-semibold text-slate-900">
          What would you like to do?
        </h2>
        {!isWalletConnected && (
          <p className="mt-2 rounded-lg border border-red-100 bg-red-50 p-2 text-sm text-red-500">
            {noWalletMsg}
          </p>
        )}
        {errorMessage && (
          <p role="alert" className="mt-2 rounded-lg border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">
            {errorMessage}
          </p>
        )}
        {isLoading && (
          <span id={LOADING_DESCRIPTION_ID} className="sr-only">
            {LOADING_REASON}
          </span>
        )}
        {disabledReasons?.submitMilestone && (
          <span id="action-panel-submitMilestone-reason" className="sr-only">
            {disabledReasons.submitMilestone}
          </span>
        )}
        {disabledReasons?.releaseFunds && (
          <span id="action-panel-releaseFunds-reason" className="sr-only">
            {disabledReasons.releaseFunds}
          </span>
        )}
        {disabledReasons?.dispute && (
          <span id="action-panel-dispute-reason" className="sr-only">
            {disabledReasons.dispute}
          </span>
        )}
        {disabledReasons?.viewSummary && (
          <span id="action-panel-viewSummary-reason" className="sr-only">
            {disabledReasons.viewSummary}
          </span>
        )}
      </div>

      <div className="space-y-3">
        {actions.includes('Submit Milestone') && (
          <button
            type="button"
            onClick={(e) => handleOpenConfirm('submit', e)}
            disabled={!isWalletConnected || isLoading || !!disabledReasons?.submitMilestone || disableMutations}
            title={!isWalletConnected ? noWalletMsg : mutationsDisabledMsg}
            aria-label="Submit milestone for approval"
            aria-describedby={describedBy(describedById('submitMilestone'))}
            className={`w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 ${focusRingClass}`}
          >
            Submit Milestone
          </button>
        )}

        {actions.includes('Release Funds') && (
          <button
            type="button"
            onClick={(event) => handleOpenConfirm('release', event)}
            disabled={!isWalletConnected || isLoading || !!disabledReasons?.releaseFunds || disableMutations}
            title={!isWalletConnected ? noWalletMsg : mutationsDisabledMsg}
            aria-label="Release funds to the contractor"
            aria-describedby={describedBy(describedById('releaseFunds'))}
            className={`w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50 ${focusRingClass}`}
          >
            Release Funds
          </button>
        )}

        {actions.includes('Dispute') && (
          <>
            <button
              ref={disputeTriggerRef}
              type="button"
              onClick={handleOpenDisputeForm}
              disabled={
                !isWalletConnected ||
                isLoading ||
                !!disabledReasons?.dispute ||
                disputeFormOpen ||
                disableMutations
              }
              title={!isWalletConnected ? noWalletMsg : mutationsDisabledMsg}
              aria-label="Open a dispute for this contract"
              aria-expanded={disputeFormOpen}
              aria-controls={disputeFormOpen ? 'dispute-reason-form' : undefined}
              aria-describedby={describedBy(describedById('dispute'))}
              className={`w-full rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed ${focusRingClass}`}
            >
              Dispute
            </button>

            {/* Inline dispute reason form — rendered below the trigger button,
                visible only when the user clicks "Dispute". The form is not a
                modal so the rest of the page remains accessible. */}
            {disputeFormOpen && (
              <div
                id="dispute-reason-form"
                role="group"
                aria-labelledby="dispute-form-heading"
                className="rounded-2xl border border-rose-200 bg-rose-50 p-4 space-y-3"
              >
                <p
                  id="dispute-form-heading"
                  className="text-sm font-semibold text-rose-900"
                >
                  Describe the reason for this dispute
                </p>

                {/* Screen-reader hint linked via aria-describedby */}
                <span id={DISPUTE_REASON_HINT_ID} className="sr-only">
                  Enter a reason between 1 and {DISPUTE_REASON_MAX_LENGTH} characters.
                  This cannot be undone.
                </span>

                <form onSubmit={handleDisputeSubmit} noValidate>
                  <label
                    htmlFor="dispute-reason-textarea"
                    className="block text-xs font-medium text-rose-800 mb-1"
                  >
                    Reason{' '}
                    <span aria-hidden="true" className="text-rose-600">
                      *
                    </span>
                  </label>

                  <textarea
                    ref={disputeTextareaRef}
                    id="dispute-reason-textarea"
                    name="disputeReason"
                    rows={4}
                    maxLength={DISPUTE_REASON_MAX_LENGTH}
                    value={disputeReason}
                    onChange={handleDisputeReasonChange}
                    aria-required="true"
                    aria-describedby={
                      disputeReasonError
                        ? `${DISPUTE_REASON_ERROR_ID} ${DISPUTE_REASON_HINT_ID} ${DISPUTE_REASON_COUNTER_ID}`
                        : `${DISPUTE_REASON_HINT_ID} ${DISPUTE_REASON_COUNTER_ID}`
                    }
                    aria-invalid={disputeReasonError ? 'true' : undefined}
                    placeholder="Explain why you are opening this dispute…"
                    className={`w-full resize-y rounded-xl border px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 ${
                      disputeReasonError
                        ? 'border-rose-500 bg-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  />

                  {/* Visual character counter - not a live region to avoid double reading */}
                  <p
                    aria-hidden="true"
                    className={`mt-1 text-xs text-right ${
                      isOverLimit ? 'text-rose-600 font-semibold' : 'text-slate-500'
                    }`}
                  >
                    {disputeReason.length} of {DISPUTE_REASON_MAX_LENGTH} characters
                  </p>

                  {/* Visually hidden live region for screen readers */}
                  <div
                    id={DISPUTE_REASON_COUNTER_ID}
                    aria-live={remainingChars <= DISPUTE_REASON_ASSERTIVE_THRESHOLD ? 'assertive' : 'polite'}
                    aria-atomic="true"
                    className="sr-only"
                  >
                    {liveAnnouncement}
                  </div>

                  {/* Validation error — linked to the textarea via aria-describedby */}
                  {disputeReasonError && (
                    <p
                      id={DISPUTE_REASON_ERROR_ID}
                      role="alert"
                      className="mt-1 text-xs font-medium text-rose-700"
                    >
                      {disputeReasonError}
                    </p>
                  )}

                  <div className="flex gap-2 mt-3">
                    <button
                      type="submit"
                      className={`flex-1 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed ${focusRingClass}`}
                    >
                      Confirm Dispute
                    </button>
                    <button
                      type="button"
                      onClick={closeDisputeForm}
                      className={`flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-400 ${focusRingClass}`}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </>
        )}

        {actions.includes('View Summary') && (
          <button
            type="button"
            onClick={() => onViewSummary?.()}
            disabled={isLoading || !!disabledReasons?.viewSummary}
            aria-label="View contract summary details"
            aria-describedby={describedBy(describedById('viewSummary'))}
            className={`w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50 ${focusRingClass}`}
          >
            View Summary
          </button>
        )}
      </div>

      {/* Confirmation Dialog: used for Submit Milestone and Release Funds only.
          Dispute is handled by the inline form above. */}
      <ConfirmDialog
        isOpen={confirmAction !== null}
        title={confirmAction && confirmAction in CONFIRM_COPY ? CONFIRM_COPY[confirmAction as keyof typeof CONFIRM_COPY].title : ''}
        description={confirmAction && confirmAction in CONFIRM_COPY ? CONFIRM_COPY[confirmAction as keyof typeof CONFIRM_COPY].description : ''}
        confirmLabel={confirmAction && confirmAction in CONFIRM_COPY ? CONFIRM_COPY[confirmAction as keyof typeof CONFIRM_COPY].confirmLabel : 'Confirm'}
        cancelLabel="Cancel"
        tone={confirmAction === 'release' || confirmAction === 'dispute' ? 'destructive' : 'default'}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </aside>
  );
};

export default ActionPanel;
