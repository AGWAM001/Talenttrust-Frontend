import {
  ALLOWED_STATUS_TRANSITIONS,
  ALL_CONTRACT_STATUSES,
  isStatusTransitionAllowed,
  validateStatusTransition,
} from '../validateContractStatusTransition';

describe('ALLOWED_STATUS_TRANSITIONS', () => {
  it('allows release and dispute from every non-terminal status', () => {
    expect(ALLOWED_STATUS_TRANSITIONS.Active).toEqual(['Completed', 'Disputed']);
    expect(ALLOWED_STATUS_TRANSITIONS.Pending).toEqual(['Completed', 'Disputed']);
  });

  it('makes Completed and Disputed terminal', () => {
    expect(ALLOWED_STATUS_TRANSITIONS.Completed).toEqual([]);
    expect(ALLOWED_STATUS_TRANSITIONS.Disputed).toEqual([]);
  });

  it('covers every status exactly once', () => {
    expect(Object.keys(ALLOWED_STATUS_TRANSITIONS).sort()).toEqual(
      [...ALL_CONTRACT_STATUSES].sort(),
    );
  });
});

describe('isStatusTransitionAllowed', () => {
  it.each([
    ['Active', 'Completed'],
    ['Active', 'Disputed'],
    ['Pending', 'Completed'],
    ['Pending', 'Disputed'],
  ] as const)('allows %s → %s', (from, to) => {
    expect(isStatusTransitionAllowed(from, to)).toBe(true);
  });

  it.each([
    ['Completed', 'Completed'],
    ['Completed', 'Disputed'],
    ['Completed', 'Active'],
    ['Completed', 'Pending'],
    ['Disputed', 'Disputed'],
    ['Disputed', 'Completed'],
    ['Disputed', 'Active'],
    ['Disputed', 'Pending'],
  ] as const)('rejects terminal %s → %s', (from, to) => {
    expect(isStatusTransitionAllowed(from, to)).toBe(false);
  });

  it.each([
    ['Active', 'Active'],
    ['Pending', 'Pending'],
  ] as const)('rejects self-transition %s → %s', (from, to) => {
    expect(isStatusTransitionAllowed(from, to)).toBe(false);
  });

  it('rejects unknown statuses defensively', () => {
    expect(
      isStatusTransitionAllowed(
        'Corrupted' as never,
        'Completed',
      ),
    ).toBe(false);
    expect(() => isStatusTransitionAllowed('Active', 'Bogus' as never)).not.toThrow();
    expect(isStatusTransitionAllowed('Active', 'Bogus' as never)).toBe(false);
  });
});

describe('validateStatusTransition', () => {
  // ── Accepted inputs ───────────────────────────────────────────────────────
  it.each([
    ['Active', 'Completed'],
    ['Active', 'Disputed'],
    ['Pending', 'Completed'],
    ['Pending', 'Disputed'],
  ] as const)('accepts %s → %s', (from, to) => {
    expect(validateStatusTransition(from, to)).toEqual({ ok: true, from, to });
  });

  // ── Unknown / corrupt inputs ──────────────────────────────────────────────
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['number', 42],
    ['object', {}],
    ['empty string', ''],
    ['wrong case', 'active'],
    ['unknown word', 'Archived'],
  ])('rejects unknown current status (%s)', (_label, current) => {
    const result = validateStatusTransition(current, 'Completed');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('unknown-current-status');
      expect(result.message).toMatch(/reload/i);
    }
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['number', 7],
    ['unknown word', 'Refunded'],
    ['wrong case', 'completed'],
  ])('rejects unknown next status (%s)', (_label, next) => {
    const result = validateStatusTransition('Active', next);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('unknown-next-status');
    }
  });

  // ── Boundary: terminal states ────────────────────────────────────────────
  it.each(['Completed', 'Disputed'] as const)(
    'rejects every transition out of terminal %s with a specific message',
    (terminal) => {
      for (const next of ALL_CONTRACT_STATUSES) {
        const result = validateStatusTransition(terminal, next);
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.reason).toBe('transition-not-allowed');
          expect(result.message.toLowerCase()).toContain(terminal.toLowerCase());
        }
      }
    },
  );

  it('gives a "no change needed" message for a duplicate same-status write', () => {
    const result = validateStatusTransition('Completed', 'Completed');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/already Completed/i);
    }
  });

  it('gives a reload hint when moving a terminal contract elsewhere', () => {
    const result = validateStatusTransition('Disputed', 'Completed');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/reload/i);
    }
  });

  // ── Diagnosability: messages stay user-safe ──────────────────────────────
  it('never exposes raw values in rejection messages', () => {
    const result = validateStatusTransition('<script>', 'Completed');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).not.toContain('<script>');
    }
  });
});
