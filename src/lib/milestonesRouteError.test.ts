import {
  buildMilestonesRouteErrorMeta,
  MAX_ERROR_NAME_LENGTH,
  MILESTONES_ROUTE_ERROR_CODE,
} from './milestonesRouteError';

describe('milestonesRouteError contract', () => {
  it('exposes a stable public error code', () => {
    expect(MILESTONES_ROUTE_ERROR_CODE).toBe('MILESTONES_ROUTE_FAILED');
  });

  describe('success path', () => {
    it('derives the name from an Error without copying the message', () => {
      const meta = buildMilestonesRouteErrorMeta(new Error('top secret internals'));

      expect(meta).toEqual({
        code: MILESTONES_ROUTE_ERROR_CODE,
        name: 'Error',
      });
      expect(JSON.stringify(meta)).not.toContain('top secret internals');
    });

    it('preserves the constructor name of subclasses', () => {
      expect(buildMilestonesRouteErrorMeta(new TypeError('bad')).name).toBe(
        'TypeError',
      );
    });

    it('includes a safe digest when provided', () => {
      expect(
        buildMilestonesRouteErrorMeta(new Error('x'), 'abcDEF123-_'),
      ).toMatchObject({ digest: 'abcDEF123-_' });
    });

    it('trims a safe digest', () => {
      expect(
        buildMilestonesRouteErrorMeta(new Error('x'), '  deadbeef  ').digest,
      ).toBe('deadbeef');
    });
  });

  describe('rejection path', () => {
    it.each([
      ['undefined', undefined],
      ['null', null],
      ['a number', 42],
      ['a boolean', true],
      ['an object', { digest: 'x' }],
      ['an empty string', ''],
      ['whitespace', '   '],
      ['an embedded space', 'abc 123'],
      ['a newline', 'abc\n123'],
      ['a slash', 'abc/123'],
      ['an over-long token', 'a'.repeat(129)],
    ])('omits an invalid digest: %s', (_label, digest) => {
      const meta = buildMilestonesRouteErrorMeta(new Error('x'), digest);
      expect(meta.digest).toBeUndefined();
      expect(Object.prototype.hasOwnProperty.call(meta, 'digest')).toBe(false);
    });

    it.each([
      ['null', null],
      ['undefined', undefined],
      ['a string', 'boom'],
      ['a number', 7],
      ['a plain object', { name: 'Fake' }],
      ['an array', ['boom']],
    ])('falls back to the neutral name for %s', (_label, error) => {
      expect(() => buildMilestonesRouteErrorMeta(error)).not.toThrow();
      expect(buildMilestonesRouteErrorMeta(error).name).toBe('Error');
    });
  });

  describe('boundary path', () => {
    it('clamps an over-long error name', () => {
      const longName = 'X'.repeat(MAX_ERROR_NAME_LENGTH + 50);
      const error = new Error('x');
      error.name = longName;

      const meta = buildMilestonesRouteErrorMeta(error);
      expect(meta.name).toHaveLength(MAX_ERROR_NAME_LENGTH);
      expect(longName.startsWith(meta.name)).toBe(true);
    });

    it('falls back when an Error subclass exposes a hostile name getter', () => {
      class HostileError extends Error {
        get name(): string {
          throw new Error('name getter exploded');
        }
      }

      expect(() => buildMilestonesRouteErrorMeta(new HostileError())).not.toThrow();
      expect(buildMilestonesRouteErrorMeta(new HostileError()).name).toBe('Error');
    });

    it('falls back for a blank error name', () => {
      const error = new Error('x');
      error.name = '   ';
      expect(buildMilestonesRouteErrorMeta(error).name).toBe('Error');
    });

    it('never copies message, stack, or custom properties', () => {
      const error = Object.assign(new Error('secret-message'), {
        stack: 'secret-stack',
        secret: 'secret-extra',
      });

      const serialized = JSON.stringify(buildMilestonesRouteErrorMeta(error));
      expect(serialized).not.toContain('secret-message');
      expect(serialized).not.toContain('secret-stack');
      expect(serialized).not.toContain('secret-extra');
      expect(Object.keys(buildMilestonesRouteErrorMeta(error)).sort()).toEqual([
        'code',
        'name',
      ]);
    });
  });

  describe('purity', () => {
    it('returns a frozen object', () => {
      expect(Object.isFrozen(buildMilestonesRouteErrorMeta(new Error('x')))).toBe(
        true,
      );
    });

    it('is deterministic for identical input', () => {
      const error = new Error('x');
      expect(buildMilestonesRouteErrorMeta(error, 'abc')).toEqual(
        buildMilestonesRouteErrorMeta(error, 'abc'),
      );
    });
  });
});
