import {
  DEFAULT_NOT_FOUND_QUICK_LINKS,
  getNotFoundQuickLinks,
  MAX_NOT_FOUND_QUICK_LINKS,
  normalizeNotFoundQuickLinks,
  NOT_FOUND_HOME_HREF,
  NOT_FOUND_SUPPORT_EMAIL,
  NOT_FOUND_SUPPORT_HREF,
  sanitizeNotFoundQuickLink,
  type NotFoundQuickLink,
} from './notFoundContent';

const validLink = (overrides: Partial<NotFoundQuickLink> = {}): NotFoundQuickLink => ({
  href: '/contracts',
  label: 'View Contracts',
  description: 'Pick up where you left off',
  ...overrides,
});

describe('notFoundContent compatibility contract', () => {
  describe('documented defaults (regression guard)', () => {
    it('exposes the exact public recovery contract', () => {
      expect(DEFAULT_NOT_FOUND_QUICK_LINKS).toEqual([
        {
          href: '/contracts',
          label: 'View Contracts',
          description: 'Pick up where you left off',
        },
        {
          href: '/milestones',
          label: 'Track Milestones',
          description: 'See your project checkpoints',
        },
        {
          href: '/reputation',
          label: 'My Reputation',
          description: 'Check your work history',
        },
      ]);
    });

    it('exposes stable home and support constants', () => {
      expect(NOT_FOUND_HOME_HREF).toBe('/');
      expect(NOT_FOUND_SUPPORT_EMAIL).toBe('support@talenttrust.io');
      expect(NOT_FOUND_SUPPORT_HREF).toBe('mailto:support@talenttrust.io');
    });

    it('freezes the defaults so callers cannot mutate the contract', () => {
      expect(Object.isFrozen(DEFAULT_NOT_FOUND_QUICK_LINKS)).toBe(true);
      DEFAULT_NOT_FOUND_QUICK_LINKS.forEach((link) => {
        expect(Object.isFrozen(link)).toBe(true);
      });
    });

    it('getNotFoundQuickLinks returns the defaults in order', () => {
      expect(getNotFoundQuickLinks()).toEqual([...DEFAULT_NOT_FOUND_QUICK_LINKS]);
    });

    it('getNotFoundQuickLinks returns a fresh array on each call', () => {
      const first = getNotFoundQuickLinks();
      first.pop();
      expect(getNotFoundQuickLinks()).toHaveLength(
        DEFAULT_NOT_FOUND_QUICK_LINKS.length,
      );
    });
  });

  describe('success path', () => {
    it('accepts well-formed links unchanged and reports no drops', () => {
      const result = normalizeNotFoundQuickLinks([validLink()]);

      expect(result.links).toEqual([validLink()]);
      expect(result.rejected).toBe(0);
      expect(result.duplicates).toBe(0);
      expect(result.truncated).toBe(0);
      expect(result.usedFallback).toBe(false);
    });

    it('trims surrounding whitespace on accepted entries', () => {
      const result = normalizeNotFoundQuickLinks([
        {
          href: '  /wallet  ',
          label: '  Wallet  ',
          description: '  Manage balances  ',
        },
      ]);

      expect(result.links[0]).toEqual({
        href: '/wallet',
        label: 'Wallet',
        description: 'Manage balances',
      });
    });

    it('sanitizeNotFoundQuickLink returns a frozen normalized link', () => {
      const link = sanitizeNotFoundQuickLink(validLink({ label: '  Hi  ' }));
      expect(link).toEqual(validLink({ label: 'Hi' }));
      expect(Object.isFrozen(link)).toBe(true);
    });
  });

  describe('rejection path', () => {
    it.each([
      ['undefined', undefined],
      ['null', null],
      ['a string', 'not-an-array'],
      ['a number', 42],
      ['a plain object', { href: '/contracts' }],
    ])('falls back to defaults when input is %s', (_label, input) => {
      const result = normalizeNotFoundQuickLinks(input);
      expect(result.links).toEqual([...DEFAULT_NOT_FOUND_QUICK_LINKS]);
      expect(result.usedFallback).toBe(true);
    });

    it.each([
      ['null entry', null],
      ['primitive entry', 'contracts'],
      ['non-object entry', 42],
      ['missing href', { label: 'A', description: 'B' }],
      ['non-string href', { href: 7, label: 'A', description: 'B' }],
      ['missing label', { href: '/a', description: 'B' }],
      ['empty label', { href: '/a', label: '   ', description: 'B' }],
      ['missing description', { href: '/a', label: 'A' }],
      ['empty description', { href: '/a', label: 'A', description: '' }],
      ['relative href', { href: 'contracts', label: 'A', description: 'B' }],
      ['absolute href', { href: 'https://evil.example', label: 'A', description: 'B' }],
      ['protocol-relative href', { href: '//evil.example', label: 'A', description: 'B' }],
      ['mailto href', { href: 'mailto:x@y.z', label: 'A', description: 'B' }],
      ['backslash href', { href: '/a\\b', label: 'A', description: 'B' }],
      ['whitespace href', { href: '/a b', label: 'A', description: 'B' }],
    ])('rejects %s', (_label, entry) => {
      expect(sanitizeNotFoundQuickLink(entry)).toBeNull();
    });

    it('drops invalid entries and counts them without throwing', () => {
      const result = normalizeNotFoundQuickLinks([
        validLink(),
        null,
        { href: 'https://evil.example', label: 'X', description: 'Y' },
        validLink({ href: '/milestones', label: 'M', description: 'D' }),
      ]);

      expect(result.links.map((link) => link.href)).toEqual([
        '/contracts',
        '/milestones',
      ]);
      expect(result.rejected).toBe(2);
      expect(result.usedFallback).toBe(false);
    });

    it('falls back when every entry is invalid', () => {
      const result = normalizeNotFoundQuickLinks([null, {}, 'nope']);
      expect(result.links).toEqual([...DEFAULT_NOT_FOUND_QUICK_LINKS]);
      expect(result.rejected).toBe(3);
      expect(result.usedFallback).toBe(true);
    });

    it('never throws on adversarial, deeply nested input', () => {
      const cyclic: unknown[] = [];
      cyclic.push(cyclic);
      expect(() => normalizeNotFoundQuickLinks(cyclic)).not.toThrow();
      expect(() =>
        normalizeNotFoundQuickLinks([
          { href: '/a', label: {}, description: [] },
          Symbol('x'),
          () => {},
        ]),
      ).not.toThrow();
    });
  });

  describe('duplicate path', () => {
    it('keeps the first occurrence of a duplicated href', () => {
      const result = normalizeNotFoundQuickLinks([
        validLink({ label: 'First' }),
        validLink({ label: 'Second' }),
      ]);

      expect(result.links).toHaveLength(1);
      expect(result.links[0].label).toBe('First');
      expect(result.duplicates).toBe(1);
    });

    it('dedupes after trimming so `/a` and `  /a  ` collide', () => {
      const result = normalizeNotFoundQuickLinks([
        validLink({ href: '/a', label: 'First' }),
        validLink({ href: '  /a  ', label: 'Second' }),
      ]);

      expect(result.links).toHaveLength(1);
      expect(result.duplicates).toBe(1);
    });

    it('treats different hrefs as distinct', () => {
      const result = normalizeNotFoundQuickLinks([
        validLink({ href: '/a' }),
        validLink({ href: '/b' }),
      ]);

      expect(result.links.map((link) => link.href)).toEqual(['/a', '/b']);
      expect(result.duplicates).toBe(0);
    });
  });

  describe('boundary path', () => {
    it('falls back when the input list is empty', () => {
      const result = normalizeNotFoundQuickLinks([]);
      expect(result.links).toEqual([...DEFAULT_NOT_FOUND_QUICK_LINKS]);
      expect(result.usedFallback).toBe(true);
    });

    it('accepts exactly the cap without truncating', () => {
      const input = Array.from({ length: MAX_NOT_FOUND_QUICK_LINKS }, (_, i) =>
        validLink({ href: `/route-${i}`, label: `L${i}`, description: `D${i}` }),
      );
      const result = normalizeNotFoundQuickLinks(input);

      expect(result.links).toHaveLength(MAX_NOT_FOUND_QUICK_LINKS);
      expect(result.truncated).toBe(0);
    });

    it('truncates links beyond the cap and reports the overflow', () => {
      const input = Array.from({ length: MAX_NOT_FOUND_QUICK_LINKS + 3 }, (_, i) =>
        validLink({ href: `/route-${i}`, label: `L${i}`, description: `D${i}` }),
      );
      const result = normalizeNotFoundQuickLinks(input);

      expect(result.links).toHaveLength(MAX_NOT_FOUND_QUICK_LINKS);
      expect(result.truncated).toBe(3);
    });

    it('fills up to the cap when invalid/duplicate entries precede valid ones', () => {
      const input: unknown[] = [
        null,
        validLink({ href: '/a' }),
        validLink({ href: '/a' }),
        validLink({ href: '/b' }),
        validLink({ href: '/c' }),
        validLink({ href: '/d' }),
        validLink({ href: '/e' }),
        validLink({ href: '/f' }),
      ];
      const result = normalizeNotFoundQuickLinks(input);

      expect(result.links.map((link) => link.href)).toEqual([
        '/a',
        '/b',
        '/c',
        '/d',
        '/e',
      ]);
      expect(result.truncated).toBe(1);
      expect(result.rejected).toBe(1);
      expect(result.duplicates).toBe(1);
    });
  });

  describe('purity', () => {
    it('does not mutate the input array', () => {
      const input = [validLink(), null];
      const snapshot = JSON.parse(JSON.stringify(input));
      normalizeNotFoundQuickLinks(input);
      expect(input).toEqual(snapshot);
    });

    it('is deterministic for identical input', () => {
      const input = [validLink()];
      expect(normalizeNotFoundQuickLinks(input)).toEqual(
        normalizeNotFoundQuickLinks(input),
      );
    });
  });
});
