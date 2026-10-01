#!/usr/bin/env node
/**
 * check-bundle-budget.mjs
 * ───────────────────────
 * Fail the build when any App Router route's first-load JS exceeds its
 * declared budget.
 *
 * Usage (after `next build`):
 *   node scripts/check-bundle-budget.mjs
 *
 * The BUDGET map below records baseline sizes per route.  Update it
 * whenever routes or their JS footprint change.  Routes NOT listed are
 * skipped (opt-in by listing).
 */

import { readFileSync, existsSync, statSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── Per-route budget (KB) ────────────────────────────────────────────
// Populate with actual baselines after the first `next build`.
// Every route added to the app should get an entry here.
const BUDGET = {
  // TODO: insert per-route baseline after next build
  // '/'        : 200,
  // '/login'   : 120,
  // '/register': 140,
  // '/dashboard': 350,
  // '/contracts': 300,
  // '/milestones': 280,
};
// ──────────────────────────────────────────────────────────────────────

// ---- Manifest discovery ----
const APP_MANIFEST = resolve(ROOT, '.next', 'app-build-manifest.json');
const PAGES_MANIFEST = resolve(ROOT, '.next', 'build-manifest.json');

const manifestPath = [APP_MANIFEST, PAGES_MANIFEST].find(existsSync);

if (!manifestPath) {
  console.error(
    `❌ No build manifest found.  Run \`next build\` first.\n\n` +
    `  Tried:\n    - ${APP_MANIFEST}\n    - ${PAGES_MANIFEST}`,
  );
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
const pages = manifest.pages || {};

// ---- Collect per-route sizes ----
const routes = [];

for (const [route, entry] of Object.entries(pages)) {
  // Skip Next.js internal routes
  if (route.startsWith('/_') || route.startsWith('/api/')) continue;

  // entry can be an array (Pages Router) or an object of file groups (App Router)
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
    // file paths are relative to .next/; strip any leading slash
    const clean = file.replace(/^\//, '');
    const fullPath = resolve(ROOT, '.next', clean);
    try {
      totalBytes += statSync(fullPath).size;
    } catch {
      // Some entries reference virtual chunks or CSS that may not exist
      // as standalone files — safe to skip.
    }
  }

  const sizeKB = Math.round(totalBytes / 1024);
  const budget = BUDGET[route];
  const hasBudget = budget !== undefined;
  const pass = hasBudget && sizeKB <= budget;

  routes.push({ route, sizeKB, budget, pass, hasBudget });
}

// ---- Report ----
console.log('\n─── 📦 Bundle Budget Report ──────────────────────────────');
let allPass = true;

for (const { route, sizeKB, budget, pass, hasBudget } of routes) {
  const status = hasBudget ? (pass ? ' ✅' : ' ❌') : ' ⏭️';
  const b = hasBudget ? `${budget} KB` : 'unchecked';
  console.log(
    `  ${status}  ${route.padEnd(24)} ${String(sizeKB).padStart(6)} KB  budget: ${b}`,
  );
  if (hasBudget && !pass) allPass = false;
}

console.log('────────────────────────────────────────────────────────────');

if (!allPass) {
  console.log('\n❌ FAILED — some routes exceed their budget.\n');
  process.exit(1);
}

if (routes.length === 0) {
  console.log('\n⚠️  No routes found in manifest.  Did `next build` complete?\n');
  process.exit(1);
}

console.log(`\n✅ All ${routes.length} route(s) within budget (${Object.keys(BUDGET).length} budgeted).\n`);
