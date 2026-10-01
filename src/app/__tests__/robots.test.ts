import robots from '../robots';

describe('robots.ts', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
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

  it('uses the default URL when NEXT_PUBLIC_SITE_URL is blank', () => {
    const warning = jest.spyOn(console, 'warn').mockImplementation();
    process.env.NEXT_PUBLIC_SITE_URL = '   ';

    expect(robots().sitemap).toBe('http://localhost:3000/sitemap.xml');
    expect(warning).not.toHaveBeenCalled();
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
  ])('omits the sitemap for invalid NEXT_PUBLIC_SITE_URL: %s', (siteUrl) => {
    const warning = jest.spyOn(console, 'warn').mockImplementation();
    process.env.NEXT_PUBLIC_SITE_URL = siteUrl;

    const result = robots();

    expect(result).toEqual({
      rules: {
        userAgent: '*',
        allow: '/',
      },
    });
    expect(warning).toHaveBeenCalledWith(
      'Invalid NEXT_PUBLIC_SITE_URL; omitting sitemap from robots metadata.',
    );
    expect(warning).not.toHaveBeenCalledWith(expect.stringContaining(siteUrl));
  });

  it('recovers on a later call after the configured URL is corrected', () => {
    const warning = jest.spyOn(console, 'warn').mockImplementation();
    process.env.NEXT_PUBLIC_SITE_URL = 'invalid-url';

    const failedResult = robots();
    process.env.NEXT_PUBLIC_SITE_URL = 'https://talenttrust.app';
    const recoveredResult = robots();

    expect(failedResult.sitemap).toBeUndefined();
    expect(recoveredResult.sitemap).toBe(
      'https://talenttrust.app/sitemap.xml',
    );
    expect(warning).toHaveBeenCalledTimes(1);
  });

  it('returns the same sitemap URL for repeated calls with the same configuration', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://talenttrust.app';

    expect(robots().sitemap).toBe(robots().sitemap);
  });
});
