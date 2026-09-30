import React from 'react';
import Link from 'next/link';

// ---------------------------------------------------------------------------
// Public types  (stable – do not remove or rename without a migration plan)
// ---------------------------------------------------------------------------

/** A single breadcrumb entry. Omit `href` for the current (final) crumb. */
export type BreadcrumbItem = {
  /** Visible label for this crumb. Must be a non-empty string. */
  label: string;
  /**
   * Navigation target. When provided the crumb renders as a Next.js `<Link>`.
   * Omit (or pass `undefined`) for the final crumb, which renders as plain
   * text with `aria-current="page"`.
   *
   * Invariant: ancestor crumbs (all crumbs except the last) must supply a
   * non-empty `href`. If `href` is omitted for an ancestor, the component
   * falls back to `"/"` and surfaces a console warning in development so the
   * caller can correct the data. This fallback is intentional: it keeps the
   * component operational in production while making the misconfiguration
   * obvious during development.
   */
  href?: string;
};

export type BreadcrumbsProps = {
  /**
   * Ordered list of crumbs from root to current page.
   * The array is treated as immutable — the component never mutates it.
   * Empty string labels are silently filtered out and a warning is emitted in
   * development so callers can detect data problems without crashing.
   *
   * **Runtime safety**: `null` or `undefined` entries (which can appear when
   * data comes from untyped APIs) are silently dropped before rendering so
   * the component never throws on malformed input.
   */
  items: ReadonlyArray<BreadcrumbItem>;
  /**
   * Accessible label for the `<nav>` landmark.
   * Defaults to `"Breadcrumb"`. Override when the page mounts multiple
   * `<nav>` elements so each has a unique label (WCAG 2.4.6).
   *
   * @default "Breadcrumb"
   */
  ariaLabel?: string;
  /**
   * Optional CSS class(es) applied to the outer `<nav>` element.
   * Allows layout-level overrides without additional wrapper elements.
   * Internal structural classes are not exposed and may change between
   * minor releases; callers should apply only additive layout classes here.
   */
  className?: string;
};

// ---------------------------------------------------------------------------
// Invariant helpers
// ---------------------------------------------------------------------------

/**
 * Emits a warning in development. Noop in production to avoid log spam.
 *
 * @internal
 */
function warn(message: string): void {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[Breadcrumbs] ${message}`);
  }
}

/**
 * Validates and sanitises the items array before render.
 *
 * Invariants enforced:
 *  1. `null` / `undefined` entries are silently dropped (runtime safety for
 *     data arriving from untyped APIs; TypeScript callers should never pass
 *     these but production code must not crash on them).
 *  2. Empty-string labels are removed (they create invisible, non-descriptive
 *     accessible elements). A dev warning is emitted.
 *  3. Ancestor crumbs (not the last item) without an `href` receive a `"/"`
 *     fallback so the DOM is always valid, and a dev warning is emitted.
 *
 * @internal
 */
function sanitiseItems(items: ReadonlyArray<BreadcrumbItem>): BreadcrumbItem[] {
  const filtered: BreadcrumbItem[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    // Guard: null/undefined entries from untyped runtime data.
    if (item == null) {
      warn(
        `items[${i}] is ${String(item)} and will be ignored. ` +
          'Every breadcrumb entry must be a valid BreadcrumbItem object.',
      );
      continue;
    }

    // Guard: empty-string label produces an invisible accessible element.
    if (!item.label.trim()) {
      warn(
        `items[${i}] has an empty label and will be ignored. ` +
          'Every breadcrumb crumb must have a visible, non-empty label.',
      );
      continue;
    }

    filtered.push(item);
  }

  // After filtering, warn about ancestor crumbs that lack an href.
  // The warning fires here (not during render) so it is emitted once per
  // render cycle regardless of list length.
  for (let i = 0; i < filtered.length - 1; i++) {
    if (!filtered[i].href) {
      warn(
        `items[${i}] ("${filtered[i].label}") is an ancestor crumb with no ` +
          'href. Falling back to "/" — pass an explicit href to silence this warning.',
      );
    }
  }

  return filtered;
}

/**
 * Returns a stable, unique React key for a crumb.
 *
 * Strategy: prefer the item's href when present (typically unique per crumb),
 * combined with the index as a tiebreaker. This ensures that duplicate labels
 * with different hrefs (e.g. two "Home" entries pointing to different routes)
 * do not collide, while the index prevents any remaining collisions.
 *
 * @internal
 */
function crumbKey(item: BreadcrumbItem, index: number): string {
  return `${item.href ?? ''}-${item.label}-${index}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Accessible breadcrumb navigation component.
 *
 * ## Compatibility contract
 * - **Exports** `BreadcrumbItem`, `BreadcrumbsProps`, and the default export
 *   `Breadcrumbs` are stable public API. Do not remove or rename them.
 * - **`items` prop** is `ReadonlyArray<BreadcrumbItem>` — the component never
 *   mutates the array.
 * - **Empty arrays** render nothing (`null`). Callers may rely on this.
 * - **`null`/`undefined` entries** are silently dropped with a dev warning;
 *   the component never throws on runtime data from untyped APIs.
 * - **Empty-string labels** are silently filtered with a dev warning; callers
 *   should never pass them but will not crash if they do.
 * - **Missing ancestor `href`** falls back to `"/"` with a dev warning.
 * - **`ariaLabel`** defaults to `"Breadcrumb"`. Existing callers that omit
 *   this prop are unaffected.
 * - **`className`** defaults to `undefined`. Existing callers are unaffected.
 * - The focus ring uses `var(--ring)` (theme token) — not a hardcoded colour.
 *
 * ## Render structure
 * ```
 * <nav aria-label="Breadcrumb">
 *   <ol>
 *     <li>                          ← ancestor crumbs
 *       <Link href="…">label</Link>
 *     </li>
 *     …
 *     <li>                          ← current page
 *       <span aria-current="page">label</span>
 *     </li>
 *   </ol>
 * </nav>
 * ```
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
 *
 * @example Customise the nav label when multiple navigations are on one page:
 * ```tsx
 * <Breadcrumbs
 *   ariaLabel="Contract navigation"
 *   items={[{ label: 'Dashboard', href: '/' }, { label: 'Contract #42' }]}
 * />
 * ```
 *
 * @example Pass a layout class to the nav wrapper:
 * ```tsx
 * <Breadcrumbs className="mb-4" items={[…]} />
 * ```
 */
const Breadcrumbs = ({
  items,
  ariaLabel = 'Breadcrumb',
  className,
}: BreadcrumbsProps): React.ReactElement | null => {
  // Sanitise once per render; results memoised implicitly by React's reconciler.
  const crumbs = sanitiseItems(items);

  // Invariant: empty list (after sanitisation) renders nothing.
  if (crumbs.length === 0) return null;

  return (
    <nav aria-label={ariaLabel} className={className}>
      <ol className="flex flex-wrap items-center gap-1 text-sm text-slate-500">
        {crumbs.map((item, index) => {
          const isLast = index === crumbs.length - 1;

          return (
            <li key={crumbKey(item, index)} className="flex items-center gap-1">
              {/* Separator — hidden from screen readers */}
              {index > 0 && (
                <span aria-hidden="true" className="select-none text-slate-400">
                  /
                </span>
              )}

              {isLast ? (
                // Current page: plain text, no link, aria-current for AT.
                // title exposes the full label when display is truncated.
                <span
                  aria-current="page"
                  title={item.label}
                  className="font-medium text-slate-900 truncate max-w-[16rem]"
                >
                  {item.label}
                </span>
              ) : (
                // Ancestor: linked crumb.
                // href falls back to "/" when absent (see sanitiseItems warning).
                // title exposes the full label when display is truncated.
                <Link
                  href={item.href ?? '/'}
                  title={item.label}
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

// displayName makes the component identifiable in React DevTools and error
// boundary stack traces.
Breadcrumbs.displayName = 'Breadcrumbs';

export default Breadcrumbs;
