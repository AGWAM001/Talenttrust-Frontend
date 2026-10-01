import {
  DEFAULT_MANIFEST_ICONS,
  MANIFEST_BACKGROUND_COLOR,
  MANIFEST_DESCRIPTION,
  MANIFEST_DISPLAY,
  MANIFEST_NAME,
  MANIFEST_SHORT_NAME,
  MANIFEST_START_URL,
  MANIFEST_THEME_COLOR,
  MAX_MANIFEST_ICONS,
  MAX_MANIFEST_NAME_LENGTH,
  MAX_MANIFEST_SHORT_NAME_LENGTH,
  WEB_APP_MANIFEST_REPORT_CONTEXT,
  buildWebAppManifest,
  getWebAppManifest,
  normalizeWebAppManifestIcons,
  reportWebAppManifestAnomalies,
  sanitizeWebAppManifestIcon,
} from '@/lib/webAppManifest';
import { setErrorReporter, type ErrorReporter } from '@/lib/errorReporter';

/** Attempts a mutation without assuming strict mode; returns nothing. */
function attemptMutation(target: object, key: string, value: unknown): void {
  try {
    (target as Record<string, unknown>)[key] = value;
  } catch {
    // Frozen objects throw in strict mode — that is the expected outcome.
  }
}

describe('webAppManifest contract', () => {
  describe('canonical manifest (no source)', () => {
    it('returns the documented canonical fields and icon order', () => {
      const { manifest } = buildWebAppManifest();

      expect(manifest.name).toBe(MANIFEST_NAME);
      expect(manifest.short_name).toBe(MANIFEST_SHORT_NAME);
      expect(manifest.description).toBe(MANIFEST_DESCRIPTION);
      expect(manifest.start_url).toBe(MANIFEST_START_URL);
      expect(manifest.display).toBe(MANIFEST_DISPLAY);
      expect(manifest.background_color).toBe(MANIFEST_BACKGROUND_COLOR);
      expect(manifest.theme_color).toBe(MANIFEST_THEME_COLOR);
      expect(manifest.icons).toEqual([...DEFAULT_MANIFEST_ICONS]);
      expect(manifest.icons?.[0]?.type).toBe('image/svg+xml');
    });

    it('reports no degradation for the canonical config', () => {
      const { report } = buildWebAppManifest();

      expect(report).toEqual({
        rejected: 0,
        duplicates: 0,
        truncated: 0,
        adjustedFields: 0,
        usedFallback: false,
        degraded: false,
      });
    });

    it('always keeps a 192x192 and a 512x512 PNG icon', () => {
      const { manifest } = buildWebAppManifest();

      expect(
        manifest.icons?.some(
          (icon) => icon.type === 'image/png' && icon.sizes === '192x192',
        ),
      ).toBe(true);
      expect(
        manifest.icons?.some(
          (icon) => icon.type === 'image/png' && icon.sizes === '512x512',
        ),
      ).toBe(true);
    });
  });

  describe('scalar validation', () => {
    it('uses valid overrides verbatim (trimmed, canonicalized)', () => {
      const { manifest, report } = buildWebAppManifest({
        name: '  My Installed App  ',
        short_name: 'MyApp',
        description: 'A description',
        start_url: '/home',
        display: 'fullscreen',
        background_color: '#ABCDEF',
        theme_color: '#F00',
      });

      expect(manifest.name).toBe('My Installed App');
      expect(manifest.short_name).toBe('MyApp');
      expect(manifest.description).toBe('A description');
      expect(manifest.start_url).toBe('/home');
      expect(manifest.display).toBe('fullscreen');
      expect(manifest.background_color).toBe('#abcdef');
      expect(manifest.theme_color).toBe('#f00');
      expect(report.adjustedFields).toBe(0);
      expect(report.degraded).toBe(false);
    });

    it.each([
      ['empty', ''],
      ['whitespace-only', '   '],
      ['over the length budget', 'x'.repeat(MAX_MANIFEST_NAME_LENGTH + 1)],
      ['a non-string', 42],
    ])('falls back to the default name for a %s value', (_label, value) => {
      const { manifest, report } = buildWebAppManifest({ name: value });

      expect(manifest.name).toBe(MANIFEST_NAME);
      expect(report.adjustedFields).toBe(1);
      expect(report.degraded).toBe(true);
    });

    it('falls back for an over-long short_name', () => {
      const { manifest } = buildWebAppManifest({
        short_name: 'x'.repeat(MAX_MANIFEST_SHORT_NAME_LENGTH + 1),
      });

      expect(manifest.short_name).toBe(MANIFEST_SHORT_NAME);
    });

    it.each([
      ['an unknown display mode', 'popup'],
      ['an empty display mode', ''],
      ['a non-string display mode', 7],
    ])('falls back to standalone for %s', (_label, value) => {
      const { manifest } = buildWebAppManifest({ display: value });

      expect(manifest.display).toBe(MANIFEST_DISPLAY);
    });

    it.each([
      ['named colour', 'red'],
      ['short hex', '#12345'],
      ['invalid hex digits', '#gggggg'],
      ['a number', 0xffffff],
      ['an injected value', '"><script>'],
    ])('falls back to the default colours for %s', (_label, value) => {
      const { manifest } = buildWebAppManifest({
        background_color: value,
        theme_color: value,
      });

      expect(manifest.background_color).toBe(MANIFEST_BACKGROUND_COLOR);
      expect(manifest.theme_color).toBe(MANIFEST_THEME_COLOR);
    });

    it.each([
      ['an absolute URL', 'https://evil.example'],
      ['a protocol-relative URL', '//evil.example'],
      ['a traversal path', '/a/../b'],
      ['a path with whitespace', '/a b'],
      ['a backslash path', '/a\\b'],
      ['an empty string', ''],
      ['an over-long path', `/${'a'.repeat(600)}`],
      ['a non-string', 42],
    ])('falls back to "/" for %s as start_url', (_label, value) => {
      const { manifest } = buildWebAppManifest({ start_url: value });

      expect(manifest.start_url).toBe(MANIFEST_START_URL);
    });

    it('counts every adjusted field', () => {
      const { report } = buildWebAppManifest({
        name: '',
        short_name: '',
        description: '',
        start_url: 'https://evil.example',
        display: 'popup',
        background_color: 'red',
        theme_color: 'red',
      });

      expect(report.adjustedFields).toBe(7);
      expect(report.degraded).toBe(true);
    });
  });

  describe('sanitizeWebAppManifestIcon', () => {
    it('accepts and canonicalizes a well-formed icon', () => {
      const icon = sanitizeWebAppManifestIcon({
        src: '  /extra.png  ',
        sizes: ' 0256x0256 ',
        type: 'IMAGE/PNG',
        purpose: 'MASKABLE',
      });

      expect(icon).toEqual({
        src: '/extra.png',
        sizes: '256x256',
        type: 'image/png',
        purpose: 'maskable',
      });
    });

    it('accepts "any" and de-duplicates a size token list', () => {
      expect(
        sanitizeWebAppManifestIcon({
          src: '/icon.svg',
          sizes: 'any 192x192 192x192',
          type: 'image/svg+xml',
        })?.sizes,
      ).toBe('any 192x192');
    });

    it('accepts the maximum boundary dimension', () => {
      expect(
        sanitizeWebAppManifestIcon({
          src: '/icon.png',
          sizes: '8192x8192',
          type: 'image/png',
        })?.sizes,
      ).toBe('8192x8192');
    });

    it.each([
      ['a non-object', 'icon'],
      ['null', null],
      ['an array', []],
      ['a missing src', { sizes: '1x1', type: 'image/png' }],
      ['a relative src', { src: 'icon.png', sizes: '1x1', type: 'image/png' }],
      [
        'a protocol-relative src',
        { src: '//evil.example/icon.png', sizes: '1x1', type: 'image/png' },
      ],
      [
        'an absolute src',
        { src: 'https://evil.example/icon.png', sizes: '1x1', type: 'image/png' },
      ],
      ['a traversal src', { src: '/a/../b.png', sizes: '1x1', type: 'image/png' }],
      [
        'a whitespace src',
        { src: '/a b.png', sizes: '1x1', type: 'image/png' },
      ],
      [
        'an unsupported type',
        { src: '/icon.gif', sizes: '1x1', type: 'image/gif' },
      ],
      ['an empty sizes', { src: '/icon.png', sizes: '', type: 'image/png' }],
      [
        'a malformed sizes token',
        { src: '/icon.png', sizes: 'abc', type: 'image/png' },
      ],
      ['a zero size', { src: '/icon.png', sizes: '0x0', type: 'image/png' }],
      [
        'an uppercase separator',
        { src: '/icon.png', sizes: '256X256', type: 'image/png' },
      ],
      [
        'an over-large dimension',
        { src: '/icon.png', sizes: '8193x8193', type: 'image/png' },
      ],
      [
        'a compound purpose',
        { src: '/icon.png', sizes: '1x1', type: 'image/png', purpose: 'any maskable' },
      ],
      [
        'an unknown purpose',
        { src: '/icon.png', sizes: '1x1', type: 'image/png', purpose: 'glossy' },
      ],
    ])('rejects %s', (_label, value) => {
      expect(sanitizeWebAppManifestIcon(value)).toBeNull();
    });
  });

  describe('normalizeWebAppManifestIcons', () => {
    it('treats absent input as non-degrading and returns the canonical set', () => {
      const result = normalizeWebAppManifestIcons(undefined);

      expect(result.icons).toEqual([...DEFAULT_MANIFEST_ICONS]);
      expect(result).toMatchObject({
        rejected: 0,
        duplicates: 0,
        truncated: 0,
        usedFallback: false,
      });
    });

    it('appends valid, non-colliding icons after the canonical set', () => {
      const result = normalizeWebAppManifestIcons([
        { src: '/extra.png', sizes: '256x256', type: 'image/png' },
      ]);

      expect(result.icons).toHaveLength(DEFAULT_MANIFEST_ICONS.length + 1);
      expect(result.icons.at(-1)?.src).toBe('/extra.png');
      expect(result.usedFallback).toBe(false);
    });

    it.each([
      ['a non-array input', { src: '/a.png' }],
      ['an empty array', []],
      ['an all-invalid array', [{ src: 'nope' }, 'x']],
    ])('falls back to the canonical set for %s', (_label, input) => {
      const result = normalizeWebAppManifestIcons(input);

      expect(result.icons).toEqual([...DEFAULT_MANIFEST_ICONS]);
      expect(result.usedFallback).toBe(true);
    });

    it('cannot override a canonical icon src', () => {
      const result = normalizeWebAppManifestIcons([
        { src: '/icon.svg', sizes: '999x999', type: 'image/png' },
      ]);

      expect(result.duplicates).toBe(1);
      expect(result.icons[0]).toEqual(DEFAULT_MANIFEST_ICONS[0]);
    });

    it('de-duplicates repeated srcs and counts the drops', () => {
      const result = normalizeWebAppManifestIcons([
        { src: '/one.png', sizes: '64x64', type: 'image/png' },
        { src: '/one.png', sizes: '128x128', type: 'image/png' },
      ]);

      expect(result.duplicates).toBe(1);
      expect(result.icons).toHaveLength(DEFAULT_MANIFEST_ICONS.length + 1);
      expect(result.icons.at(-1)?.sizes).toBe('64x64');
    });

    it('counts malformed entries as rejected', () => {
      const result = normalizeWebAppManifestIcons([
        null,
        42,
        { src: '/ok.png', sizes: '32x32', type: 'image/png' },
        { src: '/bad.png', sizes: '32x32', type: 'image/gif' },
      ]);

      expect(result.rejected).toBe(3);
      expect(result.usedFallback).toBe(false);
    });

    it('enforces the cap at the boundary and counts the overflow', () => {
      const extras = Array.from({ length: MAX_MANIFEST_ICONS + 3 }, (_, i) => ({
        src: `/extra-${i}.png`,
        sizes: '64x64',
        type: 'image/png',
      }));

      const result = normalizeWebAppManifestIcons(extras);
      const room = MAX_MANIFEST_ICONS - DEFAULT_MANIFEST_ICONS.length;

      expect(result.icons).toHaveLength(MAX_MANIFEST_ICONS);
      expect(result.truncated).toBe(extras.length - room);
    });

    it('caps exactly without a duplicate count when the list fits', () => {
      const extras = Array.from({ length: MAX_MANIFEST_ICONS - 3 }, (_, i) => ({
        src: `/fit-${i}.png`,
        sizes: '64x64',
        type: 'image/png',
      }));

      const result = normalizeWebAppManifestIcons(extras);

      expect(result.icons).toHaveLength(MAX_MANIFEST_ICONS);
      expect(result.truncated).toBe(0);
      expect(result.duplicates).toBe(0);
    });
  });

  describe('buildWebAppManifest with icons', () => {
    it('merges valid icons and reports no degradation', () => {
      const { manifest, report } = buildWebAppManifest({
        icons: [{ src: '/custom.webp', sizes: '512x512', type: 'image/webp' }],
      });

      expect(manifest.icons).toHaveLength(4);
      expect(report.degraded).toBe(false);
      expect(report.usedFallback).toBe(false);
    });

    it('degrades safely when only invalid icons are supplied', () => {
      const { manifest, report } = buildWebAppManifest({
        icons: [{ src: 'not-a-path', sizes: 'nope', type: 'text/html' }],
      });

      expect(manifest.icons).toEqual([...DEFAULT_MANIFEST_ICONS]);
      expect(report.rejected).toBe(1);
      expect(report.usedFallback).toBe(true);
      expect(report.degraded).toBe(true);
    });
  });

  describe('totality and determinism', () => {
    it.each([
      ['undefined', undefined],
      ['null', null],
      ['a number', 42],
      ['a string', 'manifest'],
      ['a boolean', true],
      ['an array', []],
    ])('never throws for %s', (_label, source) => {
      expect(() => buildWebAppManifest(source)).not.toThrow();

      const { manifest } = buildWebAppManifest(source);
      expect(manifest.icons).toEqual([...DEFAULT_MANIFEST_ICONS]);
    });

    it('never throws for a cyclic source', () => {
      const cyclic: Record<string, unknown> = {};
      cyclic.name = cyclic;
      cyclic.icons = [cyclic];

      expect(() => buildWebAppManifest(cyclic)).not.toThrow();
      expect(buildWebAppManifest(cyclic).manifest.name).toBe(MANIFEST_NAME);
    });

    it('treats hostile getters as absent', () => {
      const hostile: Record<string, unknown> = {};
      for (const key of ['name', 'short_name', 'icons']) {
        Object.defineProperty(hostile, key, {
          get() {
            throw new Error('boom');
          },
          enumerable: true,
        });
      }

      expect(() => buildWebAppManifest(hostile)).not.toThrow();
      expect(buildWebAppManifest(hostile).manifest.name).toBe(MANIFEST_NAME);
    });

    it('returns structurally identical but independent results', () => {
      const first = buildWebAppManifest();
      const second = buildWebAppManifest();

      expect(first.manifest).toEqual(second.manifest);
      expect(first.manifest).not.toBe(second.manifest);
      expect(first.manifest.icons).not.toBe(second.manifest.icons);
      expect(first.report).toEqual(second.report);
    });

    it('is idempotent: rebuilding its own output yields the same manifest', () => {
      const canonical = getWebAppManifest();
      const rebuilt = buildWebAppManifest(canonical);

      expect(rebuilt.manifest).toEqual(canonical);
    });

    it('returns a fresh manifest from getWebAppManifest on every call', () => {
      const first = getWebAppManifest();
      const second = getWebAppManifest();

      expect(first).toEqual(second);
      expect(first).not.toBe(second);
    });
  });

  describe('immutability', () => {
    it('deep-freezes the manifest and its nested values', () => {
      const { manifest, report } = buildWebAppManifest();

      expect(Object.isFrozen(manifest)).toBe(true);
      expect(Object.isFrozen(manifest.icons)).toBe(true);
      expect(Object.isFrozen(manifest.icons?.[0])).toBe(true);
      expect(Object.isFrozen(report)).toBe(true);
    });

    it('cannot be mutated by a caller', () => {
      const { manifest } = buildWebAppManifest();

      attemptMutation(manifest, 'name', 'Hacked');
      attemptMutation(manifest.icons?.[0] ?? {}, 'src', '/evil.png');

      expect(manifest.name).toBe(MANIFEST_NAME);
      expect(manifest.icons?.[0]?.src).toBe('/icon.svg');
    });

    it('keeps later results intact after a mutation attempt', () => {
      const first = buildWebAppManifest();
      attemptMutation(first.manifest, 'theme_color', '#000000');

      expect(buildWebAppManifest().manifest.theme_color).toBe(
        MANIFEST_THEME_COLOR,
      );
    });
  });

  describe('reportWebAppManifestAnomalies', () => {
    let reporter: jest.Mock;

    beforeEach(() => {
      reporter = jest.fn();
      setErrorReporter(reporter as unknown as ErrorReporter);
    });

    afterEach(() => {
      setErrorReporter(null);
    });

    it('is silent for a clean build', () => {
      reportWebAppManifestAnomalies(buildWebAppManifest().report);

      expect(reporter).not.toHaveBeenCalled();
    });

    it('reports a degraded build with counts only', () => {
      const { report } = buildWebAppManifest({
        name: '',
        icons: [{ src: 'bad', sizes: 'nope', type: 'text/html' }],
      });

      reportWebAppManifestAnomalies(report);

      expect(reporter).toHaveBeenCalledTimes(1);
      const [error, context, level, meta] = reporter.mock.calls[0];
      expect(error).toBeInstanceOf(Error);
      expect(context).toBe(WEB_APP_MANIFEST_REPORT_CONTEXT);
      expect(level).toBe('warn');
      expect(meta).toEqual({
        rejected: 1,
        duplicates: 0,
        truncated: 0,
        adjustedFields: 1,
        usedFallback: true,
      });
      // No offending content is echoed into telemetry.
      expect(Object.keys(meta as object)).not.toContain('name');
      expect(Object.keys(meta as object)).not.toContain('icons');
    });
  });
});
