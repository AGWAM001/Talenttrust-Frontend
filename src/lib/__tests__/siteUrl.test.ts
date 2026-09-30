import {
  createSiteUrlResolver,
  redactSiteUrl,
  resolveSiteUrl,
  DEFAULT_SITE_URL,
  MAX_SITE_URL_CACHE_ENTRIES,
} from '../siteUrl';

describe('resolveSiteUrl', () => {
  it('accepts a bare https origin', () => {
    expect(resolveSiteUrl('https://talenttrust.app')).toEqual({
      url: 'https://talenttrust.app',
      source: 'env',
    });
  });

  it('preserves an explicit port', () => {
    expect(resolveSiteUrl('http://localhost:3000')).toEqual({
      url: 'http://localhost:3000',
      source: 'env',
    });
  });

  it('preserves a subpath deployment prefix and trims its trailing slash', () => {
    expect(resolveSiteUrl('https://talenttrust.app/app/')).toEqual({
      url: 'https://talenttrust.app/app',
      source: 'env',
    });
  });

  it('trims surrounding whitespace', () => {
    expect(resolveSiteUrl('  https://talenttrust.app \n').url).toBe(
      'https://talenttrust.app',
    );
  });

  it('lowercases the host but leaves the path case intact', () => {
    expect(resolveSiteUrl('https://TalentTrust.App/Contracts').url).toBe(
      'https://talenttrust.app/Contracts',
    );
  });

  it('is a fixed point: re-resolving an accepted origin is stable', () => {
    const once = resolveSiteUrl('https://talenttrust.app/');
    const twice = resolveSiteUrl(once.url);

    expect(twice).toEqual(once);
    expect(twice.url).toBe(once.url);
  });

  describe('rejections', () => {
    const cases: Array<[unknown, string]> = [
      [undefined, 'missing'],
      [null, 'missing'],
      [42, 'not_a_string'],
      [{}, 'not_a_string'],
      [[], 'not_a_string'],
      [true, 'not_a_string'],
      ['', 'empty'],
      ['   ', 'empty'],
      ['https://talenttrust.app\r\nDisallow: /admin', 'control_characters'],
      ['https://talenttrust.app\u0000', 'control_characters'],
      ['talenttrust.app', 'unparsable'],
      ['https://', 'unparsable'],
      ['javascript:alert(1)', 'not_http'],
      ['data:text/plain,hi', 'not_http'],
      ['file:///etc/passwd', 'not_http'],
      ['https://user:pass@talenttrust.app', 'credentials'],
      ['https://user@talenttrust.app', 'credentials'],
      ['https://talenttrust.app?token=abc', 'query_or_fragment'],
      ['https://talenttrust.app/#frag', 'query_or_fragment'],
    ];

    it.each(cases)('refuses %p with reason %s and falls back', (raw, reason) => {
      expect(resolveSiteUrl(raw)).toEqual({
        url: DEFAULT_SITE_URL,
        source: 'default',
        reason,
      });
    });

    it('refuses a value one character over the length limit', () => {
      const prefix = 'https://talenttrust.app/';
      const atLimit = prefix + 'a'.repeat(2048 - prefix.length);
      const overLimit = `${atLimit}a`;

      expect(atLimit.length).toBe(2048);
      expect(resolveSiteUrl(atLimit).source).toBe('env');
      expect(resolveSiteUrl(overLimit).reason).toBe('too_long');
    });

    it('never lets a rejected value reach the resolved url', () => {
      const rejected = [
        'javascript:alert(1)',
        'https://user:pass@talenttrust.app',
        'https://talenttrust.app\r\nDisallow: /',
      ];

      for (const raw of rejected) {
        const { url } = resolveSiteUrl(raw);
        expect(url.startsWith(DEFAULT_SITE_URL)).toBe(true);
        expect(url).toBe(resolveSiteUrl(raw).url);
      }
    });
  });
});

describe('redactSiteUrl', () => {
  it('scrubs control characters used for log injection', () => {
    expect(redactSiteUrl('https://a.app\nUser-agent: *')).not.toMatch(/[\r\n]/);
  });

  it('removes embedded credentials', () => {
    const preview = redactSiteUrl('https://user:sup3rsecret@a.app');

    expect(preview).not.toContain('sup3rsecret');
    expect(preview).toContain('userinfo redacted');
  });

  it('removes query strings and fragments', () => {
    const preview = redactSiteUrl('https://a.app/x?token=abc#f');

    expect(preview).not.toContain('abc');
    expect(preview).toContain('query/fragment redacted');
  });

  it('truncates long values', () => {
    const preview = redactSiteUrl(`https://a.app/${'b'.repeat(500)}`);

    expect(preview.length).toBeLessThanOrEqual(41);
  });

  it('labels non-string values', () => {
    expect(redactSiteUrl(1234)).toBe('[non-string]');
    expect(redactSiteUrl(null)).toBe('[non-string]');
  });
});

describe('createSiteUrlResolver', () => {
  it('returns an identical frozen object for repeated calls (idempotent retry)', () => {
    const resolver = createSiteUrlResolver();
    const first = resolver.resolve('https://talenttrust.app');
    const second = resolver.resolve('https://talenttrust.app');

    expect(second).toBe(first);
    expect(Object.isFrozen(first)).toBe(true);
    expect(resolver.size()).toBe(1);
  });

  it('does not serve a previous resolution after the value changes', () => {
    const resolver = createSiteUrlResolver();

    expect(resolver.resolve('https://one.app').url).toBe('https://one.app');
    expect(resolver.resolve('https://two.app').url).toBe('https://two.app');
    expect(resolver.resolve('https://one.app').url).toBe('https://one.app');
  });

  it('resolves racing reads consistently when env is flipped mid-flight', async () => {
    const resolver = createSiteUrlResolver();
    const values = [
      'https://a.app',
      'https://b.app',
      'https://c.app',
      'javascript:alert(1)',
      undefined,
      'https://a.app/',
      '',
    ];

    const rounds = await Promise.all(
      Array.from({ length: 25 }, () =>
        Promise.resolve().then(() => values.map(v => resolver.resolve(v).url)),
      ),
    );

    for (const round of rounds) {
      expect(round).toEqual([
        'https://a.app',
        'https://b.app',
        'https://c.app',
        DEFAULT_SITE_URL,
        DEFAULT_SITE_URL,
        'https://a.app',
        DEFAULT_SITE_URL,
      ]);
    }
  });

  it('isolates concurrent callers from mutation of a shared resolution', () => {
    const resolver = createSiteUrlResolver();
    const shared = resolver.resolve('https://talenttrust.app');

    expect(() => {
      (shared as { url: string }).url = 'https://attacker.app';
    }).toThrow(TypeError);

    expect(resolver.resolve('https://talenttrust.app').url).toBe('https://talenttrust.app');
  });

  it('freezes fallback resolutions too', () => {
    const resolver = createSiteUrlResolver();

    expect(Object.isFrozen(resolver.resolve(undefined))).toBe(true);
  });

  it('bounds the cache and evicts the oldest entry first', () => {
    const resolver = createSiteUrlResolver({ maxEntries: 3 });

    resolver.resolve('https://one.app');
    resolver.resolve('https://two.app');
    resolver.resolve('https://three.app');
    expect(resolver.size()).toBe(3);

    resolver.resolve('https://four.app');
    expect(resolver.size()).toBe(3);

    // Oldest evicted, newest retained; values themselves stay correct.
    expect(resolver.resolve('https://four.app').url).toBe('https://four.app');
    expect(resolver.resolve('https://one.app').url).toBe('https://one.app');
    expect(resolver.size()).toBe(3);
  });

  it('defaults to the documented bound', () => {
    const resolver = createSiteUrlResolver();

    for (let i = 0; i < MAX_SITE_URL_CACHE_ENTRIES + 5; i += 1) {
      resolver.resolve(`https://host-${i}.app`);
    }

    expect(resolver.size()).toBe(MAX_SITE_URL_CACHE_ENTRIES);
  });

  it('reports a rejected value once per distinct raw value', () => {
    const onInvalid = jest.fn();
    const resolver = createSiteUrlResolver({ onInvalid });

    for (let i = 0; i < 10; i += 1) resolver.resolve('javascript:alert(1)');
    resolver.resolve('https://ok.app');
    resolver.resolve('javascript:alert(2)');

    expect(onInvalid).toHaveBeenCalledTimes(2);
    expect(onInvalid.mock.calls[0][0]).toBe('not_http');
    expect(onInvalid.mock.calls[1][0]).toBe('not_http');
  });

  it('reports again after reset', () => {
    const onInvalid = jest.fn();
    const resolver = createSiteUrlResolver({ onInvalid });

    resolver.resolve('nonsense');
    resolver.reset();
    expect(resolver.size()).toBe(0);
    resolver.resolve('nonsense');

    expect(onInvalid).toHaveBeenCalledTimes(2);
  });

  it('does not report accepted values', () => {
    const onInvalid = jest.fn();
    const resolver = createSiteUrlResolver({ onInvalid });

    resolver.resolve('https://talenttrust.app');

    expect(onInvalid).not.toHaveBeenCalled();
  });

  it('does not report an absent value (normal development default)', () => {
    const onInvalid = jest.fn();
    const resolver = createSiteUrlResolver({ onInvalid });

    resolver.resolve(undefined);
    resolver.resolve(null);

    expect(onInvalid).not.toHaveBeenCalled();
  });

  it('still resolves when the diagnostic channel throws', () => {
    const resolver = createSiteUrlResolver({
      onInvalid: () => {
        throw new Error('logger exploded');
      },
    });

    expect(resolver.resolve('javascript:alert(1)').url).toBe(DEFAULT_SITE_URL);
  });

  it('honours a custom default origin', () => {
    const resolver = createSiteUrlResolver({ defaultSiteUrl: 'https://fallback.app' });

    expect(resolver.resolve(undefined)).toEqual({
      url: 'https://fallback.app',
      source: 'default',
      reason: 'missing',
    });
  });

  it('treats absent and empty environment values as distinct cache keys', () => {
    const resolver = createSiteUrlResolver();

    resolver.resolve(undefined);
    resolver.resolve(null);
    expect(resolver.size()).toBe(2);
  });
});