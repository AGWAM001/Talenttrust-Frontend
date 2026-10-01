import { validateReputationEvent } from './validateReputationEvent';

function validPayload(overrides: Record<string, string> = {}) {
  return {
    type: 'Verification',
    summary: 'Completed identity verification',
    date: '2026-04-24',
    ...overrides,
  };
}

describe('validateReputationEvent', () => {
  describe('type', () => {
    it('returns a required error when type is empty', () => {
      const errors = validateReputationEvent(validPayload({ type: '' }));
      expect(errors).toHaveLength(1);
      expect(errors[0].fieldId).toBe('type');
      expect(errors[0].message).toBe('Type is required');
    });

    it('returns a required error when type is whitespace only', () => {
      const errors = validateReputationEvent(validPayload({ type: '   ' }));
      expect(errors).toHaveLength(1);
      expect(errors[0].fieldId).toBe('type');
      expect(errors[0].message).toBe('Type is required');
    });

    it('trims surrounding whitespace and accepts the value', () => {
      const errors = validateReputationEvent(validPayload({ type: '  Verification  ' }));
      expect(errors).toEqual([]);
    });
  });

  describe('summary', () => {
    it('returns a required error when summary is empty', () => {
      const errors = validateReputationEvent(validPayload({ summary: '' }));
      expect(errors).toHaveLength(1);
      expect(errors[0].fieldId).toBe('summary');
      expect(errors[0].message).toBe('Summary is required');
    });

    it('returns a required error when summary is whitespace only', () => {
      const errors = validateReputationEvent(validPayload({ summary: '   ' }));
      expect(errors).toHaveLength(1);
      expect(errors[0].fieldId).toBe('summary');
      expect(errors[0].message).toBe('Summary is required');
    });

    it('trims surrounding whitespace and accepts the value', () => {
      const errors = validateReputationEvent(validPayload({ summary: '  Hello  ' }));
      expect(errors).toEqual([]);
    });
  });

  describe('date', () => {
    it('returns a required error when date is empty', () => {
      const errors = validateReputationEvent(validPayload({ date: '' }));
      expect(errors).toHaveLength(1);
      expect(errors[0].fieldId).toBe('date');
      expect(errors[0].message).toBe('Date is required');
    });

    it('returns a required error when date is whitespace only', () => {
      const errors = validateReputationEvent(validPayload({ date: '   ' }));
      expect(errors).toHaveLength(1);
      expect(errors[0].fieldId).toBe('date');
      expect(errors[0].message).toBe('Date is required');
    });

    it('returns a format error for a non-parseable date string', () => {
      const errors = validateReputationEvent(validPayload({ date: 'not-a-date' }));
      expect(errors).toHaveLength(1);
      expect(errors[0].fieldId).toBe('date');
      expect(errors[0].message).toBe('Date must be a valid date');
    });

    it('accepts a valid ISO date string', () => {
      const errors = validateReputationEvent(validPayload({ date: '2026-04-24' }));
      const dateErrors = errors.filter((e) => e.fieldId === 'date');
      expect(dateErrors).toHaveLength(0);
    });

    it('accepts a valid datetime string', () => {
      const errors = validateReputationEvent(validPayload({ date: '2026-04-24T12:00:00Z' }));
      const dateErrors = errors.filter((e) => e.fieldId === 'date');
      expect(dateErrors).toHaveLength(0);
    });
  });

  describe('multiple errors', () => {
    it('returns errors for all empty fields in deterministic order', () => {
      const errors = validateReputationEvent({ type: '', summary: '', date: '' });
      expect(errors).toHaveLength(3);
      expect(errors[0].fieldId).toBe('type');
      expect(errors[1].fieldId).toBe('summary');
      expect(errors[2].fieldId).toBe('date');
    });

    it('returns errors for multiple invalid fields simultaneously', () => {
      const errors = validateReputationEvent({ type: '', summary: '  ', date: 'bad' });
      expect(errors).toHaveLength(3);
      expect(errors[0].fieldId).toBe('type');
      expect(errors[0].message).toBe('Type is required');
      expect(errors[1].fieldId).toBe('summary');
      expect(errors[1].message).toBe('Summary is required');
      expect(errors[2].fieldId).toBe('date');
      expect(errors[2].message).toBe('Date must be a valid date');
    });
  });

  describe('valid payload', () => {
    it('returns an empty array for fully valid input', () => {
      const errors = validateReputationEvent(validPayload());
      expect(errors).toEqual([]);
    });
  });
});
