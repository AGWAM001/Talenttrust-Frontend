import {
  validateMilestone,
  MAX_MILESTONE_TITLE_LENGTH,
  MAX_PAYOUT_VALUE,
  MAX_PAYOUT_DECIMAL_PLACES,
  ALLOWED_CURRENCIES,
  ALLOWED_STATUSES,
  type MilestoneFormValues,
} from '../validateMilestone';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Returns a fully-valid set of form values. Override individual fields as needed. */
function validPayload(overrides: Partial<MilestoneFormValues> = {}): MilestoneFormValues {
  return {
    title: 'Frontend Development – Sprint 1',
    payout: '2500',
    currency: 'USD',
    dueDate: 'Jun 1, 2025',
    status: 'Pending',
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Exported constants
// ─────────────────────────────────────────────────────────────────────────────

describe('exported constants', () => {
  it('exports MAX_MILESTONE_TITLE_LENGTH as 200', () => {
    expect(MAX_MILESTONE_TITLE_LENGTH).toBe(200);
  });

  it('exports MAX_PAYOUT_VALUE as 10_000_000', () => {
    expect(MAX_PAYOUT_VALUE).toBe(10_000_000);
  });

  it('exports MAX_PAYOUT_DECIMAL_PLACES as 2', () => {
    expect(MAX_PAYOUT_DECIMAL_PLACES).toBe(2);
  });

  it('exports ALLOWED_CURRENCIES including USD, EUR, GBP, XLM', () => {
    expect(ALLOWED_CURRENCIES).toEqual(expect.arrayContaining(['USD', 'EUR', 'GBP', 'XLM']));
    expect(ALLOWED_CURRENCIES).toHaveLength(4);
  });

  it('exports ALLOWED_STATUSES including all five statuses', () => {
    expect(ALLOWED_STATUSES).toEqual(
      expect.arrayContaining(['Pending', 'Active', 'Completed', 'Paid', 'Disputed']),
    );
    expect(ALLOWED_STATUSES).toHaveLength(5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Valid payload
// ─────────────────────────────────────────────────────────────────────────────

describe('valid payload', () => {
  it('returns an empty array for a fully valid input', () => {
    expect(validateMilestone(validPayload())).toEqual([]);
  });

  it('returns an empty array when dueDate and status are omitted', () => {
    const { dueDate: _d, status: _s, ...rest } = validPayload();
    expect(validateMilestone(rest)).toEqual([]);
  });

  it('returns an empty array when dueDate is empty string', () => {
    expect(validateMilestone(validPayload({ dueDate: '' }))).toEqual([]);
  });

  it('returns an empty array when dueDate is whitespace only', () => {
    expect(validateMilestone(validPayload({ dueDate: '   ' }))).toEqual([]);
  });

  it('returns an empty array when status is omitted', () => {
    const { status: _s, ...rest } = validPayload();
    expect(validateMilestone(rest)).toEqual([]);
  });

  it('accepts a payout of 1 (minimum positive)', () => {
    expect(validateMilestone(validPayload({ payout: '1' }))).toEqual([]);
  });

  it('accepts the payout exactly at MAX_PAYOUT_VALUE', () => {
    expect(validateMilestone(validPayload({ payout: String(MAX_PAYOUT_VALUE) }))).toEqual([]);
  });

  it('accepts a decimal payout within MAX_PAYOUT_DECIMAL_PLACES', () => {
    expect(validateMilestone(validPayload({ payout: '99.99' }))).toEqual([]);
  });

  it('accepts a payout with exactly one decimal place', () => {
    expect(validateMilestone(validPayload({ payout: '100.5' }))).toEqual([]);
  });

  it('accepts a payout with no decimal point', () => {
    expect(validateMilestone(validPayload({ payout: '500' }))).toEqual([]);
  });

  it('accepts all four ALLOWED_CURRENCIES', () => {
    for (const currency of ALLOWED_CURRENCIES) {
      const errors = validateMilestone(validPayload({ currency }));
      expect(errors).toEqual([]);
    }
  });

  it('accepts all five ALLOWED_STATUSES', () => {
    for (const status of ALLOWED_STATUSES) {
      const errors = validateMilestone(validPayload({ status }));
      expect(errors).toEqual([]);
    }
  });

  it('accepts a title exactly at MAX_MILESTONE_TITLE_LENGTH characters', () => {
    const title = 'a'.repeat(MAX_MILESTONE_TITLE_LENGTH);
    expect(validateMilestone(validPayload({ title }))).toEqual([]);
  });

  it('accepts a title with surrounding whitespace that trims to a valid length', () => {
    const paddedTitle = `  ${'a'.repeat(MAX_MILESTONE_TITLE_LENGTH)}  `;
    expect(validateMilestone(validPayload({ title: paddedTitle }))).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Title validation
// ─────────────────────────────────────────────────────────────────────────────

describe('title validation', () => {
  it('returns a required error for an empty title', () => {
    const errors = validateMilestone(validPayload({ title: '' }));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toEqual({
      fieldId: 'milestone-title',
      message: 'Title is required',
    });
  });

  it('returns a required error for a whitespace-only title', () => {
    const errors = validateMilestone(validPayload({ title: '   ' }));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toEqual({
      fieldId: 'milestone-title',
      message: 'Title is required',
    });
  });

  it('returns a required error for a title containing only control characters', () => {
    const errors = validateMilestone(validPayload({ title: '\u0000\u001F\u007F' }));
    expect(errors).toHaveLength(1);
    expect(errors[0].fieldId).toBe('milestone-title');
    expect(errors[0].message).toBe('Title is required');
  });

  it('returns an over-length error for a title one character beyond the max', () => {
    const title = 'a'.repeat(MAX_MILESTONE_TITLE_LENGTH + 1);
    const errors = validateMilestone(validPayload({ title }));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toEqual({
      fieldId: 'milestone-title',
      message: `Title must be no more than ${MAX_MILESTONE_TITLE_LENGTH} characters`,
    });
  });

  it('returns an over-length error even for a very long title', () => {
    const title = 'a'.repeat(MAX_MILESTONE_TITLE_LENGTH + 100);
    const errors = validateMilestone(validPayload({ title }));
    expect(errors).toHaveLength(1);
    expect(errors[0].fieldId).toBe('milestone-title');
  });

  it('does not truncate an over-long title — it rejects it', () => {
    // If the validator truncated, no error would be returned; we verify
    // it rejects instead.
    const title = 'a'.repeat(MAX_MILESTONE_TITLE_LENGTH + 1);
    const errors = validateMilestone(validPayload({ title }));
    const titleErrors = errors.filter((e) => e.fieldId === 'milestone-title');
    expect(titleErrors).toHaveLength(1);
    expect(titleErrors[0].message).toMatch(/no more than/i);
  });

  it('returns the required error before the length error (required takes priority)', () => {
    // An empty string is caught by the required check, not the length check.
    const errors = validateMilestone(validPayload({ title: '' }));
    expect(errors[0].message).toBe('Title is required');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Payout validation
// ─────────────────────────────────────────────────────────────────────────────

describe('payout validation', () => {
  describe('required', () => {
    it('returns a required error for an empty payout', () => {
      const errors = validateMilestone(validPayload({ payout: '' }));
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({
        fieldId: 'milestone-payout',
        message: 'Payout amount is required',
      });
    });

    it('returns a required error for a whitespace-only payout', () => {
      const errors = validateMilestone(validPayload({ payout: '   ' }));
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({
        fieldId: 'milestone-payout',
        message: 'Payout amount is required',
      });
    });
  });

  describe('must be a positive number', () => {
    it.each([
      ['non-numeric text', 'abc'],
      ['letters mixed with digits', '12abc'],
      ['NaN literal', 'NaN'],
      ['Infinity literal', 'Infinity'],
      ['-Infinity', '-Infinity'],
      ['zero', '0'],
      ['negative number', '-100'],
      ['negative decimal', '-0.5'],
    ])('returns a positive-number error for %s (%s)', (_, payout) => {
      const errors = validateMilestone(validPayload({ payout }));
      const payoutErrors = errors.filter((e) => e.fieldId === 'milestone-payout');
      expect(payoutErrors).toHaveLength(1);
      expect(payoutErrors[0].message).toBe('Payout must be a positive number');
    });

    it('accepts the smallest positive value (0.01)', () => {
      const errors = validateMilestone(validPayload({ payout: '0.01' }));
      expect(errors).toEqual([]);
    });
  });

  describe('maximum value', () => {
    it('returns an over-max error when payout exceeds MAX_PAYOUT_VALUE', () => {
      const errors = validateMilestone(
        validPayload({ payout: String(MAX_PAYOUT_VALUE + 1) }),
      );
      const payoutErrors = errors.filter((e) => e.fieldId === 'milestone-payout');
      expect(payoutErrors).toHaveLength(1);
      expect(payoutErrors[0].message).toMatch(/no more than/i);
      expect(payoutErrors[0].message).toContain(MAX_PAYOUT_VALUE.toLocaleString());
    });

    it('returns an over-max error for a very large value', () => {
      const errors = validateMilestone(validPayload({ payout: '99999999' }));
      const payoutErrors = errors.filter((e) => e.fieldId === 'milestone-payout');
      expect(payoutErrors).toHaveLength(1);
    });

    it('accepts MAX_PAYOUT_VALUE exactly', () => {
      const errors = validateMilestone(validPayload({ payout: String(MAX_PAYOUT_VALUE) }));
      expect(errors).toEqual([]);
    });
  });

  describe('decimal precision', () => {
    it('returns a precision error for more than MAX_PAYOUT_DECIMAL_PLACES decimal places', () => {
      const errors = validateMilestone(validPayload({ payout: '100.123' }));
      const payoutErrors = errors.filter((e) => e.fieldId === 'milestone-payout');
      expect(payoutErrors).toHaveLength(1);
      expect(payoutErrors[0].message).toMatch(/at most 2 decimal places/i);
    });

    it('returns a precision error for 3 decimal places', () => {
      const errors = validateMilestone(validPayload({ payout: '9.999' }));
      const payoutErrors = errors.filter((e) => e.fieldId === 'milestone-payout');
      expect(payoutErrors).toHaveLength(1);
    });

    it('accepts exactly 2 decimal places', () => {
      expect(validateMilestone(validPayload({ payout: '100.99' }))).toEqual([]);
    });

    it('accepts 1 decimal place', () => {
      expect(validateMilestone(validPayload({ payout: '100.5' }))).toEqual([]);
    });

    it('accepts 0 decimal places (integer)', () => {
      expect(validateMilestone(validPayload({ payout: '1000' }))).toEqual([]);
    });

    it('does not return a precision error for a zero-fractional suffix (100.)', () => {
      // "100." has one trailing decimal point but 0 fractional digits — valid
      const errors = validateMilestone(validPayload({ payout: '100.' }));
      // "100." parses as 100 (positive, within range); we only check
      // that the precision rule is not the one firing.
      const precisionErrors = errors.filter(
        (e) => e.fieldId === 'milestone-payout' && e.message.includes('decimal places'),
      );
      expect(precisionErrors).toHaveLength(0);
    });
  });

  describe('priority ordering (required > positive > max > precision)', () => {
    it('surfaces required error before positive-number error', () => {
      const errors = validateMilestone(validPayload({ payout: '' }));
      expect(errors[0].message).toBe('Payout amount is required');
    });

    it('surfaces positive-number error before max error', () => {
      const errors = validateMilestone(validPayload({ payout: '-1' }));
      expect(errors[0].message).toBe('Payout must be a positive number');
    });

    it('surfaces max error before precision error (when value is over max with bad precision)', () => {
      // 10_000_001.999 is both > max and has 3 decimal places
      const errors = validateMilestone(
        validPayload({ payout: `${MAX_PAYOUT_VALUE + 1}.999` }),
      );
      expect(errors[0].message).toMatch(/no more than/i);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Currency validation
// ─────────────────────────────────────────────────────────────────────────────

describe('currency validation', () => {
  it('returns a required error for an empty currency', () => {
    const errors = validateMilestone(validPayload({ currency: '' }));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toEqual({
      fieldId: 'milestone-currency',
      message: 'Currency is required',
    });
  });

  it('returns a required error for a whitespace-only currency', () => {
    const errors = validateMilestone(validPayload({ currency: '   ' }));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toEqual({
      fieldId: 'milestone-currency',
      message: 'Currency is required',
    });
  });

  it('returns an invalid-currency error for an unrecognised code', () => {
    const errors = validateMilestone(validPayload({ currency: 'JPY' }));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toEqual({
      fieldId: 'milestone-currency',
      message: `Currency must be one of: ${ALLOWED_CURRENCIES.join(', ')}`,
    });
  });

  it('returns an invalid-currency error for a made-up string', () => {
    const errors = validateMilestone(validPayload({ currency: 'NOTREAL' }));
    const currencyErrors = errors.filter((e) => e.fieldId === 'milestone-currency');
    expect(currencyErrors).toHaveLength(1);
  });

  it.each(['USD', 'EUR', 'GBP', 'XLM'])('accepts the allowed currency %s', (currency) => {
    const errors = validateMilestone(validPayload({ currency }));
    const currencyErrors = errors.filter((e) => e.fieldId === 'milestone-currency');
    expect(currencyErrors).toHaveLength(0);
  });

  it('is case-insensitive (accepts lowercase allowed codes)', () => {
    const errors = validateMilestone(validPayload({ currency: 'usd' }));
    const currencyErrors = errors.filter((e) => e.fieldId === 'milestone-currency');
    expect(currencyErrors).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Due date validation (optional field)
// ─────────────────────────────────────────────────────────────────────────────

describe('dueDate validation', () => {
  describe('valid formats', () => {
    it.each([
      'Jan 1, 2025',
      'Feb 28, 2025',
      'Mar 5, 2026',
      'Apr 01, 2025',
      'May 15, 2025',
      'Jun 1, 2025',
      'Jul 4, 2026',
      'Aug 31, 2025',
      'Sep 9, 2025',
      'Oct 10, 2025',
      'Nov 11, 2025',
      'Dec 25, 2025',
    ])('accepts the canonical short-month format "%s"', (dueDate) => {
      const errors = validateMilestone(validPayload({ dueDate }));
      const dueDateErrors = errors.filter((e) => e.fieldId === 'milestone-dueDate');
      expect(dueDateErrors).toHaveLength(0);
    });

    it.each([
      'January 1, 2025',
      'February 28, 2025',
      'March 5, 2026',
      'April 01, 2025',
      'June 1, 2025',
      'July 4, 2026',
      'August 31, 2025',
      'September 9, 2025',
      'October 10, 2025',
      'November 11, 2025',
      'December 25, 2025',
    ])('accepts the full-month format "%s"', (dueDate) => {
      const errors = validateMilestone(validPayload({ dueDate }));
      const dueDateErrors = errors.filter((e) => e.fieldId === 'milestone-dueDate');
      expect(dueDateErrors).toHaveLength(0);
    });

    it('accepts an omitted dueDate field', () => {
      const { dueDate: _d, ...rest } = validPayload();
      expect(validateMilestone(rest)).toEqual([]);
    });

    it('accepts dueDate explicitly set to undefined', () => {
      // Exercises the `values.dueDate ?? ''` null-coalescing fallback branch
      expect(validateMilestone(validPayload({ dueDate: undefined }))).toEqual([]);
    });

    it('accepts an empty dueDate string', () => {
      expect(validateMilestone(validPayload({ dueDate: '' }))).toEqual([]);
    });

    it('accepts a whitespace-only dueDate string', () => {
      expect(validateMilestone(validPayload({ dueDate: '   ' }))).toEqual([]);
    });
  });

  describe('invalid formats', () => {
    it.each([
      ['ISO date', '2025-06-01'],
      ['US slash format', '06/01/2025'],
      ['purely numeric', '01012025'],
      ['free-form word', 'tomorrow'],
      ['relative phrase', 'next week'],
      ['ASAP', 'asap'],
      ['day-month-year slash', '1/6/2025'],
      ['missing year', 'Jun 1'],
      ['missing day', 'Jun 2025'],
      ['no comma', 'Jun 1 2025'],
    ])('rejects the format "%s" (%s)', (_, dueDate) => {
      const errors = validateMilestone(validPayload({ dueDate }));
      const dueDateErrors = errors.filter((e) => e.fieldId === 'milestone-dueDate');
      expect(dueDateErrors).toHaveLength(1);
      expect(dueDateErrors[0].message).toMatch(/Jun 1, 2025/);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Status validation (optional field)
// ─────────────────────────────────────────────────────────────────────────────

describe('status validation', () => {
  it.each(ALLOWED_STATUSES)('accepts the allowed status "%s"', (status) => {
    const errors = validateMilestone(validPayload({ status }));
    const statusErrors = errors.filter((e) => e.fieldId === 'milestone-status');
    expect(statusErrors).toHaveLength(0);
  });

  it('returns an invalid-status error for an unrecognised value', () => {
    const errors = validateMilestone(validPayload({ status: 'Unknown' }));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toEqual({
      fieldId: 'milestone-status',
      message: `Status must be one of: ${ALLOWED_STATUSES.join(', ')}`,
    });
  });

  it('does not validate an omitted status field (undefined)', () => {
    // Explicitly pass undefined to exercise the `values.status ?? ''` branch
    const errors = validateMilestone(validPayload({ status: undefined }));
    const statusErrors = errors.filter((e) => e.fieldId === 'milestone-status');
    expect(statusErrors).toHaveLength(0);
  });

  it('does not validate an empty status string', () => {
    const errors = validateMilestone(validPayload({ status: '' }));
    const statusErrors = errors.filter((e) => e.fieldId === 'milestone-status');
    expect(statusErrors).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Multiple simultaneous errors
// ─────────────────────────────────────────────────────────────────────────────

describe('multiple errors', () => {
  it('returns errors for all empty required fields in deterministic order', () => {
    const errors = validateMilestone({
      title: '',
      payout: '',
      currency: '',
    });

    expect(errors).toHaveLength(3);
    expect(errors[0].fieldId).toBe('milestone-title');
    expect(errors[1].fieldId).toBe('milestone-payout');
    expect(errors[2].fieldId).toBe('milestone-currency');
  });

  it('accumulates title, payout, currency, and dueDate errors simultaneously', () => {
    const errors = validateMilestone({
      title: '',
      payout: '-1',
      currency: 'INVALID',
      dueDate: '2025-01-01',
      status: 'BadStatus',
    });

    const fieldIds = errors.map((e) => e.fieldId);
    expect(fieldIds).toContain('milestone-title');
    expect(fieldIds).toContain('milestone-payout');
    expect(fieldIds).toContain('milestone-currency');
    expect(fieldIds).toContain('milestone-dueDate');
    expect(fieldIds).toContain('milestone-status');
  });

  it('returns errors in field-declaration order (title, payout, currency, dueDate, status)', () => {
    const errors = validateMilestone({
      title: '',
      payout: '',
      currency: '',
      dueDate: '2025-01-01', // invalid format
      status: 'Wrong',
    });

    const fieldIds = errors.map((e) => e.fieldId);
    const titleIdx = fieldIds.indexOf('milestone-title');
    const payoutIdx = fieldIds.indexOf('milestone-payout');
    const currencyIdx = fieldIds.indexOf('milestone-currency');
    const dueDateIdx = fieldIds.indexOf('milestone-dueDate');
    const statusIdx = fieldIds.indexOf('milestone-status');

    expect(titleIdx).toBeLessThan(payoutIdx);
    expect(payoutIdx).toBeLessThan(currencyIdx);
    expect(currencyIdx).toBeLessThan(dueDateIdx);
    expect(dueDateIdx).toBeLessThan(statusIdx);
  });

  it('reports only one error per field even when multiple rules are violated', () => {
    // An over-long title also satisfies "required"; only the more specific
    // error (length) should be returned — but we just test no duplicate fields.
    const title = 'a'.repeat(MAX_MILESTONE_TITLE_LENGTH + 1);
    const errors = validateMilestone(validPayload({ title }));
    const titleErrors = errors.filter((e) => e.fieldId === 'milestone-title');
    expect(titleErrors).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Edge / boundary cases
// ─────────────────────────────────────────────────────────────────────────────

describe('edge cases', () => {
  it('accepts a title that is exactly one character long', () => {
    expect(validateMilestone(validPayload({ title: 'x' }))).toEqual([]);
  });

  it('handles a payout string with leading/trailing whitespace', () => {
    const errors = validateMilestone(validPayload({ payout: '  500  ' }));
    // Trimming happens inside the validator; should be valid
    expect(errors.filter((e) => e.fieldId === 'milestone-payout')).toHaveLength(0);
  });

  it('handles a dueDate string with leading/trailing whitespace that matches after trimming', () => {
    const errors = validateMilestone(validPayload({ dueDate: '  Jun 1, 2025  ' }));
    const dueDateErrors = errors.filter((e) => e.fieldId === 'milestone-dueDate');
    expect(dueDateErrors).toHaveLength(0);
  });

  it('treats a payout of "0.00" as non-positive', () => {
    const errors = validateMilestone(validPayload({ payout: '0.00' }));
    const payoutErrors = errors.filter((e) => e.fieldId === 'milestone-payout');
    expect(payoutErrors).toHaveLength(1);
    expect(payoutErrors[0].message).toBe('Payout must be a positive number');
  });

  it('treats a payout of "0.001" as non-positive (0.001 > 0, so it is positive)', () => {
    // 0.001 is positive but has 3 decimal places
    const errors = validateMilestone(validPayload({ payout: '0.001' }));
    const payoutErrors = errors.filter((e) => e.fieldId === 'milestone-payout');
    expect(payoutErrors).toHaveLength(1);
    expect(payoutErrors[0].message).toMatch(/decimal places/i);
  });

  it('returns an empty error array for a payout of "0.01" (boundary: smallest valid 2dp value)', () => {
    expect(validateMilestone(validPayload({ payout: '0.01' }))).toEqual([]);
  });

  it('is a pure function — calling it twice with the same input returns the same result', () => {
    const input = validPayload({ title: '', payout: '-5', currency: '' });
    expect(validateMilestone(input)).toEqual(validateMilestone(input));
  });

  it('does not mutate the input values object', () => {
    const input = validPayload({ title: '  My Milestone  ', payout: '100' });
    const inputCopy = { ...input };
    validateMilestone(input);
    expect(input).toEqual(inputCopy);
  });
});
