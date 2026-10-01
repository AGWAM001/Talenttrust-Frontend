/**
 * loading.tsx – /reputation
 *
 * App Router Suspense boundary for the reputation page. Mirrors the layout
 * of ReputationProfile:
 *
 *   Card 1 – Profile card:
 *     - Avatar block + name/label text
 *     - Privacy note panel
 *     - Three metric tiles: score, level, explanation
 *
 *   Card 2 – Reputation history card:
 *     - Heading + "Private by default" badge
 *     - 3 history event rows
 *
 * Accessibility:
 * - Visually-hidden `role="status"` announces "Loading reputation…".
 * - All shimmer blocks carry `aria-hidden="true"`.
 * - Animation disabled for `prefers-reduced-motion` via globals.css rule
 *   and `motion-reduce:animate-none`.
 * - Focus management is handled by ReputationLoadingClient wrapper.
 *
 * ---------------------------------------------------------------------------
 * State invariants owned by this module
 * ---------------------------------------------------------------------------
 * This fallback is intentionally stateless — it renders while the real page
 * streams in and must never influence the loaded state. The following
 * invariants are enforced and covered by
 * `src/app/reputation/__tests__/loading.invariants.test.tsx`:
 *
 * INV-1 (Pure render). The component reads no user, wallet, or reputation
 *   data and performs no I/O. Output is a pure function of a validated
 *   geometry descriptor, so repeated / concurrent renders are idempotent and
 *   deterministic.
 *
 * INV-2 (Privacy). Only static labels and the loading announcement are
 *   emitted. No score, name, address, or history value can ever reach this
 *   fallback, even if the real payload is partial or malformed.
 *
 * INV-3 (Geometry validity). Row / tile counts are clamped to safe bounds and
 *   metric labels are trimmed, de-duplicated and capped. Invalid input can
 *   therefore never produce NaN, negative, or unbounded loops, and React keys
 *   stay unique. Configuration resolution never throws.
 *
 * INV-4 (Announcement). Exactly one `role="status"` live region and the page
 *   heading / cards always render, regardless of geometry.
 *
 * INV-5 (Diagnosability). Invalid geometry is reported through the shared
 *   `reportError` abstraction with a non-sensitive field list — never with
 *   the offending value — so failures are diagnosable without leaking data.
 */

import { reportError } from '@/lib/errorReporter';

// ---------------------------------------------------------------------------
// Invariant constants and pure geometry resolution (INV-1, INV-3, INV-5)
// ---------------------------------------------------------------------------

/** Announced to assistive technology while the route is suspended (INV-4). */
export const REPUTATION_LOADING_ANNOUNCEMENT = 'Loading reputation…';

/**
 * Default metric tile labels. These mirror the three tiles rendered by
 * `ReputationProfile` (score, level, explanation) so the fallback and the
 * resolved page share the same structure.
 */
export const DEFAULT_METRIC_TILE_LABELS: readonly string[] = Object.freeze([
  'Reputation score',
  'Level',
  'Explanation',
]);

/** Number of history placeholder rows rendered by default. */
export const DEFAULT_HISTORY_ROW_COUNT = 3;

/** Bounds that keep placeholder loops finite and layout-safe (INV-3). */
export const MIN_HISTORY_ROW_COUNT = 0;
export const MAX_HISTORY_ROW_COUNT = 10;
export const MAX_METRIC_TILE_LABELS = 8;

export type ReputationLoadingGeometry = {
  readonly metricTileLabels: readonly string[];
  readonly historyRowCount: number;
};

/**
 * Untrusted geometry input. Fields are deliberately typed `unknown` because
 * this is the validation boundary: callers (and future configuration) may
 * pass values that do not match the expected shape.
 */
export type ReputationLoadingGeometryInput = {
  metricTileLabels?: unknown;
  historyRowCount?: unknown;
};

export const DEFAULT_REPUTATION_LOADING_GEOMETRY: ReputationLoadingGeometry =
  Object.freeze({
    metricTileLabels: DEFAULT_METRIC_TILE_LABELS,
    historyRowCount: DEFAULT_HISTORY_ROW_COUNT,
  });

type NormalizedMetricLabels = {
  readonly labels: readonly string[];
  /** Count of entries dropped because they were blank, duplicate, or invalid. */
  readonly dropped: number;
};

/**
 * Trims, de-duplicates (case-insensitively) and caps a list of metric labels.
 *
 * Returns `null` when the input is not an array or yields no usable labels,
 * signalling the caller to fall back to the safe defaults.
 */
function normalizeMetricTileLabels(value: unknown): NormalizedMetricLabels | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const seen = new Set<string>();
  const labels: string[] = [];
  let dropped = 0;

  for (const entry of value) {
    if (typeof entry !== 'string') {
      dropped += 1;
      continue;
    }
    const label = entry.trim();
    if (label.length === 0) {
      dropped += 1;
      continue;
    }
    const key = label.toLowerCase();
    if (seen.has(key) || labels.length >= MAX_METRIC_TILE_LABELS) {
      dropped += 1;
      continue;
    }
    seen.add(key);
    labels.push(label);
  }

  if (labels.length === 0) {
    return null;
  }

  return { labels: Object.freeze(labels), dropped };
}

/**
 * Resolves a trusted, bounded geometry descriptor from possibly-unsafe input.
 *
 * - Missing / `null` input yields {@link DEFAULT_REPUTATION_LOADING_GEOMETRY}.
 * - Non-array or empty metric labels fall back to the defaults.
 * - Duplicate / blank labels are dropped; the result always has at least one.
 * - Non-finite row counts fall back to the default and finite values are
 *   floored then clamped to `[MIN_HISTORY_ROW_COUNT, MAX_HISTORY_ROW_COUNT]`.
 *
 * Never throws (INV-3). Invalid fields are reported without their values
 * (INV-5).
 */
export function resolveReputationLoadingGeometry(
  input?: ReputationLoadingGeometryInput | null,
): ReputationLoadingGeometry {
  if (input === undefined || input === null) {
    return DEFAULT_REPUTATION_LOADING_GEOMETRY;
  }

  let metricTileLabels = DEFAULT_REPUTATION_LOADING_GEOMETRY.metricTileLabels;
  let historyRowCount = DEFAULT_REPUTATION_LOADING_GEOMETRY.historyRowCount;
  const invalidFields: string[] = [];
  let droppedLabels = 0;

  if (input.metricTileLabels !== undefined) {
    const normalized = normalizeMetricTileLabels(input.metricTileLabels);
    if (normalized === null) {
      invalidFields.push('metricTileLabels');
    } else {
      metricTileLabels = normalized.labels;
      droppedLabels = normalized.dropped;
    }
  }

  if (input.historyRowCount !== undefined) {
    if (
      typeof input.historyRowCount !== 'number' ||
      !Number.isFinite(input.historyRowCount)
    ) {
      invalidFields.push('historyRowCount');
    } else {
      historyRowCount = Math.min(
        MAX_HISTORY_ROW_COUNT,
        Math.max(MIN_HISTORY_ROW_COUNT, Math.floor(input.historyRowCount)),
      );
    }
  }

  if (invalidFields.length > 0 || droppedLabels > 0) {
    reportError(
      new Error('Invalid reputation loading geometry'),
      'reputation/loading',
      'warn',
      { invalidFields, droppedLabels },
    );
  }

  return Object.freeze({ metricTileLabels, historyRowCount });
}

// ---------------------------------------------------------------------------
// Local sub-skeletons
// ---------------------------------------------------------------------------

/** Mirrors the top profile card (avatar, name, privacy note, metric tiles). */
const ProfileCardSkeleton = ({
  metricTileLabels,
}: {
  metricTileLabels: readonly string[];
}) => (
  <div
    aria-hidden="true"
    className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
  >
    {/* Avatar + name row */}
    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-4">
        {/* Avatar square */}
        <div className="h-16 w-16 rounded-2xl bg-slate-200 animate-shimmer motion-reduce:animate-none" />
        <div className="space-y-2">
          <div className="h-3.5 w-28 rounded bg-slate-200 animate-shimmer motion-reduce:animate-none" />
          <div className="h-6 w-40 rounded-lg bg-slate-200 animate-shimmer motion-reduce:animate-none" />
        </div>
      </div>
      {/* Privacy note panel */}
      <div className="flex flex-col gap-2 rounded-3xl bg-slate-50 p-4 sm:p-5 lg:w-72">
        <div className="h-3.5 w-36 rounded bg-slate-200 animate-shimmer motion-reduce:animate-none" />
        <div className="h-3 w-full rounded bg-slate-200 animate-shimmer motion-reduce:animate-none" />
        <div className="h-3 w-4/5 rounded bg-slate-200 animate-shimmer motion-reduce:animate-none" />
      </div>
    </div>

    {/* Metric tiles */}
    <div className="mt-8 grid gap-4 sm:grid-cols-3">
      {metricTileLabels.map((label) => (
        <div
          key={label}
          className="rounded-3xl border border-slate-200 bg-slate-50 p-5 space-y-3"
        >
          <p className="h-3.5 text-xs font-medium text-slate-500">{label}</p>
          <div className="h-8 w-20 rounded-lg bg-slate-200 animate-shimmer motion-reduce:animate-none" />
        </div>
      ))}
    </div>
  </div>
);

/** Mirrors the reputation history card with placeholder event rows. */
const HistoryCardSkeleton = ({
  historyRowCount,
}: {
  historyRowCount: number;
}) => (
  <div
    aria-hidden="true"
    className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
  >
    {/* Heading row + badge */}
    <div className="mb-6 flex items-center justify-between gap-4">
      <div className="space-y-2">
        <div className="h-6 w-44 rounded-lg bg-slate-200 animate-shimmer motion-reduce:animate-none" />
        <div className="h-3.5 w-64 rounded bg-slate-200 animate-shimmer motion-reduce:animate-none" />
      </div>
      <div className="h-6 w-28 rounded-full bg-slate-200 animate-shimmer motion-reduce:animate-none" />
    </div>

    {/* History event rows */}
    <ol className="space-y-4">
      {Array.from({ length: historyRowCount }, (_, i) => (
        <li
          key={i}
          className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="h-3.5 w-24 rounded bg-slate-200 animate-shimmer motion-reduce:animate-none" />
              <div className="h-5 w-56 rounded-lg bg-slate-200 animate-shimmer motion-reduce:animate-none" />
            </div>
            <div className="h-3.5 w-20 rounded bg-slate-200 animate-shimmer motion-reduce:animate-none" />
          </div>
        </li>
      ))}
    </ol>
  </div>
);

// ---------------------------------------------------------------------------
// Route loading export
// ---------------------------------------------------------------------------

export default function ReputationLoading() {
  // Deterministic, validated geometry (INV-1, INV-3). No user data is read,
  // so repeated and concurrent renders produce identical markup (INV-2).
  const { metricTileLabels, historyRowCount } =
    DEFAULT_REPUTATION_LOADING_GEOMETRY;

  return (
    <main className="min-h-screen p-8" aria-busy="true">
      <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {REPUTATION_LOADING_ANNOUNCEMENT}
      </span>

      {/* Page heading skeleton */}
      <div
        aria-hidden="true"
        className="mb-6 h-8 w-32 rounded-lg bg-slate-200 animate-shimmer motion-reduce:animate-none"
      />

      {/* ReputationProfile layout */}
      <section className="w-full max-w-5xl mx-auto space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <ProfileCardSkeleton metricTileLabels={metricTileLabels} />
        <HistoryCardSkeleton historyRowCount={historyRowCount} />
      </section>
    </main>
  );
}
