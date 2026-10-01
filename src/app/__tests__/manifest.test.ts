import manifest from '../manifest';
import {
  DEFAULT_MANIFEST_ICONS,
  MANIFEST_NAME,
  getWebAppManifest,
} from '@/lib/webAppManifest';
import { setErrorReporter, type ErrorReporter } from '@/lib/errorReporter';

describe('manifest.ts', () => {
  it('should return an object with required top-level fields', () => {
    const result = manifest();

    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('short_name');
    expect(result).toHaveProperty('description');
    expect(result).toHaveProperty('start_url');
    expect(result).toHaveProperty('display');
    expect(result).toHaveProperty('background_color');
    expect(result).toHaveProperty('theme_color');
    expect(result).toHaveProperty('icons');
  });

  it('should have non-empty string fields', () => {
    const result = manifest();

    expect(result.name?.length).toBeGreaterThan(0);
    expect(result.short_name?.length).toBeGreaterThan(0);
    expect(result.description?.length).toBeGreaterThan(0);
    expect(result.start_url?.length).toBeGreaterThan(0);
    expect(result.display?.length).toBeGreaterThan(0);
    expect(result.background_color?.length).toBeGreaterThan(0);
    expect(result.theme_color?.length).toBeGreaterThan(0);
  });

  it('should have correct name and short_name', () => {
    const result = manifest();

    expect(result.name).toBe('TalentTrust - Safe Freelance Payments');
    expect(result.short_name).toBe('TalentTrust');
  });

  it('should have a matching description', () => {
    const result = manifest();

    expect(result.description).toBe(
      'Safe, secure payments that protect both freelancers and clients throughout your project.',
    );
  });

  it('should start at root', () => {
    const result = manifest();

    expect(result.start_url).toBe('/');
  });

  it('should use standalone display mode', () => {
    const result = manifest();

    expect(result.display).toBe('standalone');
  });

  describe('colors', () => {
    it('should use white as background_color (matching globals.css light theme)', () => {
      const result = manifest();

      expect(result.background_color).toBe('#ffffff');
    });

    it('should use primary blue as theme_color (matching globals.css --primary)', () => {
      const result = manifest();

      expect(result.theme_color).toBe('#2563eb');
    });
  });

  describe('icons', () => {
    it('should have a non-empty icons array', () => {
      const result = manifest();

      expect(Array.isArray(result.icons)).toBe(true);
      expect(result.icons?.length).toBeGreaterThan(0);
    });

    it('each icon should have src, sizes, and type', () => {
      const result = manifest();

      for (const icon of result.icons ?? []) {
        expect(icon).toHaveProperty('src');
        expect(icon).toHaveProperty('sizes');
        expect(icon).toHaveProperty('type');

        expect(typeof icon.src).toBe('string');
        expect(icon.src?.length).toBeGreaterThan(0);
        expect(typeof icon.sizes).toBe('string');
        expect(icon.sizes?.length).toBeGreaterThan(0);
        expect(typeof icon.type).toBe('string');
        expect(icon.type?.length).toBeGreaterThan(0);
      }
    });

    it('should include an SVG icon with sizes "any"', () => {
      const result = manifest();
      const svgIcons = result.icons?.filter(
        icon => icon.type === 'image/svg+xml',
      );

      expect(svgIcons?.length).toBeGreaterThanOrEqual(1);
      expect(svgIcons?.[0]?.sizes).toBe('any');
    });

    it('should include a 192x192 PNG icon', () => {
      const result = manifest();
      const icon192 = result.icons?.find(
        icon => icon.sizes === '192x192' && icon.type === 'image/png',
      );

      expect(icon192).toBeDefined();
      expect(icon192?.src).toBe('/icon-192x192.png');
    });

    it('should include a 512x512 PNG icon', () => {
      const result = manifest();
      const icon512 = result.icons?.find(
        icon => icon.sizes === '512x512' && icon.type === 'image/png',
      );

      expect(icon512).toBeDefined();
      expect(icon512?.src).toBe('/icon-512x512.png');
    });

    it('should reference SVG as the first icon (preferred format)', () => {
      const result = manifest();

      expect(result.icons?.[0]?.type).toBe('image/svg+xml');
    });

    it('all icon src paths should start with /', () => {
      const result = manifest();

      for (const icon of result.icons ?? []) {
        expect(icon.src?.startsWith('/')).toBe(true);
      }
    });

    it('all icon types should be valid MIME types', () => {
      const result = manifest();
      const validTypes = ['image/png', 'image/svg+xml'];

      for (const icon of result.icons ?? []) {
        expect(validTypes).toContain(icon.type);
      }
    });
  });
});

/**
 * Wiring assertions for the manifest contract (`src/lib/webAppManifest.ts`).
 *
 * The route must stay a thin consumer: the canonical content, icon ordering,
 * and immutability guarantees are owned by the contract module, and the route
 * must not emit diagnostics for the canonical configuration.
 */
describe('manifest.ts contract wiring', () => {
  it('returns the canonical manifest owned by the contract module', () => {
    expect(manifest()).toEqual(getWebAppManifest());
    expect(manifest().icons).toEqual([...DEFAULT_MANIFEST_ICONS]);
  });

  it('returns a fresh, deeply frozen manifest on every call', () => {
    const first = manifest();
    const second = manifest();

    expect(first).not.toBe(second);
    expect(first).toEqual(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.icons)).toBe(true);
    expect(Object.isFrozen(first.icons?.[0])).toBe(true);
  });

  it('cannot be mutated into a degraded state', () => {
    const result = manifest();

    try {
      (result as Record<string, unknown>).name = 'Hacked';
    } catch {
      // Frozen objects throw in strict mode — expected.
    }

    expect(manifest().name).toBe(MANIFEST_NAME);
  });

  it('does not report anomalies for the canonical configuration', () => {
    const reporter = jest.fn();
    setErrorReporter(reporter as unknown as ErrorReporter);

    try {
      manifest();
      expect(reporter).not.toHaveBeenCalled();
    } finally {
      setErrorReporter(null);
    }
  });
});
