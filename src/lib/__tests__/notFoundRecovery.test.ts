import {
  MAX_DISPLAY_PATH_LENGTH,
  NO_PATH_REPORT_KEY,
  planNotFoundRecovery,
  sanitizeMissingPath,
} from '../notFoundRecovery';

describe('sanitizeMissingPath', () => {
  describe('valid input', () => {
    it('returns a rooted path unchanged', () => {
      expect(sanitizeMissingPath('/contracts/abc-123')).toBe('/contracts/abc-123');
    });

    it('accepts the root path', () => {
      expect(sanitizeMissingPath('/')).toBe('/');
    });

    it('drops the query string so tokens never surface', () => {
      expect(sanitizeMissingPath('/reset?token=SECRET')).toBe('/reset');
    });

    it('drops the fragment', () => {
      expect(sanitizeMissingPath('/contracts#section')).toBe('/contracts');
    });

    it('drops query and fragment together', () => {
      expect(sanitizeMissingPath('/a/b?q=1&r=2#frag')).toBe('/a/b');
    });

    it('collapses repeated slashes into one', () => {
      expect(sanitizeMissingPath('/a//b///c')).toBe('/a/b/c');
    });

    it('trims surrounding whitespace', () => {
      expect(sanitizeMissingPath('  /spaced/path  ')).toBe('/spaced/path');
    });

    it('strips ASCII control characters', () => {
      const control = String.fromCharCode(0x01) + String.fromCharCode(0x7f);
      expect(sanitizeMissingPath(`/a${control}b`)).toBe('/ab');
    });
  });

  describe('invalid / unsafe input collapses to null', () => {
    it('rejects non-string values', () => {
      expect(sanitizeMissingPath(undefined)).toBeNull();
      expect(sanitizeMissingPath(null)).toBeNull();
      expect(sanitizeMissingPath(42)).toBeNull();
      expect(sanitizeMissingPath({})).toBeNull();
    });

    it('rejects empty and whitespace-only paths', () => {
      expect(sanitizeMissingPath('')).toBeNull();
      expect(sanitizeMissingPath('   ')).toBeNull();
    });

    it('rejects a value that is only a query string', () => {
      expect(sanitizeMissingPath('?token=abc')).toBeNull();
    });

    it('rejects paths without a leading slash', () => {
      expect(sanitizeMissingPath('contracts/1')).toBeNull();
    });

    it('rejects protocol-relative hosts', () => {
      expect(sanitizeMissingPath('//evil.example.com/x')).toBeNull();
    });
  });

  describe('boundary: length clamp', () => {
    it('keeps a path exactly at the limit unchanged', () => {
      const atLimit = `/${'a'.repeat(MAX_DISPLAY_PATH_LENGTH - 1)}`;
      expect(atLimit.length).toBe(MAX_DISPLAY_PATH_LENGTH);
      expect(sanitizeMissingPath(atLimit)).toBe(atLimit);
    });

    it('truncates a path over the limit and clamps total length', () => {
      const over = `/${'b'.repeat(MAX_DISPLAY_PATH_LENGTH + 500)}`;
      const result = sanitizeMissingPath(over);
      expect(result).not.toBeNull();
      expect(result!.length).toBe(MAX_DISPLAY_PATH_LENGTH);
      expect(result!.endsWith('…')).toBe(true);
    });
  });

  describe('idempotency (re-renders / retries are stable)', () => {
    it('re-sanitizing a normalised path is a no-op', () => {
      const once = sanitizeMissingPath('/a//b?x=1#y');
      expect(sanitizeMissingPath(once)).toBe(once);
    });

    it('re-sanitizing a truncated path is a no-op', () => {
      const over = `/${'c'.repeat(MAX_DISPLAY_PATH_LENGTH + 50)}`;
      const once = sanitizeMissingPath(over);
      expect(sanitizeMissingPath(once)).toBe(once);
    });
  });
});

describe('planNotFoundRecovery', () => {
  it('returns "back" when there is real history', () => {
    expect(planNotFoundRecovery(2)).toBe('back');
    expect(planNotFoundRecovery(50)).toBe('back');
  });

  it('returns "home" when there is nowhere to go back to', () => {
    expect(planNotFoundRecovery(1)).toBe('home');
    expect(planNotFoundRecovery(0)).toBe('home');
  });

  it('treats non-finite and negative depths as no history', () => {
    expect(planNotFoundRecovery(Number.NaN)).toBe('home');
    expect(planNotFoundRecovery(Number.POSITIVE_INFINITY)).toBe('home');
    expect(planNotFoundRecovery(-3)).toBe('home');
  });
});

describe('NO_PATH_REPORT_KEY', () => {
  it('is a distinct, non-path sentinel', () => {
    expect(NO_PATH_REPORT_KEY).not.toMatch(/^\//);
    expect(typeof NO_PATH_REPORT_KEY).toBe('string');
  });
});
