import {
  ACTION_IDS,
  CONTRACT_STATUSES,
  GATE_PRECEDENCE,
  clampDisputeReason,
  evaluateActionGate,
  getVisibleActions,
  isKnownContractStatus,
  isMutationAction,
  normalizeContractStatus,
  type ActionBlockCode,
  type ActionGateInput,
  type ActionId,
} from '../actionPanelPolicy';
import { DISPUTE_REASON_MAX_LENGTH } from '../disputeReason';

/**
 * Baseline gate input: a connected wallet, fresh online data, every handler
 * wired and no caller reasons. Individual tests override exactly one field so a
 * failure points at a single rule.
 */
const baseInput: ActionGateInput = {
  action: 'dispute',
  status: 'Active',
  isLoading: false,
  disableMutations: false,
  isWalletConnected: true,
  disputeFormOpen: false,
};

const gate = (overrides: Partial<ActionGateInput> = {}) =>
  evaluateActionGate({ ...baseInput, ...overrides });

describe('status normalisation', () => {
  it.each(CONTRACT_STATUSES)('accepts the canonical status %s', (status) => {
    expect(isKnownContractStatus(status)).toBe(true);
    expect(normalizeContractStatus(status)).toBe(status);
  });

  it.each([
    ['a lowercase variant', 'active'],
    ['a padded variant', ' Active '],
    ['an unknown lifecycle value', 'Refunded'],
    ['null', null],
    ['undefined', undefined],
    ['a number', 7],
    ['an object', { status: 'Active' }],
    ['an empty string', ''],
  ])('rejects %s', (_label, value) => {
    expect(isKnownContractStatus(value)).toBe(false);
    expect(normalizeContractStatus(value)).toBeNull();
  });

  it('maps every canonical status to its documented action list in workflow order', () => {
    expect(getVisibleActions('Active')).toEqual(['submitMilestone', 'releaseFunds', 'dispute']);
    expect(getVisibleActions('Pending')).toEqual(['releaseFunds', 'dispute']);
    expect(getVisibleActions('Disputed')).toEqual(['dispute']);
    expect(getVisibleActions('Completed')).toEqual(['viewSummary']);
  });

  it('fails safe to the read-only surface for any unrecognised status', () => {
    for (const value of ['active', 'Refunded', null, undefined, 0, {}, 'Active ']) {
      expect(getVisibleActions(value)).toEqual(['viewSummary']);
    }
  });

  it('never exposes a mutation for an unrecognised status', () => {
    const visible = getVisibleActions('not-a-status');
    expect(visible.filter(isMutationAction)).toHaveLength(0);
  });

  it('returns a fresh array so callers cannot corrupt the shared table', () => {
    const first = getVisibleActions('Active');
    first.push('viewSummary');
    expect(getVisibleActions('Active')).toEqual(['submitMilestone', 'releaseFunds', 'dispute']);
  });
});

describe('isMutationAction', () => {
  it('treats only viewSummary as read-only', () => {
    expect(isMutationAction('viewSummary')).toBe(false);
    expect(isMutationAction('submitMilestone')).toBe(true);
    expect(isMutationAction('releaseFunds')).toBe(true);
    expect(isMutationAction('dispute')).toBe(true);
  });
});

describe('evaluateActionGate — allowed', () => {
  /** The smallest status that exposes each action. */
  const EXPOSING_STATUS: Record<ActionId, string> = {
    submitMilestone: 'Active',
    releaseFunds: 'Pending',
    dispute: 'Disputed',
    viewSummary: 'Completed',
  };

  it.each(ACTION_IDS)('allows %s when every gate is open', (action) => {
    expect(gate({ action, status: EXPOSING_STATUS[action] })).toEqual({
      allowed: true,
      code: null,
      message: null,
    });
  });

  it('defaults every optional input to the permissive/closed-safe value', () => {
    expect(evaluateActionGate({ action: 'viewSummary', status: 'Completed' })).toEqual({
      allowed: true,
      code: null,
      message: null,
    });
  });

  it('treats an empty-string caller reason as "no reason supplied"', () => {
    expect(gate({ disabledReasons: { dispute: '' } }).allowed).toBe(true);
  });

  it('allows a dispute submit while the form is open (form_open is trigger-side only)', () => {
    expect(gate({ action: 'dispute', disputeFormOpen: false }).allowed).toBe(true);
  });
});

describe('evaluateActionGate — refusals', () => {
  it('refuses an unknown action id', () => {
    const result = evaluateActionGate({ ...baseInput, action: 'wipeDatabase' as ActionId });
    expect(result.allowed).toBe(false);
    expect(result.code).toBe('unknown_action');
    expect(result.message).toBeNull();
  });

  it('refuses an action the current status does not offer', () => {
    const result = gate({ action: 'releaseFunds', status: 'Completed' });
    expect(result).toEqual({
      allowed: false,
      code: 'status_not_available',
      message: 'This action is no longer available for the current contract status.',
    });
  });

  it('refuses every mutation when the status is unrecognised (fail-safe)', () => {
    for (const action of ['submitMilestone', 'releaseFunds', 'dispute'] as ActionId[]) {
      expect(gate({ action, status: 'mystery' })).toMatchObject({
        allowed: false,
        code: 'status_not_available',
      });
    }
  });

  it('does not gate on a missing caller handler (parents use disabledReasons)', () => {
    // Documented, pre-existing behaviour: a handler-less panel still renders an
    // enabled button and simply dispatches nothing.
    expect(gate({ disabledReasons: {} }).allowed).toBe(true);
  });

  it('refuses every action while loading, including the read-only one', () => {
    expect(gate({ action: 'viewSummary', status: 'Completed', isLoading: true })).toMatchObject({
      allowed: false,
      code: 'loading',
      message: 'Action is disabled while contract data is loading.',
    });
  });

  it('refuses mutations while mutations are disabled but not viewSummary', () => {
    expect(gate({ action: 'releaseFunds', disableMutations: true })).toMatchObject({
      allowed: false,
      code: 'mutations_disabled',
      message: 'Actions are disabled while offline or viewing stale data.',
    });
    expect(gate({ action: 'viewSummary', status: 'Completed', disableMutations: true }).allowed).toBe(true);
  });

  it('surfaces the caller-supplied reason verbatim when an action is caller-disabled', () => {
    const reason = 'Only the client can release funds on this contract.';
    expect(gate({ disabledReasons: { dispute: reason } })).toEqual({
      allowed: false,
      code: 'caller_disabled',
      message: reason,
    });
  });

  it('refuses mutations without a wallet but allows read-only actions', () => {
    expect(gate({ action: 'releaseFunds', isWalletConnected: false })).toEqual({
      allowed: false,
      code: 'wallet_disconnected',
      message: 'Connect wallet to perform this action',
    });
    expect(gate({ action: 'viewSummary', status: 'Completed', isWalletConnected: false }).allowed).toBe(true);
  });

  it('keeps the dispute-specific wallet copy', () => {
    expect(gate({ action: 'dispute', isWalletConnected: false })).toEqual({
      allowed: false,
      code: 'wallet_disconnected',
      message: 'Connect your wallet before submitting a dispute.',
    });
  });

  it('refuses a re-entrant dispute trigger while the form is open', () => {
    expect(gate({ disputeFormOpen: true })).toMatchObject({
      allowed: false,
      code: 'form_open',
    });
  });
});

describe('evaluateActionGate — determinism and precedence', () => {
  it('resolves the same result for the same input', () => {
    const input: ActionGateInput = {
      action: 'releaseFunds',
      status: 'Active',
      isLoading: true,
      disableMutations: true,
      isWalletConnected: false,
      disabledReasons: { releaseFunds: 'nope' },
    };
    expect(evaluateActionGate(input)).toEqual(evaluateActionGate(input));
  });

  it('prefers the state machine over every session gate', () => {
    const result = gate({
      action: 'releaseFunds',
      status: 'Completed',
      isLoading: true,
      disableMutations: true,
      isWalletConnected: false,
    });
    expect(result.code).toBe('status_not_available');
  });

  it('prefers loading over the offline/stale gate', () => {
    expect(gate({ isLoading: true, disableMutations: true }).code).toBe('loading');
  });

  it('prefers the offline/stale gate over caller reasons', () => {
    expect(gate({ disableMutations: true, disabledReasons: { dispute: 'reason' } }).code).toBe(
      'mutations_disabled',
    );
  });

  it('prefers caller reasons over the wallet gate', () => {
    expect(
      gate({ disabledReasons: { dispute: 'reason' }, isWalletConnected: false }).code,
    ).toBe('caller_disabled');
  });

  it('never returns a code outside the declared precedence order', () => {
    const order = GATE_PRECEDENCE as readonly ActionBlockCode[];
    const scenarios: ActionGateInput[] = [
      baseInput,
      { ...baseInput, status: 'nope' },
      { ...baseInput, isLoading: true },
      { ...baseInput, disableMutations: true },
      { ...baseInput, disabledReasons: { dispute: 'x' } },
      { ...baseInput, isWalletConnected: false },
      { ...baseInput, disputeFormOpen: true },
      { ...baseInput, action: 'bogus' as ActionId },
    ];
    for (const scenario of scenarios) {
      const { code } = evaluateActionGate(scenario);
      if (code) expect(order).toContain(code);
    }
  });

  it('returns a defined (possibly null) message for every refusal it can emit', () => {
    const scenarios: ActionGateInput[] = [
      { ...baseInput, action: 'bogus' as ActionId },
      { ...baseInput, status: 'Completed' },
      { ...baseInput, isLoading: true },
      { ...baseInput, disableMutations: true },
      { ...baseInput, disabledReasons: { dispute: 'x' } },
      { ...baseInput, isWalletConnected: false },
      { ...baseInput, disputeFormOpen: true },
    ];
    const codes = scenarios.map((scenario) => {
      const result = evaluateActionGate(scenario);
      expect(result.allowed).toBe(false);
      expect(result.code).not.toBeNull();
      // Only the two internal codes stay silent; everything else has copy.
      const silent: ActionBlockCode[] = ['unknown_action', 'duplicate_submission'];
      if (result.code && !silent.includes(result.code)) {
        expect(typeof result.message).toBe('string');
        expect(result.message!.length).toBeGreaterThan(0);
      }
      return result.code;
    });

    // Every gate-emitted code is declared in the published precedence list.
    for (const code of codes) {
      expect(GATE_PRECEDENCE).toContain(code as ActionBlockCode);
    }
    expect(new Set(GATE_PRECEDENCE).size).toBe(GATE_PRECEDENCE.length);
  });

  it('never leaks addresses, ids or user input in the message copy', () => {
    const messages = [
      gate({ action: 'releaseFunds', status: 'Completed' }).message,
      gate({ isLoading: true }).message,
      gate({ disableMutations: true }).message,
      gate({ isWalletConnected: false }).message,
      gate({ disputeFormOpen: true }).message,
    ];
    for (const message of messages) {
      expect(message).toBeTruthy();
      expect(message).not.toMatch(/GB[A-Z0-9]{10,}/);
      expect(message).not.toMatch(/\d{1,3}(\.\d{3}){2,}/); // contract-like ids
    }
  });
});

describe('clampDisputeReason', () => {
  it('returns the value unchanged when within bounds', () => {
    expect(clampDisputeReason('', DISPUTE_REASON_MAX_LENGTH)).toBe('');
    expect(clampDisputeReason('  padded  ', DISPUTE_REASON_MAX_LENGTH)).toBe('  padded  ');
    expect(clampDisputeReason('a'.repeat(DISPUTE_REASON_MAX_LENGTH), DISPUTE_REASON_MAX_LENGTH)).toBe(
      'a'.repeat(DISPUTE_REASON_MAX_LENGTH),
    );
  });

  it('keeps the first characters of over-long input instead of discarding it', () => {
    expect(clampDisputeReason('a'.repeat(600), DISPUTE_REASON_MAX_LENGTH)).toBe(
      'a'.repeat(DISPUTE_REASON_MAX_LENGTH),
    );
    expect(clampDisputeReason('abcdef', 3)).toBe('abc');
  });

  it('is idempotent at the boundary', () => {
    const clamped = clampDisputeReason('b'.repeat(501), DISPUTE_REASON_MAX_LENGTH);
    expect(clampDisputeReason(clamped, DISPUTE_REASON_MAX_LENGTH)).toBe(clamped);
  });

  it('supports a zero-length ceiling', () => {
    expect(clampDisputeReason('anything', 0)).toBe('');
  });

  it('rejects a negative or fractional ceiling', () => {
    expect(() => clampDisputeReason('x', -1)).toThrow(RangeError);
    expect(() => clampDisputeReason('x', 1.5)).toThrow(RangeError);
    expect(() => clampDisputeReason('x', Number.NaN)).toThrow(RangeError);
  });

  it('never produces output longer than the ceiling', () => {
    for (const length of [0, 1, 499, 500, 501, 5000]) {
      expect(clampDisputeReason('x'.repeat(length), DISPUTE_REASON_MAX_LENGTH).length).toBeLessThanOrEqual(
        DISPUTE_REASON_MAX_LENGTH,
      );
    }
  });
});
