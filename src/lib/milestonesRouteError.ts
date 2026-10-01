/**
 * State + observability contract for the milestones route error boundary
 * (`src/app/milestones/error.tsx`).
 *
 * The route boundary is the last line of recovery for the entire `/milestones`
 * segment. It owns a small but important set of invariants, and this module
 * makes the observability half of them explicit and testable:
 *
 * 1. **No sensitive leakage.** Reported metadata may only ever contain a public
 *    error code, the error's constructor `name`, and an optional, strictly
 *    validated Next.js `digest`. The error `message`, `stack`, and any custom
 *    properties are never copied, so a crash cannot exfiltrate internals into
 *    logs.
 * 2. **Total and deterministic.** `buildMilestonesRouteErrorMeta` accepts any
 *    `unknown` (including `null`, primitives, and objects with hostile getters)
 *    and never throws. The same input always yields the same output.
 * 3. **Bounded.** `name` and `digest` are length-clamped/pattern-validated so a
 *    malformed value cannot bloat or corrupt telemetry.
 */

/** Stable public error code for a failure of the milestones route segment. */
export const MILESTONES_ROUTE_ERROR_CODE = 'MILESTONES_ROUTE_FAILED' as const;

export type MilestonesRouteErrorCode = typeof MILESTONES_ROUTE_ERROR_CODE;

/** Sanitized, log-safe metadata describing a milestones route failure. */
export interface MilestonesRouteErrorMeta extends Record<string, unknown> {
  readonly code: MilestonesRouteErrorCode;
  /** Error constructor name (e.g. `Error`, `TypeError`). Never the message. */
  readonly name: string;
  /** Next.js error digest, present only when it is a safe token. */
  readonly digest?: string;
}

/** Longest `name` we will copy into telemetry. */
export const MAX_ERROR_NAME_LENGTH = 64;

/**
 * Next.js digests are opaque tokens (commonly hex). Only accept a conservative
 * charset so no whitespace/control characters/newsletters can be injected.
 */
const SAFE_DIGEST_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

function safeErrorName(error: unknown): string {
  // Accessing `.name` on an object can run a hostile getter, so guard it.
  try {
    if (error instanceof Error) {
      const raw = error.name;
      if (typeof raw === 'string' && raw.trim().length > 0) {
        return raw.trim().slice(0, MAX_ERROR_NAME_LENGTH);
      }
    }
  } catch {
    // Fall through to the neutral default.
  }
  return 'Error';
}

function safeDigest(digest: unknown): string | undefined {
  if (typeof digest !== 'string') return undefined;
  const trimmed = digest.trim();
  return SAFE_DIGEST_PATTERN.test(trimmed) ? trimmed : undefined;
}

/**
 * Builds sanitized metadata for a milestones route failure.
 *
 * @param error  - Any thrown value. Only `Error` subclasses contribute a name.
 * @param digest - Optional Next.js digest; ignored unless it is a safe token.
 * @returns A frozen `{ code, name, digest? }` object — never the error message.
 */
export function buildMilestonesRouteErrorMeta(
  error: unknown,
  digest?: unknown,
): MilestonesRouteErrorMeta {
  const meta: {
    code: MilestonesRouteErrorCode;
    name: string;
    digest?: string;
  } = {
    code: MILESTONES_ROUTE_ERROR_CODE,
    name: safeErrorName(error),
  };

  const safe = safeDigest(digest);
  if (safe !== undefined) {
    meta.digest = safe;
  }

  return Object.freeze(meta);
}
