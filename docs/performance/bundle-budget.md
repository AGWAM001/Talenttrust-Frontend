# Bundle Budget

## Overview

The bundle budget check runs after every production build to ensure no route's
first-load JavaScript exceeds its declared ceiling.  Regressions are caught in
CI before they reach production.

## Running the check

```bash
# After a successful `next build`:
node scripts/check-bundle-budget.mjs
```

The script reads `.next/app-build-manifest.json` (or `.next/build-manifest.json`
as fallback), sums the file sizes per route, and compares each against its
budget in `scripts/check-bundle-budget.mjs`.

A convenience NPM script is also wired:

```bash
npm run analyze
```

## Updating budgets

The budget map lives at the top of `scripts/check-bundle-budget.mjs`:

```js
const BUDGET = {
  '/'        : 200,
  '/login'   : 120,
  '/register': 140,
  '/dashboard': 350,
};
```

When a route's JS footprint changes (new dependency, restructure, etc.):

1. Run `npm run build && npm run analyze`
2. Note the reported size for the affected route
3. Update the number in `BUDGET`
4. Commit with a reasoning comment (e.g. `// +50 KB after adding chart library`)

## CI integration

The build workflow should run budget check as the last step:

```yaml
- run: npm run build
- run: npm run analyze
```

If the check exits non-zero the pipeline fails, preventing accidental bundle
bloat from reaching production.

## Current baseline

*TODO: populate once the script has been run against a production build.*
