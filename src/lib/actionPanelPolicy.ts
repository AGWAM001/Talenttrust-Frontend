/**
 * ActionPanel validation boundaries.
 *
 * This module is the single source of truth for *what the contract action panel
 * is allowed to do* given the current contract status, wallet session, caller
 * supplied disabled reasons and loading/offline flags. It is intentionally
 * pure (no React, no DOM, no I/O) so the exact same decision can be:
 *
 *   1. rendered as a `disabled` attribute on a button, and
 *   2. re-evaluated inside the click/submit handler that performs the mutation.
 *
 * Both call sites MUST agree, because the DOM `disabled` attribute is a *hint*
 * to the browser — it is not an authorization control. A keyboard event, a
 * re-render that flips `disableMutations`/`isWalletConnected` while a surface is
 * already open, or a scripted click can all reach a handler while the button is
 * notionally disabled. Re-evaluating the gate at the mutation boundary is what
 * makes the invariants below hold under those conditions.
 *
 * Invariants enforced here (see `src/components/ActionPanel.tsx` for usage):
 *
 * - **I1 — status decides the surface.** An action is only ever offered when it
 *   belongs to the current lifecycle status.
 * - **I2 — unknown status fails safe.** A status that is not one of the four
 *   canonical values (possible when contract data comes from the network or
 *   `localStorage` and is cast into the typed prop) degrades to the read-only
 *   `viewSummary` surface. An unrecognised status can therefore never unlock a
 *   mutation.
 * - **I3 — mutations require a wallet.** `submitMilestone`, `releaseFunds` and
 *   `dispute` are blocked without a connected wallet address. `viewSummary` is
 *   read-only and is never wallet-gated.
 * - **I4 — caller gates win.** `disabledReasons` (permission/condition checks
 *   owned by the parent) and `disableMutations` (offline / stale cache) block
 *   mutations before they are dispatched. A parent that renders no callback for
 *   an action is *not* gated here: it has always been a no-op dispatch, and
 *   "action unavailable" is expressed through `disabledReasons`.
 * - **I5 — determinism.** For a given input the result is always identical, and
 *   rules are evaluated in a fixed precedence order so the surfaced message is
 *   stable (see `GATE_PRECEDENCE`).
 * - **I6 — no sensitive data.** Every {@link ActionBlockCode} is a fixed enum
 *   and every {@link ActionGateResult.message} is static copy or caller supplied
 *   display text. No wallet address, contract id or dispute reason is ever
 *   embedded, so the code can be reported to logs/metrics verbatim.
 */

/** Every action the panel can offer. */
export const ACTION_IDS = ['submitMilestone', 'releaseFunds', 'dispute', 'viewSummary'] as const;

/** Stable identifier for a contract action. */
export type ActionId = (typeof ACTION_IDS)[number];

/** The canonical contract lifecycle statuses. */
export const CONTRACT_STATUSES = ['Active', 'Completed', 'Disputed', 'Pending'] as const;

/** A canonical contract lifecycle status. */
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

/**
 * Actions that mutate contract state and therefore require wallet connection,
 * caller permission and an online/fresh-data session.
 */
export const MUTATION_ACTION_IDS = ['submitMilestone', 'releaseFunds', 'dispute'] as const;

/** True when `action` changes contract state (as opposed to reading it). */
export function isMutationAction(action: ActionId): boolean {
  return (MUTATION_ACTION_IDS as readonly string[]).includes(action);
}

/**
 * Visible actions per status, in workflow order. The order is also the tab
 * order, so it is part of the component's contract and must stay stable.
 */
const VISIBLE_ACTIONS_BY_STATUS: Record<ContractStatus, readonly ActionId[]> = {
  Active: ['submitMilestone', 'releaseFunds', 'dispute'],
  Pending: ['releaseFunds', 'dispute'],
  Disputed: ['dispute'],
  Completed: ['viewSummary'],
};

/**
 * Actions offered when the status is not recognised. Deliberately read-only so
 * a malformed/untrusted status can never surface a destructive action
 * (invariant I2).
 */
const UNKNOWN_STATUS_ACTIONS: readonly ActionId[] = ['viewSummary'];

/** True when `value` is one of the canonical contract statuses. */
export function isKnownContractStatus(value: unknown): value is ContractStatus {
  return typeof value === 'string' && (CONTRACT_STATUSES as readonly string[]).includes(value);
}

/**
 * Narrows an untrusted value to a canonical status.
 *
 * @returns The canonical status, or `null` when the value is not recognised.
 */
export function normalizeContractStatus(value: unknown): ContractStatus | null {
  return isKnownContractStatus(value) ? value : null;
}

/**
 * Resolves the ordered list of actions visible for a status.
 *
 * Unrecognised values fall back to {@link UNKNOWN_STATUS_ACTIONS} rather than
 * throwing: the panel must stay renderable when contract data is malformed, but
 * must not offer mutations it cannot justify (invariant I2).
 *
 * @param status - The contract status, which may be untrusted at runtime.
 * @returns A fresh array of action ids in workflow order.
 */
export function getVisibleActions(status: unknown): ActionId[] {
  const canonical = normalizeContractStatus(status);
  return canonical ? [...VISIBLE_ACTIONS_BY_STATUS[canonical]] : [...UNKNOWN_STATUS_ACTIONS];
}

/**
 * Machine-readable reason an action was refused.
 *
 * These codes are part of the panel's observability contract: they are safe to
 * log or count because they carry no user input, addresses or identifiers.
 */
export type ActionBlockCode =
  /** The action id is not one of {@link ACTION_IDS}. */
  | 'unknown_action'
  /** The current status does not offer this action (invariant I1/I2). */
  | 'status_not_available'
  /** Contract/wallet state is still loading. */
  | 'loading'
  /** `disableMutations` is set (offline or stale cached data). */
  | 'mutations_disabled'
  /** The parent supplied a `disabledReasons` entry for this action. */
  | 'caller_disabled'
  /** A mutation was attempted without a connected wallet (invariant I3). */
  | 'wallet_disconnected'
  /** The dispute trigger was re-entered while the inline form is already open. */
  | 'form_open'
  /** The surface already emitted its action and cannot emit twice. */
  | 'duplicate_submission';

/**
 * Static, user-visible copy for each block reason.
 *
 * `unknown_action` and `duplicate_submission` are intentionally `null`: they are
 * internal/benign conditions that are reported but never shown, because a
 * visible error would either leak internals or flash on a surface that is
 * already closing. A `null` message tells the component to stay quiet.
 */
const BLOCK_MESSAGES: Record<ActionBlockCode, string | null> = {
  unknown_action: null,
  status_not_available: 'This action is no longer available for the current contract status.',
  loading: 'Action is disabled while contract data is loading.',
  mutations_disabled: 'Actions are disabled while offline or viewing stale data.',
  caller_disabled: 'This action is currently unavailable.',
  wallet_disconnected: 'Connect wallet to perform this action',
  form_open: 'A dispute form is already open. Finish or cancel it first.',
  duplicate_submission: null,
};

/** Wallet-gating copy, which is action specific so dispute keeps its own wording. */
const WALLET_MESSAGES: Record<ActionId, string> = {
  submitMilestone: 'Connect wallet to perform this action',
  releaseFunds: 'Connect wallet to perform this action',
  dispute: 'Connect your wallet before submitting a dispute.',
  viewSummary: 'Connect wallet to perform this action',
};

/**
 * Rules are evaluated in this exact order, and the first match wins. The order
 * is part of the contract: the surfaced message must not change depending on how
 * many gates happen to be closed at once (invariant I5).
 *
 * `status_not_available` is checked first because it is a state-machine rule
 * that supersedes every session rule; `loading` is checked before the caller
 * gates so the universal loading reason keeps precedence over per-action
 * reasons, matching the `aria-describedby` precedence in the component.
 */
export const GATE_PRECEDENCE: readonly ActionBlockCode[] = [
  'unknown_action',
  'status_not_available',
  'loading',
  'mutations_disabled',
  'caller_disabled',
  'wallet_disconnected',
  'form_open',
];

/** Everything the gate needs to decide whether an action may run. */
export interface ActionGateInput {
  /** The action being requested. */
  action: ActionId;
  /** The contract status. Typed as `unknown` because it can arrive untrusted. */
  status: unknown;
  /** True while contract/wallet state is loading. Blocks every action. */
  isLoading?: boolean;
  /** True when offline or viewing stale cached data. Blocks mutations only. */
  disableMutations?: boolean;
  /** True when a wallet address is available. Required for mutations. */
  isWalletConnected?: boolean;
  /** Per-action caller reasons; a non-empty string blocks that action. */
  disabledReasons?: Partial<Record<ActionId, string | undefined>>;
  /**
   * Trigger-side only: whether the inline dispute form is currently open.
   * Submitting the open form is *not* blocked by this flag — pass `false` when
   * evaluating the submit handler, `true` when evaluating the Dispute trigger.
   */
  disputeFormOpen?: boolean;
}

/** The deterministic outcome of {@link evaluateActionGate}. */
export interface ActionGateResult {
  /** True only when every gate is open. */
  allowed: boolean;
  /** Stable refusal reason, or `null` when allowed. */
  code: ActionBlockCode | null;
  /**
   * User-visible explanation, or `null` when the refusal is not user facing
   * (`unknown_action`, `duplicate_submission`).
   */
  message: string | null;
}

const ALLOWED: ActionGateResult = Object.freeze({ allowed: true, code: null, message: null });

const refuse = (code: ActionBlockCode, message?: string | null): ActionGateResult =>
  Object.freeze({
    allowed: false,
    code,
    message: message === undefined ? BLOCK_MESSAGES[code] : message,
  });

/**
 * Decides whether an action may be dispatched right now.
 *
 * Pure and total: it never throws and always returns a result, so callers can
 * derive both their `disabled` attribute and their handler guard from it
 * without defensive `try`/`catch`.
 *
 * @param input - Current status, session and caller gating state.
 * @returns The gate decision, including a stable code and safe display copy.
 */
export function evaluateActionGate(input: ActionGateInput): ActionGateResult {
  const {
    action,
    status,
    isLoading = false,
    disableMutations = false,
    isWalletConnected = false,
    disabledReasons,
    disputeFormOpen = false,
  } = input;

  if (!(ACTION_IDS as readonly string[]).includes(action)) {
    return refuse('unknown_action');
  }

  // I1/I2 — the status state machine supersedes every session gate.
  if (!getVisibleActions(status).includes(action)) {
    return refuse('status_not_available');
  }

  if (isLoading) {
    return refuse('loading');
  }

  const isMutation = isMutationAction(action);

  // I4 — offline/stale sessions may not mutate.
  if (isMutation && disableMutations) {
    return refuse('mutations_disabled');
  }

  // I4 — caller supplied permission/condition reasons win over wallet checks so
  // the user is told *why* the action is unavailable rather than being told to
  // connect a wallet they may already have connected.
  const callerReason = disabledReasons?.[action];
  if (callerReason) {
    return refuse('caller_disabled', callerReason);
  }

  // I3 — mutations require a wallet session.
  if (isMutation && !isWalletConnected) {
    return refuse('wallet_disconnected', WALLET_MESSAGES[action]);
  }

  if (action === 'dispute' && disputeFormOpen) {
    return refuse('form_open');
  }

  return ALLOWED;
}

/**
 * Payload describing a refused action, handed to the `onBlockedAction` prop.
 *
 * Contains only the action and its enum code — never the dispute reason, the
 * wallet address or any contract identifier — so it is safe to forward to
 * analytics/telemetry.
 */
export interface ActionBlockedDetail {
  /** The action that was refused. */
  action: ActionId;
  /** Stable refusal reason. */
  code: ActionBlockCode;
}

/**
 * Clamps raw dispute-reason input to the maximum accepted length.
 *
 * Truncating (rather than discarding) keeps paste/IME overflow deterministic:
 * the first {@link maxLength} code units are retained, so a 900-character paste
 * yields a usable 500-character reason instead of silently dropping the input
 * and leaving the user with an empty box.
 *
 * @param value - Raw textarea value.
 * @param maxLength - Inclusive maximum length; defaults to the dispute limit.
 * @returns `value` unchanged when within bounds, otherwise its prefix.
 */
export function clampDisputeReason(value: string, maxLength: number): string {
  if (typeof value !== 'string') return '';
  if (!Number.isSafeInteger(maxLength) || maxLength < 0) {
    throw new RangeError('maxLength must be a non-negative safe integer');
  }
  return value.length <= maxLength ? value : value.slice(0, maxLength);
}
