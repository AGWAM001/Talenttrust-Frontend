import {
  FORBIDDEN_PATCH_FIELDS,
  validateMilestonePatch,
} from '../validateMilestonePatch';
import {
  MAX_MILESTONE_TITLE_LENGTH,
  MAX_PAYOUT_VALUE,
} from '../validateMilestone';

describe('validateMilestonePatch', () => {
  // ── Accepted inputs ───────────────────────────────────────────────────────
  it('accepts a valid full patch and sanitises its values', () => {
    const result = validateMilestonePatch('ms-1', {
      title: '  Design   review  ',
      payout: 1500,
      currency: 'usd',
      status: 'Completed',
      dueDate: '  Jun 1, 2025  ',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sanitized).toEqual({
        title: 'Design review',
        payout: 1500,
        currency: 'USD',
        status: 'Completed',
        dueDate: 'Jun 1, 2025',
      });
    }
  });

  it('accepts a partial patch (only the present fields are validated)', () => {
    const result = validateMilestonePatch('ms-1', { status: 'Paid' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sanitized).toEqual({ status: 'Paid' });
    }
  });

  it('treats a whitespace-only title as required-but-missing', () => {
    const result = validateMilestonePatch('ms-1', { title: '   ' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].message).toMatch(/Title is required/i);
    }
  });

  // ── Rejected inputs ───────────────────────────────────────────────────────
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['array', [{ title: 'x' }]],
    ['string', 'title=hack'],
    ['number', 42],
  ])('rejects a non-object patch (%s)', (_label, patch) => {
    const result = validateMilestonePatch('ms-1', patch);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].fieldId).toBe('milestone-patch');
    }
  });

  it.each([
    ['title', 42],
    ['title', null],
    ['title', {}],
    ['payout', '1500'],
    ['payout', NaN],
    ['payout', Infinity],
    ['payout', -Infinity],
    ['payout', null],
    ['currency', 42],
    ['currency', '   '],
    ['currency', 'BTC'],
    ['status', 'UNKNOWN'],
    ['status', 42],
    ['status', 'completed'],
    ['dueDate', 42],
  ])('rejects invalid %s value (%p)', (field, value) => {
    const result = validateMilestonePatch('ms-1', { [field]: value });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].fieldId).toBe(`milestone-patch-${field}`);
    }
  });

  it('collects every field error at once', () => {
    const result = validateMilestonePatch('ms-1', {
      title: '',
      payout: -5,
      currency: 'BTC',
      status: 'UNKNOWN',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toHaveLength(4);
      expect(result.errors.map((e) => e.fieldId)).toEqual([
        'milestone-patch-title',
        'milestone-patch-payout',
        'milestone-patch-currency',
        'milestone-patch-status',
      ]);
    }
  });

  // ── Boundary values ───────────────────────────────────────────────────────
  it(`accepts a title of exactly ${MAX_MILESTONE_TITLE_LENGTH} chars and rejects one over`, () => {
    const ok = validateMilestonePatch('ms-1', { title: 'a'.repeat(MAX_MILESTONE_TITLE_LENGTH) });
    expect(ok.ok).toBe(true);

    const tooLong = validateMilestonePatch('ms-1', { title: `${'a'.repeat(MAX_MILESTONE_TITLE_LENGTH)}b` });
    expect(tooLong.ok).toBe(false);
    if (!tooLong.ok) {
      expect(tooLong.errors[0].message).toMatch(new RegExp(String(MAX_MILESTONE_TITLE_LENGTH)));
    }
  });

  it('measures title length after control-character removal, not before', () => {
    // 150 visible chars + 100 control chars: fine once sanitised, over-limit
    // only if raw length were (wrongly) measured.
    const raw = `${'a'.repeat(MAX_MILESTONE_TITLE_LENGTH)}${'\u0000'.repeat(50)}`;
    const result = validateMilestonePatch('ms-1', { title: raw });
    expect(result.ok).toBe(true);
  });

  it(`accepts a payout of exactly ${MAX_PAYOUT_VALUE.toLocaleString()} and rejects one above`, () => {
    expect(validateMilestonePatch('ms-1', { payout: MAX_PAYOUT_VALUE }).ok).toBe(true);
    expect(
      validateMilestonePatch('ms-1', { payout: MAX_PAYOUT_VALUE + 0.01 }).ok,
    ).toBe(false);
  });

  it('enforces the payout boundary at zero', () => {
    expect(validateMilestonePatch('ms-1', { payout: 0 }).ok).toBe(false);
    expect(validateMilestonePatch('ms-1', { payout: 0.01 }).ok).toBe(true);
  });

  it('accepts two decimal places and rejects three', () => {
    expect(validateMilestonePatch('ms-1', { payout: 10.99 }).ok).toBe(true);
    const result = validateMilestonePatch('ms-1', { payout: 10.999 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].message).toMatch(/decimal places/i);
    }
  });

  it('accepts every allowed status and currency', () => {
    for (const status of ['Pending', 'Active', 'Completed', 'Paid', 'Disputed']) {
      expect(validateMilestonePatch('ms-1', { status }).ok).toBe(true);
    }
    for (const currency of ['USD', 'EUR', 'GBP', 'XLM']) {
      expect(validateMilestonePatch('ms-1', { currency }).ok).toBe(true);
    }
  });

  it('normalises an explicit clearing of dueDate to undefined', () => {
    const result = validateMilestonePatch('ms-1', { dueDate: undefined });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sanitized.dueDate).toBeUndefined();
    }
  });

  // ── Duplicate / identity defence ─────────────────────────────────────────
  it.each(FORBIDDEN_PATCH_FIELDS)('rejects an attempt to change "%s"', (field) => {
    const patch: Record<string, unknown> =
      field === 'version' ? { version: 99 } : { [field]: 'hijack' };
    const result = validateMilestonePatch('ms-1', patch);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].fieldId).toBe('milestone-patch');
      expect(result.errors[0].message).toContain(field);
    }
  });

  it('rejects an empty patch — there is nothing to persist', () => {
    const result = validateMilestonePatch('ms-1', {});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].message).toMatch(/no valid/i);
    }
  });

  it('rejects a patch whose only key is an unknown field', () => {
    const result = validateMilestonePatch('ms-1', { bogusField: 'x' } as never);
    expect(result.ok).toBe(false);
  });
});
