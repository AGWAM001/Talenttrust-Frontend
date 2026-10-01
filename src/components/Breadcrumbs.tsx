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
};

export type BreadcrumbsProps = {
  /** Ordered list of crumbs from root to current page. */
  items: BreadcrumbItem[];
};

const SAFE_HREF_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);

const isSafeHref = (href: string): boolean => {
  if (href.trim().length === 0) return false;

  try {
    const url = new URL(href, 'https://breadcrumbs.invalid');
    return SAFE_HREF_PROTOCOLS.has(url.protocol);
  } catch {
    return false;
  }
};

const isBreadcrumbItem = (item: unknown): item is BreadcrumbItem => {
  if (typeof item !== 'object' || item === null || !('label' in item)) return false;
  if (typeof item.label !== 'string' || item.label.trim().length === 0) return false;
  if (!('href' in item) || item.href === undefined) return true;

  return typeof item.href === 'string' && isSafeHref(item.href);
};

/**
 * Accessible breadcrumb navigation component.
 *
 * Renders a `<nav aria-label="Breadcrumb">` containing an `<ol>` of crumbs.
 * Ancestral crumbs are wrapped in Next.js `<Link>`; the final crumb is plain
 * text marked with `aria-current="page"`. Visual separators are hidden from
 * assistive technologies via `aria-hidden`.
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
  // Validate the entire trail so malformed entries cannot change the current crumb.
  if (!Array.isArray(items) || !Array.from(items).every(isBreadcrumbItem)) {
    console.error('Breadcrumbs received invalid items; navigation was omitted.');
    return null;
  }

  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-slate-500">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1">
              {/* Separator — hidden from screen readers */}
              {index > 0 && (
                <span aria-hidden="true" className="select-none text-slate-400">
                  /
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

export default Breadcrumbs;
