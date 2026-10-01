import robots from '../robots';

describe('robots.ts', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should use default localhost URL when no NEXT_PUBLIC_SITE_URL is set', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    const result = robots();

    expect(result.sitemap).toBe('http://localhost:3000/sitemap.xml');
    expect(result.rules).toEqual({
      userAgent: '*',
      allow: '/',
    });
  });

  it('should use provided NEXT_PUBLIC_SITE_URL when set', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://talenttrust.app';
    const result = robots();

    expect(result.sitemap).toBe('https://talenttrust.app/sitemap.xml');
  });

  it('normalizes trailing slashes and preserves a configured base path', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://talenttrust.app/portal///';

    expect(robots().sitemap).toBe(
      'https://talenttrust.app/portal/sitemap.xml',
    );
  });

  it.each([
    'not a URL',
    '/relative/path',
    'ftp://talenttrust.app',
    'https://user:password@talenttrust.app',
    'https://talenttrust.app?preview=true',
    'https://talenttrust.app#section',
  ])('rejects invalid NEXT_PUBLIC_SITE_URL values: %s', (siteUrl) => {
    process.env.NEXT_PUBLIC_SITE_URL = siteUrl;

    expect(() => robots()).toThrow(
      'NEXT_PUBLIC_SITE_URL must be an absolute HTTP(S) URL without credentials, query, or fragment.',
    );
  });

  it('returns the same sitemap URL for repeated calls with the same configuration', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://talenttrust.app';

    expect(robots().sitemap).toBe(robots().sitemap);
  });
});
