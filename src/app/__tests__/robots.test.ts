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

  // --- Compatibility contract: robots must advertise where the sitemap lives ---

  it.each([
    ['https://talenttrust.app/', 'trailing slash'],
    ['https://talenttrust.app///', 'repeated trailing slashes'],
    ['  https://talenttrust.app  ', 'surrounding whitespace'],
  ])('should not double the slash for a %s value', (value) => {
    process.env.NEXT_PUBLIC_SITE_URL = value;

    expect(robots().sitemap).toBe('https://talenttrust.app/sitemap.xml');
  });

  it('should advertise the dev origin when the configured URL is unusable', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'not a url';

    expect(robots().sitemap).toBe('http://localhost:3000/sitemap.xml');
  });
});
