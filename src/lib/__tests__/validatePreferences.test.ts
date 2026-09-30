import { validatePreferences, MIN_IDLE_DISCONNECT_MS, MAX_IDLE_DISCONNECT_MS } from '../validatePreferences';

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    theme: 'light',
    amountFormat: 'usd',
    toastDensity: 'relaxed',
    formDensity: 'comfortable',
    milestonesDensity: 'comfortable',
    walletDensity: 'comfortable',
    contractsDensity: 'comfortable',
    quietMode: false,
    toastDuration: 'normal',
    idleDisconnectMs: '',
    ...overrides,
  };
}

describe('validatePreferences', () => {
  describe('valid payload', () => {
    it('returns no errors for fully valid input', () => {
      expect(validatePreferences(validPayload())).toEqual([]);
    });

    it('accepts all valid theme values', () => {
      for (const theme of ['light', 'dark', 'system']) {
        expect(validatePreferences(validPayload({ theme }))).toEqual([]);
      }
    });

    it('accepts all valid amountFormat values', () => {
      for (const v of ['usd', 'ngn', 'compact']) {
        expect(validatePreferences(validPayload({ amountFormat: v }))).toEqual([]);
      }
    });

    it('accepts all valid toastDensity values', () => {
      for (const v of ['relaxed', 'compact']) {
        expect(validatePreferences(validPayload({ toastDensity: v }))).toEqual([]);
      }
    });

    it('accepts all valid formDensity values', () => {
      for (const v of ['comfortable', 'compact']) {
        expect(validatePreferences(validPayload({ formDensity: v }))).toEqual([]);
      }
    });

    it('accepts all valid milestonesDensity values', () => {
      for (const v of ['comfortable', 'compact']) {
        expect(validatePreferences(validPayload({ milestonesDensity: v }))).toEqual([]);
      }
    });

    it('accepts all valid walletDensity values', () => {
      for (const v of ['comfortable', 'compact']) {
        expect(validatePreferences(validPayload({ walletDensity: v }))).toEqual([]);
      }
    });

    it('accepts all valid contractsDensity values', () => {
      for (const v of ['comfortable', 'compact']) {
        expect(validatePreferences(validPayload({ contractsDensity: v }))).toEqual([]);
      }
    });

    it('accepts all valid toastDuration values', () => {
      for (const v of ['short', 'normal', 'long', 'persistent']) {
        expect(validatePreferences(validPayload({ toastDuration: v }))).toEqual([]);
      }
    });
  });

  describe('theme validation', () => {
    it('rejects invalid theme value', () => {
      const errors = validatePreferences(validPayload({ theme: 'red' }));
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({ fieldId: 'pref-theme', message: 'Theme must be one of: light, dark, or system' });
    });

    it('rejects empty theme', () => {
      const errors = validatePreferences(validPayload({ theme: '' }));
      expect(errors).toHaveLength(1);
      expect(errors[0].fieldId).toBe('pref-theme');
    });
  });

  describe('amountFormat validation', () => {
    it('rejects invalid amountFormat', () => {
      const errors = validatePreferences(validPayload({ amountFormat: 'eur' }));
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({ fieldId: 'pref-amountFormat', message: 'Currency display must be one of: usd, ngn, or compact' });
    });

    it('rejects empty amountFormat', () => {
      const errors = validatePreferences(validPayload({ amountFormat: '' }));
      expect(errors).toHaveLength(1);
      expect(errors[0].fieldId).toBe('pref-amountFormat');
    });
  });

  describe('toastDensity validation', () => {
    it('rejects invalid toastDensity', () => {
      const errors = validatePreferences(validPayload({ toastDensity: 'wide' }));
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({ fieldId: 'pref-toastDensity', message: 'Toast density must be relaxed or compact' });
    });

    it('rejects empty toastDensity', () => {
      const errors = validatePreferences(validPayload({ toastDensity: '' }));
      expect(errors).toHaveLength(1);
      expect(errors[0].fieldId).toBe('pref-toastDensity');
    });
  });

  describe('formDensity validation', () => {
    it('rejects invalid formDensity', () => {
      const errors = validatePreferences(validPayload({ formDensity: 'spacious' }));
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({ fieldId: 'pref-formDensity', message: 'Form density must be comfortable or compact' });
    });
  });

  describe('milestonesDensity validation', () => {
    it('rejects invalid milestonesDensity', () => {
      const errors = validatePreferences(validPayload({ milestonesDensity: 'spacious' }));
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({ fieldId: 'pref-milestonesDensity', message: 'Milestones density must be comfortable or compact' });
    });
  });

  describe('walletDensity validation', () => {
    it('rejects invalid walletDensity', () => {
      const errors = validatePreferences(validPayload({ walletDensity: 'spacious' }));
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({ fieldId: 'pref-walletDensity', message: 'Wallet density must be comfortable or compact' });
    });
  });

  describe('contractsDensity validation', () => {
    it('rejects invalid contractsDensity', () => {
      const errors = validatePreferences(validPayload({ contractsDensity: 'spacious' }));
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({ fieldId: 'pref-contractsDensity', message: 'Contracts density must be comfortable or compact' });
    });
  });

  describe('toastDuration validation', () => {
    it('rejects invalid toastDuration', () => {
      const errors = validatePreferences(validPayload({ toastDuration: 'forever' }));
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({ fieldId: 'pref-toastDuration', message: 'Toast duration must be short, normal, long, or persistent' });
    });

    it('rejects empty toastDuration', () => {
      const errors = validatePreferences(validPayload({ toastDuration: '' }));
      expect(errors).toHaveLength(1);
      expect(errors[0].fieldId).toBe('pref-toastDuration');
    });
  });

  describe('idleDisconnectMs validation', () => {
    it('accepts empty idleDisconnectMs (default: disabled)', () => {
      const errors = validatePreferences(validPayload({ idleDisconnectMs: '' }));
      expect(errors).toEqual([]);
    });

    it('accepts 0 (disabled)', () => {
      const errors = validatePreferences(validPayload({ idleDisconnectMs: '0' }));
      expect(errors).toEqual([]);
    });

    it('accepts a valid value within the allowed range', () => {
      const errors = validatePreferences(validPayload({ idleDisconnectMs: '10000' }));
      expect(errors).toEqual([]);
    });

    it('accepts MIN_IDLE_DISCONNECT_MS', () => {
      const errors = validatePreferences(validPayload({ idleDisconnectMs: String(MIN_IDLE_DISCONNECT_MS) }));
      expect(errors).toEqual([]);
    });

    it('accepts MAX_IDLE_DISCONNECT_MS', () => {
      const errors = validatePreferences(validPayload({ idleDisconnectMs: String(MAX_IDLE_DISCONNECT_MS) }));
      expect(errors).toEqual([]);
    });

    it('rejects value below minimum (non-zero)', () => {
      const errors = validatePreferences(validPayload({ idleDisconnectMs: '4999' }));
      expect(errors).toHaveLength(1);
      expect(errors[0].fieldId).toBe('pref-idleDisconnectMs');
      expect(errors[0].message).toContain('0 (disabled)');
      expect(errors[0].message).toContain(String(MIN_IDLE_DISCONNECT_MS));
      expect(errors[0].message).toContain(String(MAX_IDLE_DISCONNECT_MS));
    });

    it('rejects value above maximum', () => {
      const errors = validatePreferences(validPayload({ idleDisconnectMs: '30001' }));
      expect(errors).toHaveLength(1);
      expect(errors[0].fieldId).toBe('pref-idleDisconnectMs');
      expect(errors[0].message).toContain('0 (disabled)');
    });

    it('rejects floating point value', () => {
      const errors = validatePreferences(validPayload({ idleDisconnectMs: '10.5' }));
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({ fieldId: 'pref-idleDisconnectMs', message: 'Idle disconnect must be a whole number' });
    });

    it('rejects scientific notation', () => {
      const errors = validatePreferences(validPayload({ idleDisconnectMs: '1e4' }));
      expect(errors).toHaveLength(1);
      expect(errors[0].fieldId).toBe('pref-idleDisconnectMs');
      expect(errors[0].message).toBe('Idle disconnect must be a whole number');
    });

    it('rejects non-numeric text', () => {
      const errors = validatePreferences(validPayload({ idleDisconnectMs: 'abc' }));
      expect(errors).toHaveLength(1);
      expect(errors[0].fieldId).toBe('pref-idleDisconnectMs');
      expect(errors[0].message).toBe('Idle disconnect must be a whole number');
    });

    it('rejects negative values (non-zero)', () => {
      const errors = validatePreferences(validPayload({ idleDisconnectMs: '-5000' }));
      expect(errors).toHaveLength(1);
      expect(errors[0].fieldId).toBe('pref-idleDisconnectMs');
    });

    it('rejects whitespace-only', () => {
      const errors = validatePreferences(validPayload({ idleDisconnectMs: '   ' }));
      const idleErrors = errors.filter((e) => e.fieldId === 'pref-idleDisconnectMs');
      expect(idleErrors).toHaveLength(0);
    });
  });

  describe('multiple errors', () => {
    it('returns errors for all invalid fields', () => {
      const errors = validatePreferences({
        theme: 'red',
        amountFormat: 'xyz',
        toastDensity: 'wide',
        formDensity: 'spacious',
        milestonesDensity: 'spacious',
        walletDensity: 'spacious',
        contractsDensity: 'spacious',
        quietMode: false,
        toastDuration: 'forever',
        idleDisconnectMs: '10.5',
      });
      expect(errors).toHaveLength(9);
      expect(errors[0].fieldId).toBe('pref-theme');
      expect(errors[8].fieldId).toBe('pref-idleDisconnectMs');
    });

    it('returns errors in deterministic field order', () => {
      const errors = validatePreferences({
        theme: '',
        amountFormat: '',
        toastDensity: '',
        formDensity: '',
        milestonesDensity: '',
        walletDensity: '',
        contractsDensity: '',
        quietMode: false,
        toastDuration: '',
        idleDisconnectMs: '',
      });
      const fieldIds = errors.map((e) => e.fieldId);
      expect(fieldIds).toEqual([
        'pref-theme',
        'pref-amountFormat',
        'pref-toastDensity',
        'pref-formDensity',
        'pref-milestonesDensity',
        'pref-walletDensity',
        'pref-contractsDensity',
        'pref-toastDuration',
      ]);
      expect(errors).toHaveLength(8);
    });
  });

  describe('quietMode', () => {
    it('does not produce an error for any quietMode value', () => {
      const errorsTrue = validatePreferences(validPayload({ quietMode: true }));
      const errorsFalse = validatePreferences(validPayload({ quietMode: false }));
      expect(errorsTrue).toEqual([]);
      expect(errorsFalse).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('does not error when idleDisconnectMs is whitespace', () => {
      const errors = validatePreferences(validPayload({ idleDisconnectMs: '   ' }));
      const idleErrors = errors.filter((e) => e.fieldId === 'pref-idleDisconnectMs');
      expect(idleErrors).toHaveLength(0);
    });

    it('accepts 0 as the only valid value below the minimum range', () => {
      expect(validatePreferences(validPayload({ idleDisconnectMs: '0' }))).toEqual([]);
      expect(validatePreferences(validPayload({ idleDisconnectMs: '1' }))).toHaveLength(1);
      expect(validatePreferences(validPayload({ idleDisconnectMs: '100' }))).toHaveLength(1);
      expect(validatePreferences(validPayload({ idleDisconnectMs: '4999' }))).toHaveLength(1);
    });
  });
});
