/**
 * Compatibility contract for the 404 (not-found) recovery surface.
 *
 * `src/app/not-found.tsx` is a public recovery surface: when a user lands on a
 * URL that does not match a route, it is the only place the app guarantees a
 * route back into the product. This module makes that public behaviour
 * explicit, validated, and stable so it survives upgrades, malformed data, and
 * empty data without throwing or silently changing what the user sees.
 *
 * Invariants (documented so they can be preserved, not just implemented):
 *
 * 1. `DEFAULT_NOT_FOUND_QUICK_LINKS` is the single source of truth for the 404
 *    recovery navigation. Links render in declaration order.
 * 2. Normalization is pure and total: it never throws, and it always returns a
 *    normalization result (never `undefined` / `null`).
 * 3. A quick link is only accepted when it is an object with a non-empty,
 *    whitespace-trimmed `label` and `description` and an internal `href`
 *    (root-relative path). Absolute URLs, protocol-relative URLs (`//host`),
 *    backslashes, and whitespace-bearing hrefs are rejected to prevent the 404
 *    page from becoming an open-redirect vector.
 * 4. Duplicate `href`s keep the first occurrence so the recovery list cannot
 *    render two visually-identical destinations.
 * 5. The list is capped at `MAX_NOT_FOUND_QUICK_LINKS` to bound the surface.
 * 6. If the input is unusable (not an array) or normalizes to zero valid links,
 *    the documented defaults are substituted so a recovery path always exists.
 * 7. Rejected/duplicate/truncated entries are counted in the result so a
 *    failure is diagnosable from metrics/logs without echoing the offending
 *    (potentially sensitive or attacker-controlled) content.
 */

/** A single recovery destination rendered by the 404 page. */
export interface NotFoundQuickLink {
  readonly href: string;
  readonly label: string;
  readonly description: string;
}

/**
 * Outcome of normalizing a candidate quick-link list. Counts, not raw values,
 * so callers can log or emit metrics without leaking user-controlled content.
 */
export interface NotFoundLinkNormalization {
  readonly links: readonly NotFoundQuickLink[];
  /** Entries dropped because they were not a well-formed internal link. */
  readonly rejected: number;
  /** Entries dropped because their `href` was already present. */
  readonly duplicates: number;
  /** Valid entries dropped because the list exceeded the cap. */
  readonly truncated: number;
  /** True when the documented defaults were substituted for the input. */
  readonly usedFallback: boolean;
}

/** In-app home route used by the primary "Go Home" action. */
export const NOT_FOUND_HOME_HREF = '/';

/** Support mailbox exposed to users as the last-resort contact path. */
export const NOT_FOUND_SUPPORT_EMAIL = 'support@talenttrust.io';

/** Ready-to-render `mailto:` href for the support mailbox. */
export const NOT_FOUND_SUPPORT_HREF = `mailto:${NOT_FOUND_SUPPORT_EMAIL}`;

/** Upper bound on how many recovery links the 404 page will ever render. */
export const MAX_NOT_FOUND_QUICK_LINKS = 5;

/**
 * Documented default recovery links. Order is part of the public contract and
 * is asserted by tests — editing this list is a user-visible behaviour change.
 */
export const DEFAULT_NOT_FOUND_QUICK_LINKS: readonly NotFoundQuickLink[] =
  Object.freeze([
    Object.freeze({
      href: '/contracts',
      label: 'View Contracts',
      description: 'Pick up where you left off',
    }),
    Object.freeze({
      href: '/milestones',
      label: 'Track Milestones',
      description: 'See your project checkpoints',
    }),
    Object.freeze({
      href: '/reputation',
      label: 'My Reputation',
      description: 'Check your work history',
    }),
  ]);

/**
 * A root-relative href that stays within the app. Rejects absolute URLs
 * (`https://evil.example`), protocol-relative URLs (`//evil.example`),
 * backslashes (Windows/`\`-based redirect tricks), and whitespace.
 */
function isInternalHref(href: string): boolean {
  return (
    href.startsWith('/') &&
    !href.startsWith('//') &&
    !href.includes('\\') &&
    !/\s/.test(href)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validates and trims a single candidate link. Returns a frozen link or `null`
 * when the value is unusable. Pure and total — never throws.
 */
export function sanitizeNotFoundQuickLink(
  value: unknown,
): NotFoundQuickLink | null {
  if (!isRecord(value)) return null;

  const href = typeof value.href === 'string' ? value.href.trim() : '';
  const label = typeof value.label === 'string' ? value.label.trim() : '';
  const description =
    typeof value.description === 'string' ? value.description.trim() : '';

  if (!isInternalHref(href) || label.length === 0 || description.length === 0) {
    return null;
  }

  return Object.freeze({ href, label, description });
}

/**
 * Deterministically normalizes arbitrary candidate data into a bounded,
 * de-duplicated list of valid recovery links.
 *
 * The function is pure and total: any `unknown` input is accepted and no
 * exception is thrown. When the input is not an array, or when no entry is a
 * valid link, the documented defaults are returned with `usedFallback: true`.
 */
export function normalizeNotFoundQuickLinks(
  input: unknown,
): NotFoundLinkNormalization {
  if (!Array.isArray(input)) {
    return {
      links: [...DEFAULT_NOT_FOUND_QUICK_LINKS],
      rejected: 0,
      duplicates: 0,
      truncated: 0,
      usedFallback: true,
    };
  }

  const seen = new Set<string>();
  const links: NotFoundQuickLink[] = [];
  let rejected = 0;
  let duplicates = 0;
  let truncated = 0;

  for (const entry of input) {
    const link = sanitizeNotFoundQuickLink(entry);

    if (!link) {
      rejected += 1;
      continue;
    }

    if (seen.has(link.href)) {
      duplicates += 1;
      continue;
    }

    if (links.length >= MAX_NOT_FOUND_QUICK_LINKS) {
      truncated += 1;
      continue;
    }

    seen.add(link.href);
    links.push(link);
  }

  if (links.length === 0) {
    return {
      links: [...DEFAULT_NOT_FOUND_QUICK_LINKS],
      rejected,
      duplicates,
      truncated,
      usedFallback: true,
    };
  }

  return { links, rejected, duplicates, truncated, usedFallback: false };
}

/**
 * Page-facing accessor. Returns the validated defaults the 404 page renders.
 * A fresh array is returned on every call so callers cannot mutate the shared
 * contract by accident.
 */
export function getNotFoundQuickLinks(): NotFoundQuickLink[] {
  return [...normalizeNotFoundQuickLinks(DEFAULT_NOT_FOUND_QUICK_LINKS).links];
}
