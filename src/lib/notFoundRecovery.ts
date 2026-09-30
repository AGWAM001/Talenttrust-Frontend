/**
 * Deterministic, security-preserving helpers for the not-found (404) boundary.
 *
 * The 404 page is the last stop for a request that matched no route — including
 * malformed, expired, or adversarial URLs. Its recovery behaviour must be
 * predictable for any input and must never leak sensitive data, so the
 * decisions are extracted here as pure functions with explicit invariants.
 */

/** Upper bound for the path shown to the user / attached to logs. */
export const MAX_DISPLAY_PATH_LENGTH = 128;

/** Sentinel key used to de-duplicate reporting when there is no displayable path. */
export const NO_PATH_REPORT_KEY = '<none>';

/**
 * Sanitizes a raw request path for user-visible display and structured reporting.
 *
 * Invariants the 404 boundary relies on:
 * - The result is either `null` or a string that begins with exactly one `/`.
 *   Anything that cannot be shown safely (non-string, empty/whitespace, a
 *   protocol-relative `//host`, or a value without a leading slash) collapses
 *   to `null`, so callers render a stable fallback instead of untrusted text.
 * - Query strings and fragments are dropped first: session tokens and other
 *   secrets travel in the query, never the path, so removing them keeps the
 *   404 from leaking sensitive data into the DOM or the logs.
 * - The output is length-clamped so a pathological request (multi-kilobyte
 *   path) cannot blow up the page or the log payload.
 * - Pure and idempotent: re-sanitizing the output returns it unchanged, so
 *   repeated renders and retries always show exactly the same thing.
 *
 * @param raw - The untrusted pathname (typically `usePathname()`), any type.
 * @returns A safe, displayable path or `null` when none can be shown.
 */
export function sanitizeMissingPath(raw: unknown): string | null {
  if (typeof raw !== 'string') {
    return null;
  }

  // Keep only the path portion; drop any query string or fragment.
  const pathOnly = raw.split(/[?#]/, 1)[0] ?? '';
  const trimmed = pathOnly.trim();

  // Reject empty, protocol-relative (`//host`), and non-rooted values.
  if (trimmed.length === 0 || !trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return null;
  }

  // Strip control characters and collapse repeated slashes into a single
  // canonical, rooted path (preserving the leading slash). `\p{Cc}` matches C0
  // and C1 control code points without embedding literal controls in the source.
  const withoutControl = trimmed.replace(/\p{Cc}/gu, '');
  const collapsed = withoutControl.replace(/\/{2,}/g, '/');

  if (collapsed.length > MAX_DISPLAY_PATH_LENGTH) {
    // Clamp so the ellipsis keeps the total within the bound; feeding the
    // result back in is a no-op, preserving idempotency.
    return `${collapsed.slice(0, MAX_DISPLAY_PATH_LENGTH - 1)}…`;
  }
  return collapsed;
}

/**
 * The concrete recovery action the 404 page should take for a "go back" intent.
 * - `back`: safely return to the previous document via history.
 * - `home`: navigate to the app root because there is nowhere to go back to.
 */
export type NotFoundRecoveryAction = 'back' | 'home';

/**
 * Decides the deterministic "go back" target for the 404 boundary.
 *
 * Invariants:
 * - The decision depends only on the numeric history depth, so it is stable
 *   across retries and re-renders (a pure function of its input).
 * - With real browser history (`historyLength > 1`) we can return to the
 *   previous document, which keeps in-memory React state intact (no reload,
 *   no loss of unsaved/persisted data).
 * - On a cold deep-link straight onto the missing route there is nowhere to go
 *   back to; `history.back()` would be a silent no-op that strands the user, so
 *   we fall back to the app root. Non-finite/negative depths are treated as no
 *   history.
 *
 * @param historyLength - `window.history.length` at click time.
 */
export function planNotFoundRecovery(historyLength: number): NotFoundRecoveryAction {
  const safeLength = Number.isFinite(historyLength) ? historyLength : 0;
  return safeLength > 1 ? 'back' : 'home';
}
