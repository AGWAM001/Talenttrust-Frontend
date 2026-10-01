import {
  MAX_EMAIL_LENGTH,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  countCodePoints,
  createDuplicateTracker,
  normalizeEmail,
  signInPayloadKey,
  validateEmailField,
  validatePasswordField,
  validateSignInPayload,
} from './validation';

describe('validation boundaries', () => {
  describe('normalizeEmail', () => {
    it('trims surrounding whitespace', () => {
      expect(normalizeEmail('  user@Example.COM  ')).toBe('user@example.com');
    });

    it('lowercases only the domain part', () => {
      expect(normalizeEmail('Alice+Bob@Domain.COM')).toBe('Alice+Bob@domain.com');
    });

    it('returns an empty string for non-string inputs', () => {
      expect(normalizeEmail(null)).toBe('');
      expect(normalizeEmail(undefined)).toBe('');
      expect(normalizeEmail(42)).toBe('');
    });
  });

  describe('countCodePoints', () => {
    it('counts astral symbols as a single character', () => {
      expect(countCodePoints('🚀')).toBe(1);
      expect(countCodePoints('🚀🚀')).toBe(2);
    });
  });

  describe('validateEmailField', () => {
    it('accepts a well-formed email', () => {
      expect(validateEmailField('user@example.com')).toBeNull();
    });

    it('rejects an empty string', () => {
      expect(validateEmailField('')).toMatch(/required/i);
    });

    it('rejects whitespace-only input', () => {
      expect(validateEmailField('   ')).toMatch(/required/i);
    });

    it('rejects a malformed email', () => {
      expect(validateEmailField('not-an-email')).toMatch(/valid email/i);
      expect(validateEmailField('a@b')).toMatch(/valid email/i);
      expect(validateEmailField('a@b' + '.c')).toMatch(/valid email/i);
    });

    it('rejects emails exceeding MAX_EMAIL_LENGTH', () => {
      const local = 'a'.repeat(MAX_EMAIL_LENGTH);
      const over = `${local}@example.com`;
      expect(validateEmailField(over)).toMatch(/at most/i);
    });

    it('accepts an email at the exact max length boundary', () => {
      const domain = '@example.com';
      const local = 'a'.repeat(MAX_EMAIL_LENGTH - domain.length);
      const boundary = `${local}${domain}`;
      expect(countCodePoints(boundary)).toBe(MAX_EMAIL_LENGTH);
      expect(validateEmailField(boundary)).toBeNull();
    });

    it('rejects non-string inputs without throwing', () => {
      expect(() => validateEmailField(null)).not.toThrow();
      expect(validateEmailField(null)).toMatch(/required/i);
    });
  });

  describe('validatePasswordField', () => {
    it('accepts a password at the minimum length boundary', () => {
      expect(validatePasswordField('a'.repeat(MIN_PASSWORD_LENGTH))).toBeNull();
    });

    it('rejects a password one below the minimum length', () => {
      expect(validatePasswordField('a'.repeat(MIN_PASSWORD_LENGTH - 1))).toMatch(/at least/i);
    });

    it('accepts a password at the exact max length boundary', () => {
      expect(validatePasswordField('a'.repeat(MAX_PASSWORD_LENGTH))).toBeNull();
    });

    it('rejects a password one above the maximum length', () => {
      expect(validatePasswordField('a'.repeat(MAX_PASSWORD_LENGTH + 1))).toMatch(/at most/i);
    });

    it('rejects an empty password', () => {
      expect(validatePasswordField('')).toMatch(/required/i);
    });

    it('preserves whitespace inside the password', () => {
      const password = '  secret pass  ';
      expect(validatePasswordField(password)).toBeNull();
    });

    it('rejects whitespace-only passwords only when below minimum', () => {
      expect(validatePasswordField('    ')).toMatch(/at least/i);
    });
  });

  describe('validateSignInPayload', () => {
    it('returns valid for accepted input and normalizes the email', () => {
      const result = validateSignInPayload('  User@Example.COM ', 'supersecret');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.normalizedEmail).toBe('User@example.com');
    });

    it('returns both field errors in a stable order', () => {
      const result = validateSignInPayload('', '');
      expect(result.valid).toBe(false);
      expect(result.errors.map((e) => e.fieldId)).toEqual(['email', 'password']);
    });

    it('rejects malformed email but accepts valid password', () => {
      const result = validateSignInPayload('not-an-email', 'supersecret');
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].fieldId).toBe('email');
    });

    it('rejects valid email but weak password', () => {
      const result = validateSignInPayload('user@example.com', 'short');
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].fieldId).toBe('password');
    });

    it('never echoes the raw input in error messages', () => {
      const secret = 'secret-token-123456';
      const result = validateSignInPayload('not-an-email', secret);
      for (const error of result.errors) {
        expect(error.message).not.toContain(secret);
      }
    });

    it('is deterministic for identical inputs', () => {
      const a = validateSignInPayload('user@example.com', 'supersecret');
      const b = validateSignInPayload('user@example.com', 'supersecret');
      expect(a).toEqual(b);
    });

    it('treats non-string inputs as empty without throwing', () => {
      expect(() => validateSignInPayload(null, undefined)).not.toThrow();
      const result = validateSignInPayload(null, undefined);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });
  });

  describe('signInPayloadKey', () => {
    it('produces the same key for equivalent normalized inputs', () => {
      expect(signInPayloadKey(' User@Example.COM ', 'supersecret')).toBe(
        signInPayloadKey('user@example.com', 'supersecret'),
      );
    });

    it('produces different keys for different passwords', () => {
      expect(signInPayloadKey('user@example.com', 'supersecret')).not.toBe(signInPayloadKey('user@example.com', 'supersecret2'));
    });

    it('does not leak the raw password in the key', () => {
      const password = 'super-secret-password';
      expect(signInPayloadKey('user@example.com', password)).not.toContain(password);
    });
  });

  describe('createDuplicateTracker', () => {
    it('reports the first key as non-duplicate', () => {
      const tracker = createDuplicateTracker();
      expect(tracker.isDuplicate('k')).toBe(false);
    });

    it('detects a duplicate submission of the same key', () => {
      const tracker = createDuplicateTracker();
      tracker.record('k');
      expect(tracker.isDuplicate('k')).toBe(true);
      expect(tracker.isDuplicate('other')).toBe(false);
    });

    it('resets after a successful submit', () => {
      const tracker = createDuplicateTracker();
      tracker.record('k');
      tracker.reset();
      expect(tracker.isDuplicate('k')).toBe(false);
    });

    it('only tracks the most recent key', () => {
      const tracker = createDuplicateTracker();
      tracker.record('a');
      tracker.record('b');
      expect(tracker.isDuplicate('a')).toBe(false);
      expect(tracker.isDuplicate('b')).toBe(true);
    });
  });
});
