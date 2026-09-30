import React from 'react';
import Link from 'next/link';

/** A single breadcrumb entry. Omit `href` for the current (final) crumb. */
export type BreadcrumbItem = {
  /** Visible label for this crumb. */
  label: string;
  /**
   * Navigation target. When provided the crumb renders as a Next.js `<Link>`.
   * Omit for the final crumb, which renders as plain text with `aria-current="page"`.
   */
  href?: string;
  /** Optional unique identifier for stable key assignment under concurrent re-renders. */
  id?: string;
  [key: string]: unknown;
};

export interface BreadcrumbsProps extends React.HTMLAttributes<HTMLElement> {
  /** Ordered list of crumbs from root to current page. */
  items?: BreadcrumbItem[];
  /** Optional route path string used to derive breadcrumb hierarchy dynamically. */
  path?: string;
  /** Optional custom CSS classes merged onto the `<nav>` container. */
  className?: string;
  /** Visual separator between crumbs (default: `/`). */
  separator?: React.ReactNode;
  /** Custom data-testid for integration and regression testing. */
  'data-testid'?: string;
}

export const BREADCRUMBS_NAV_CLASS = '';
export const BREADCRUMBS_OL_CLASS = 'flex flex-wrap items-center gap-1 text-sm text-slate-500';

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
 * Concurrency Hardening:
 * - Deterministic normalization across valid, empty, malformed, or racing inputs.
 * - Dynamic path-to-crumb derivation with idempotent route parsing and safe URI decoding.
 * - Stable key allocation preventing DOM desynchronization during rapid concurrent state updates.
 * - Fully memoized via React.memo for idempotent multi-threaded / concurrent rendering.
 */
const BreadcrumbsComponent = ({
  items,
  path,
  className = '',
  separator = '/',
  'aria-label': ariaLabel = 'Breadcrumb',
  'data-testid': testId,
  ...rest
}: BreadcrumbsProps) => {
  const resolvedItems = normalizeBreadcrumbItems(items, path);
  if (resolvedItems.length === 0) return null;

  return (
    <nav aria-label={ariaLabel} className={className || undefined} data-testid={testId} {...rest}>
      <ol className={BREADCRUMBS_OL_CLASS}>
        {resolvedItems.map((item, index) => {
          const isLast = index === resolvedItems.length - 1;
          const key = item.id ?? `${item.href ?? ''}-${item.label}-${index}`;

          return (
            <li key={key} className="flex items-center gap-1">
              {/* Separator — hidden from screen readers */}
              {index > 0 && (
                <span aria-hidden="true" className="select-none text-slate-400">
                  {separator}
                </span>
              )}

              {isLast ? (
                // Current page: plain text, no link, aria-current for AT
                <span
                  aria-current="page"
                  className="font-medium text-slate-900 truncate max-w-[16rem]"
                >
                  {item.label}
                </span>
              ) : (
                // Ancestor: linked crumb
                <Link
                  href={item.href ?? '/'}
                  className="truncate max-w-[16rem] transition hover:text-slate-900 hover:underline rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
                >
                  {item.label}
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
