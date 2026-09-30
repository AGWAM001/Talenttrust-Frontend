// ── Fixtures ─────────────────────────────────────────────────────────
// We don't want an actual `next build` in unit tests, so we construct
// minimal in-memory manifest fixtures and test the script's core logic
// by extracting it as a pure function.

// The script's manifest format (App Router shape)
interface ManifestEntry {
  headerFiles?: string[];
  staticFiles?: string[];
  dynamicFiles?: string[];
  chunks?: string[];
}

type ManifestPages = Record<string, string[] | ManifestEntry>;

interface RouteResult {
  route: string;
  sizeKB: number;
  budget: number | undefined;
  pass: boolean;
  hasBudget: boolean;
}

/**
 * Pure-function equivalent of the budget check logic.
 * Accepts a raw manifest + budget map and returns route results.
 */
function checkBudget(
  pages: ManifestPages,
  budgetMap: Record<string, number>,
  fileSizeResolver: (path: string) => number,
): RouteResult[] {
  const results: RouteResult[] = [];

  for (const [route, entry] of Object.entries(pages)) {
    if (route.startsWith('/_')) continue;

    const files = Array.isArray(entry)
      ? entry
      : [
          ...(entry.headerFiles || []),
          ...(entry.staticFiles || []),
          ...(entry.dynamicFiles || []),
          ...(Array.isArray(entry.chunks) ? entry.chunks : []),
        ].flat();

    let totalBytes = 0;
    for (const file of files) {
      try {
        totalBytes += fileSizeResolver(file);
      } catch {
        // missing / virtual chunk — skip
      }
    }

    const sizeKB = Math.round(totalBytes / 1024);
    const budget = budgetMap[route];
    const hasBudget = budget !== undefined;
    const pass = hasBudget && sizeKB <= budget;

    results.push({ route, sizeKB, budget, pass, hasBudget });
  }

  return results;
}

describe('check-bundle-budget', () => {
  // ── Helpers ────────────────────────────────────────────────────────

  /** Stub resolver that returns a fixed file size per file name. */
  function stubResolver(sizeMap: Record<string, number>) {
    return (filePath: string): number => {
      for (const [needle, size] of Object.entries(sizeMap)) {
        if (filePath.includes(needle)) return size;
      }
      return 0;
    };
  }

  // ── App Router format ──────────────────────────────────────────────

  it('returns pass for routes within budget (App Router format)', () => {
    const pages: ManifestPages = {
      '/': {
        staticFiles: ['static/chunks/app/page-abc.js'],
        headerFiles: [],
        dynamicFiles: [],
      },
      '/dashboard': {
        staticFiles: ['static/chunks/app/dashboard-xyz.js'],
        headerFiles: [],
        dynamicFiles: [],
      },
    };

    const resolver = stubResolver({
      'page-abc.js': 100 * 1024,        // ~100 KB
      'dashboard-xyz.js': 250 * 1024,    // ~250 KB
    });

    const results = checkBudget(pages, { '/': 200, '/dashboard': 350 }, resolver);

    expect(results).toHaveLength(2);
    expect(results.find(r => r.route === '/')!.pass).toBe(true);
    expect(results.find(r => r.route === '/dashboard')!.pass).toBe(true);
  });

  it('fails a route that exceeds its budget', () => {
    const pages: ManifestPages = {
      '/': { staticFiles: ['static/chunks/app/page-big.js'], headerFiles: [], dynamicFiles: [] },
    };

    const resolver = stubResolver({ 'page-big.js': 500 * 1024 }); // 500 KB
    const results = checkBudget(pages, { '/': 200 }, resolver);

    expect(results).toHaveLength(1);
    expect(results[0].pass).toBe(false);
    expect(results[0].sizeKB).toBe(500);
  });

  it('skips routes not in the budget map (unchecked)', () => {
    const pages: ManifestPages = {
      '/': { staticFiles: ['static/chunks/app/page.js'], headerFiles: [], dynamicFiles: [] },
      '/new-feature': { staticFiles: ['static/chunks/app/new-feature.js'], headerFiles: [], dynamicFiles: [] },
    };

    const resolver = stubResolver({ '.js': 100 * 1024 });
    const results = checkBudget(pages, { '/': 200 }, resolver);
    const unchecked = results.find(r => r.route === '/new-feature')!;

    expect(unchecked.hasBudget).toBe(false);
    expect(unchecked.pass).toBe(false); // no budget = not automatically pass
  });

  it('skips Next.js internal routes (/_app, /_error)', () => {
    const pages: ManifestPages = {
      '/_app': { staticFiles: ['static/chunks/app/_app.js'], headerFiles: [], dynamicFiles: [] },
      '/': { staticFiles: ['static/chunks/app/page.js'], headerFiles: [], dynamicFiles: [] },
    };

    const resolver = stubResolver({ '.js': 50 * 1024 });
    const results = checkBudget(pages, { '/': 200 }, resolver);

    expect(results).toHaveLength(1);
    expect(results[0].route).toBe('/');
  });

  it('tolerates missing/virtual files in the manifest (no crash)', () => {
    const pages: ManifestPages = {
      '/': { staticFiles: [], headerFiles: ['virtual/chunk.css'], dynamicFiles: [] },
    };

    const resolver = stubResolver({}); // nothing resolves
    const results = checkBudget(pages, { '/': 200 }, resolver);

    expect(results).toHaveLength(1);
    expect(results[0].sizeKB).toBe(0); // missing files contributed 0
    expect(results[0].pass).toBe(true);
  });

  it('handles Pages Router array format gracefully', () => {
    const pages: ManifestPages = {
      '/': ['static/chunks/pages/index-abc.js'],
      '/about': ['static/chunks/pages/about-xyz.js'],
    };

    const resolver = stubResolver({
      'index-abc.js': 150 * 1024,
      'about-xyz.js': 80 * 1024,
    });

    const results = checkBudget(pages, { '/': 200, '/about': 100 }, resolver);
    expect(results.every(r => r.pass)).toBe(true);
  });

  it('reports correct KB rounding', () => {
    const pages: ManifestPages = {
      '/': { staticFiles: ['file.js'], headerFiles: [], dynamicFiles: [] },
    };

    // 1.2 KB → rounds to 1
    const resolver = stubResolver({ 'file.js': 1234 });
    const [r] = checkBudget(pages, { '/': 2 }, resolver);
    expect(r.sizeKB).toBe(1);
  });
});
