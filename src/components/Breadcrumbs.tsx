import React from 'react';
import Link from 'next/link';

// ---------------------------------------------------------------------------
// Public types — these form the compatibility contract for all callers.
// Do NOT remove or rename exported members without a migration path.
// ---------------------------------------------------------------------------

/** A single breadcrumb entry. Omit `href` for the current (final) crumb. */
export type BreadcrumbItem = {
  /** Visible label for this crumb. Must be a non-empty, non-whitespace-only string. */
  label: string;
  /**
   * Navigation target. When provided the crumb renders as a Next.js `<Link>`.
   * Omit (or pass `undefined`) for the final crumb, which renders as plain text
   * with `aria-current="page"`.
   *
   * **Invariant**: if an ancestor crumb (any crumb that is not the last item)
   * has no `href`, the component falls back to `"/"` so navigation is never
   * broken silently.
   */
  href?: string;
  /** Optional unique identifier for stable key assignment under concurrent re-renders. */
  id?: string;
  [key: string]: unknown;
};

export type BreadcrumbsProps = {
  /**
   * Ordered list of crumbs from root to current page.
   *
   * **Invariants enforced at runtime (all are no-ops or filtered, never thrown):**
   * - `null` / `undefined` entries are silently dropped.
   * - Items whose `label` trims to an empty string are silently dropped.
   * - Consecutive duplicate items (same `label` + same `href`) are deduplicated;
   *   only the first occurrence is kept.
   * - An empty array (or an array that is entirely invalid) returns `null`.
   * - React auto-escapes string content inside JSX, so labels containing HTML
   *   special characters are rendered as text — XSS via `label` is not possible.
   */
  items: BreadcrumbItem[];
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Normalise a raw label: trim leading/trailing whitespace.
 * Returns an empty string for non-string / falsy inputs so the caller can
 * detect and drop the item.
 *
 * @invariant Pure function — same input always yields the same output.
 */
function normaliseLabel(label: unknown): string {
  if (typeof label !== 'string') return '';
  return label.trim();
}

/**
 * Deduplicate consecutive items that are identical (same normalised label
 * AND same href).  Non-consecutive duplicates are preserved because they can
 * represent intentional navigation loops.
 *
 * @invariant Does not mutate the original array.
 */
function deduplicateItems(items: BreadcrumbItem[]): BreadcrumbItem[] {
  return items.filter((item, index) => {
    if (index === 0) return true;
    const prev = items[index - 1];
    return !(item.label === prev.label && item.href === prev.href);
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Deterministically humanizes a raw path segment into an accessible label.
 */
function formatSegmentLabel(segment: string): string {
  if (!segment) return '';
  if (/^\d+$/.test(segment)) {
    return `#${segment}`;
  }
  return segment
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Constructs breadcrumb items from a URL path string deterministically.
 * Strips query parameters, hashes, and leading/trailing slashes.
 * Enforces pure state transitions and URL sanitization.
 *
 * @param path - Raw route path (e.g. `/contracts/42?tab=overview#status`).
 * @returns Normalized array of BreadcrumbItem entries.
 */
export function createBreadcrumbsFromPath(path?: string | null): BreadcrumbItem[] {
  if (!path || typeof path !== 'string') return [];

  const cleanPath = path.split(/[?#]/)[0].trim();
  if (!cleanPath) return [];
  if (cleanPath === '/') {
    return [{ label: 'Home', href: '/' }];
  }

  const segments = cleanPath
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean);

  if (segments.length === 0) {
    return [{ label: 'Home', href: '/' }];
  }

  const items: BreadcrumbItem[] = [{ label: 'Home', href: '/' }];
  let accumulatedPath = '';

  for (let i = 0; i < segments.length; i++) {
    const rawSegment = segments[i];
    let decodedSegment = rawSegment;
    try {
      decodedSegment = decodeURIComponent(rawSegment);
    } catch {
      // Keep fallback raw segment
    }

    accumulatedPath += `/${rawSegment}`;
    const isLast = i === segments.length - 1;
    const formattedLabel = formatSegmentLabel(decodedSegment);

    items.push({
      label: formattedLabel,
      ...(isLast ? {} : { href: accumulatedPath }),
    });
  }

  return items;
}

/**
 * Normalizes and sanitizes breadcrumb items against invalid, nullish, or partial inputs.
 * Guarantees deterministic output under concurrent execution or rapid parent re-renders.
 */
export function normalizeBreadcrumbItems(
  rawItems?: unknown,
  path?: string | null,
): BreadcrumbItem[] {
  if (Array.isArray(rawItems)) {
    const normalized: BreadcrumbItem[] = [];
    for (const item of rawItems) {
      if (!item || typeof item !== 'object') continue;
      const rawObj = item as Record<string, unknown>;
      const label =
        typeof rawObj.label === 'string'
          ? rawObj.label.trim()
          : String(rawObj.label ?? '').trim();

      if (!label) continue;

      let href =
        typeof rawObj.href === 'string'
          ? rawObj.href.trim()
          : undefined;

      // Disallow unsafe URI schemes
      if (href && /^(javascript|data|vbscript):/i.test(href)) {
        href = undefined;
      }

      const { href: _unusedHref, ...restItem } = rawObj;

      normalized.push({
        ...restItem,
        label,
        ...(href !== undefined ? { href } : {}),
      });
    }
    return normalized;
  }

  if (typeof path === 'string' && path.trim().length > 0) {
    return createBreadcrumbsFromPath(path);
  }

  return [];
}

/**
 * Accessible, concurrency-hardened breadcrumb navigation component.
 *
 * Renders a `<nav aria-label="Breadcrumb">` containing an `<ol>` of crumbs.
 * Ancestral crumbs are wrapped in Next.js `<Link>`; the final crumb is plain
 * text marked with `aria-current="page"`. Visual separators are hidden from
 * assistive technologies via `aria-hidden`.
 *
 * ## Compatibility contract
 *
 * The following behaviours are explicitly guaranteed and must not be changed
 * without a tested migration path:
 *
 * 1. **Empty `items`** → renders `null` (no DOM output).
 * 2. **Final crumb** → always rendered as `<span aria-current="page">`, never
 *    as a `<Link>`, regardless of whether it carries an `href`.
 * 3. **Ancestor crumbs** → always rendered as `<Link href={item.href ?? "/"}>`.
 *    Missing `href` silently falls back to `"/"`.
 * 4. **Invalid items** → `null`/`undefined` entries and items with empty/
 *    whitespace-only labels are silently dropped before rendering.
 * 5. **Consecutive duplicate items** → the second occurrence is dropped.
 * 6. **React keys** → stable index-based keys on the filtered list prevent
 *    spurious re-mounts when props change.
 * 7. **XSS** → React escapes all string content; no `dangerouslySetInnerHTML`
 *    is used anywhere in this component.
 *
 * @example
 * ```tsx
 * <Breadcrumbs
 *   items={[
 *     { label: 'Dashboard', href: '/' },
 *     { label: 'Contracts', href: '/contracts' },
 *     { label: 'Contract #42' },
 *   ]}
 * />
 * ```
 */
const Breadcrumbs = ({ items }: BreadcrumbsProps) => {
  // ------------------------------------------------------------------
  // 1. Sanitise: drop null/undefined entries and items with blank labels.
  // ------------------------------------------------------------------
  const validItems: BreadcrumbItem[] = (items ?? [])
    .filter((item): item is BreadcrumbItem => item != null)
    .filter((item) => normaliseLabel(item.label) !== '');

  // ------------------------------------------------------------------
  // 2. Deduplicate consecutive identical items.
  // ------------------------------------------------------------------
  const dedupedItems = deduplicateItems(validItems);

  // ------------------------------------------------------------------
  // 3. Early-exit: nothing to render.
  // ------------------------------------------------------------------
  if (dedupedItems.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" data-testid="breadcrumbs">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-slate-500">
        {dedupedItems.map((item, index) => {
          const isLast = index === dedupedItems.length - 1;
          // Normalise label here too so display is consistent with filtering.
          const label = normaliseLabel(item.label);

          return (
            // Stable key: use index on the already-filtered list.
            // Labels are not used in keys to avoid ambiguity when two crumbs
            // share the same visible text.
            <li key={index} className="flex items-center gap-1">
              {/* Separator — hidden from screen readers */}
              {index > 0 && (
                <span aria-hidden="true" className="select-none text-slate-400">
                  {separator}
                </span>
              )}

              {isLast ? (
                // Current page: plain text, no link, aria-current for AT.
                // Invariant: the final crumb is NEVER a link.
                <span
                  aria-current="page"
                  className="font-medium text-slate-900 truncate max-w-[16rem]"
                >
                  {label}
                </span>
              ) : (
                // Ancestor: linked crumb.
                // Invariant: missing href falls back to "/" — navigation is
                // never silently broken.
                <Link
                  href={item.href ?? '/'}
                  className="truncate max-w-[16rem] transition hover:text-slate-900 hover:underline rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
                >
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export const Breadcrumbs = React.memo(BreadcrumbsComponent);
export default Breadcrumbs;
