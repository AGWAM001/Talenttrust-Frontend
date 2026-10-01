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
 * Result of normalizing the input items into a deterministic,
 * render-safe list.
 */
export type NormalizedBreadcrumbs = {
  /** Crumbs that will actually be rendered. */
  items: BreadcrumbItem[];
  /** Number of input entries that were dropped as invalid. */
  droppedInvalidCount: number;
  /** Number of duplicate labels/targets that were collapsed. */
  dedupedCount: number;
};

const MAX_LABEL_LENGTH = 512;
const MAX_HREF_LENGTH = 2048;

/**
 * Return true when `value` is a non-empty string after trimming.
 */
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

/**
 * Return true when `href` is a safe, renderable navigation target.
 *
 * We only accept relative paths and http(s) URLs. This blocks dangerous
 * schemes such as `javascript:`, `data:`, `vbscript:`, and `mailto:` from
 * being rendered as a `<Link>`. Control characters and whitespace are
 * rejected because they can be used to obfuscate dangerous schemes.
 */
export const isSafeBreadcrumbHref = (href: unknown): href is string => {
  if (!isNonEmptyString(href)) return false;
  if (href.length > MAX_HREF_LENGTH) return false;
  // Reject control characters and newlines.
  if (/[\u0000-\u001F\u007F]/.test(href)) return false;
  // Reject leading/trailing whitespace.
  if (href !== href.trim()) return false;

  // Relative path (including protocol-relative `//`) is always allowed.
  if (href.startsWith('/')) return true;

  // Absolute URLs: only http and https.
  try {
    const parsed = new URL(href);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * Normalize and validate a list of breadcrumb items.
 *
 * This function is pure and deterministic: the same input always produces
 * the same output. It is the single source of truth for what the component
 * will render, which makes failure recovery and testing straightforward.
 *
 * Invariants:
 * - Every returned item has a non-empty, trimmed label.
 * - Every returned item has a safe `href` or no `href` at all.
 * - Duplicate consecutive labels are collapsed to a single crumb.
 * - The last item is always treated as the current page (no `href`).
 */
export const normalizeBreadcrumbs = (items: unknown): NormalizedBreadcrumbs => {
  const safeItems = Array.isArray(items) ? items : [];

  const normalized: BreadcrumbItem[] = [];
  let droppedInvalidCount = 0;
  let dedupedCount = 0;

  for (const rawItem of safeItems) {
    if (!rawItem || typeof rawItem !== 'object') {
      droppedInvalidCount += 1;
      continue;
    }

    const candidate = rawItem as { label?: unknown; href?: unknown };
    const label = typeof candidate.label === 'string' ? candidate.label.trim() : '';

    if (label.length === 0 || label.length > MAX_LABEL_LENGTH) {
      droppedInvalidCount += 1;
      continue;
    }

    const hasHref = candidate.href !== undefined && candidate.href !== null;
    const href = hasHref && isSafeBreadcrumbHref(candidate.href)
      ? (candidate.href as string)
      : undefined;

    if (hasHref && href === undefined) {
      // Unsafe or malformed href: drop the href but keep the label so the
      // user still sees the trail and can recover via other navigation.
      droppedInvalidCount += 1;
    }

    const previous = normalized[normalized.length - 1];
    if (previous && previous.label === label && previous.href === href) {
      dedupedCount += 1;
      continue;
    }

    normalized.push(href === undefined ? { label } : { label, href });
  }

  // The final crumb is always the current page: drop any `href` on it.
  if (normalized.length > 0) {
    const last = normalized[normalized.length - 1];
    if (last.href !== undefined) {
      normalized[normalized.length - 1] = { label: last.label };
    }
  }

  return { items: normalized, droppedInvalidCount, dedupedCount };
};

/**
 * Accessible breadcrumb navigation component.
 *
 * Renders a `<nav aria-label="Breadcrumb">` containing an `<ol>` of crumbs.
 * Ancestral crumbs are wrapped in Next.js `<Link>`; the final crumb is plain
 * text marked with `aria-current="page"`. Visual separators are hidden from
 * assistive technologies via `aria-hidden`.
 *
 * Failure recovery is deterministic: invalid entries are dropped, duplicate
 * consecutive entries are collapsed, and unsafe `href` values are stripped
 * while keeping the label visible. The component never throws on malformed
 * input, so a breadcrumb failure cannot take down the surrounding page.
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
  const { items: normalizedItems } = normalizeBreadcrumbs(items);

  if (normalizedItems.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" data-testid="breadcrumbs">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-slate-500">
        {normalizedItems.map((item, index) => {
          const isLast = index === normalizedItems.length - 1;

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

              {isLast || !item.href ? (
                // Current page (or a crumb with an unsafe/missing href):
                // plain text, no link, aria-current for AT.
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className="font-medium text-slate-900 truncate max-w-[16rem]"
                >
                  {label}
                </span>
              ) : (
                // Ancestor: linked crumb.
                // Invariant: missing href falls back to "/" — navigation is
                // never silently broken.
                <Link
                  href={item.href}
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
