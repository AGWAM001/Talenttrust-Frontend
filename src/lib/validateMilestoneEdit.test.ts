import { validateMilestoneEdit, MILESTONE_EDIT_FIELD_IDS } from './validateMilestoneEdit';
import { MAX_MILESTONE_TITLE_LENGTH } from '@/components/milestones/MilestoneCreationForm';

const validValues = () => ({
  title: 'My Milestone',
  payout: '500',
  currency: 'USD',
});

describe('validateMilestoneEdit', () => {
  describe('happy path', () => {
    it('returns no errors for a fully valid form', () => {
      expect(validateMilestoneEdit(validValues())).toEqual([]);
    });

    it('returns no errors for boundary values (max title length, lowest payout, etc.)', () => {
      expect(
        validateMilestoneEdit({
          title: 'a'.repeat(MAX_MILESTONE_TITLE_LENGTH),
          payout: '0.01',
          currency: 'USD',
        }),
      ).toEqual([]);
    });
  });

  describe('title field (milestone-edit-title)', () => {
    it('flags an empty title', () => {
      const errors = validateMilestoneEdit({ ...validValues(), title: '' });
      expect(errors).toEqual([
        { fieldId: MILESTONE_EDIT_FIELD_IDS.title, message: 'Title is required' },
      ]);
    });

    it('flags a whitespace-only title', () => {
      const errors = validateMilestoneEdit({ ...validValues(), title: '   ' });
      expect(errors).toEqual([
        { fieldId: MILESTONE_EDIT_FIELD_IDS.title, message: 'Title is required' },
      ]);
    });

    it('flags an over-length title without truncating it', () => {
      const errors = validateMilestoneEdit({
        ...validValues(),
        title: 'a'.repeat(MAX_MILESTONE_TITLE_LENGTH + 1),
      });
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({
        fieldId: MILESTONE_EDIT_FIELD_IDS.title,
        message: `Title must be no more than ${MAX_MILESTONE_TITLE_LENGTH} characters`,
      });
    });

    it('normalises control characters and whitespace before measuring length', () => {
      // The unbounded length is 0 after sanitization → required error.
      const errors = validateMilestoneEdit({ ...validValues(), title: '\u0000\n   ' });
      expect(errors).toEqual([
        { fieldId: MILESTONE_EDIT_FIELD_IDS.title, message: 'Title is required' },
      ]);
    });

    it('counts the unpadded, normalised length against the cap (not the raw value)', () => {
      // Raw input is 205 chars (200-char title plus leading/trailing
      // padding), but padding is trimmed before measuring length, leaving
      // exactly 200 → no over-length error.
      const raw = '  ' + 'a'.repeat(200) + '   ';
      expect(validateMilestoneEdit({ ...validValues(), title: raw })).toEqual([]);
    });

    it('flags over-length when normalised content still exceeds the cap', () => {
      const raw = 'a'.repeat(MAX_MILESTONE_TITLE_LENGTH + 5);
      const errors = validateMilestoneEdit({ ...validValues(), title: raw });
      expect(errors[0]?.message).toContain(`no more than ${MAX_MILESTONE_TITLE_LENGTH}`);
    });
  });

  describe('payout field (milestone-edit-payout)', () => {
    it('flags an empty payout', () => {
      const errors = validateMilestoneEdit({ ...validValues(), payout: '' });
      expect(errors).toEqual([
        { fieldId: MILESTONE_EDIT_FIELD_IDS.payout, message: 'Payout amount is required' },
      ]);
    });

    it('flags a whitespace-only payout', () => {
      const errors = validateMilestoneEdit({ ...validValues(), payout: '   ' });
      expect(errors).toEqual([
        { fieldId: MILESTONE_EDIT_FIELD_IDS.payout, message: 'Payout amount is required' },
      ]);
    });

    it('flags a non-numeric payout', () => {
      const errors = validateMilestoneEdit({ ...validValues(), payout: 'abc' });
      expect(errors).toEqual([
        { fieldId: MILESTONE_EDIT_FIELD_IDS.payout, message: 'Payout must be a positive number' },
      ]);
    });

    it('flags a zero payout', () => {
      const errors = validateMilestoneEdit({ ...validValues(), payout: '0' });
      expect(errors).toEqual([
        { fieldId: MILESTONE_EDIT_FIELD_IDS.payout, message: 'Payout must be a positive number' },
      ]);
    });

    it('flags a negative payout', () => {
      const errors = validateMilestoneEdit({ ...validValues(), payout: '-100' });
      expect(errors).toEqual([
        { fieldId: MILESTONE_EDIT_FIELD_IDS.payout, message: 'Payout must be a positive number' },
      ]);
    });

    it('accepts decimal payout values', () => {
      expect(validateMilestoneEdit({ ...validValues(), payout: '99.99' })).toEqual([]);
    });

    it('accepts very large payout values', () => {
      expect(validateMilestoneEdit({ ...validValues(), payout: '1000000' })).toEqual([]);
    });
  });

  describe('currency field (milestone-edit-currency)', () => {
    it('flags an empty currency', () => {
      const errors = validateMilestoneEdit({ ...validValues(), currency: '' });
      expect(errors).toEqual([
        { fieldId: MILESTONE_EDIT_FIELD_IDS.currency, message: 'Currency is required' },
      ]);
    });

    it('flags a whitespace-only currency', () => {
      const errors = validateMilestoneEdit({ ...validValues(), currency: '   ' });
      expect(errors).toEqual([
        { fieldId: MILESTONE_EDIT_FIELD_IDS.currency, message: 'Currency is required' },
      ]);
    });

    it('accepts any non-empty currency string', () => {
      for (const c of ['USD', 'EUR', 'GBP', 'XLM', 'NGN', 'JPY']) {
        expect(validateMilestoneEdit({ ...validValues(), currency: c })).toEqual([]);
      }
    });
  });

  describe('multiple errors', () => {
    it('reports all invalid fields at once', () => {
      const errors = validateMilestoneEdit({
        title: '',
        payout: 'abc',
        currency: '',
      });
      expect(errors).toHaveLength(3);
      const ids = errors.map((e) => e.fieldId).sort();
      expect(ids).toEqual(
        [
          MILESTONE_EDIT_FIELD_IDS.title,
          MILESTONE_EDIT_FIELD_IDS.payout,
          MILESTONE_EDIT_FIELD_IDS.currency,
        ].sort(),
      );
    });
  });

  describe('field id constants', () => {
    it('exposes stable ids for the row component to reference', () => {
      expect(MILESTONE_EDIT_FIELD_IDS.title).toBe('milestone-edit-title');
      expect(MILESTONE_EDIT_FIELD_IDS.payout).toBe('milestone-edit-payout');
      expect(MILESTONE_EDIT_FIELD_IDS.currency).toBe('milestone-edit-currency');
    });
  });
});
