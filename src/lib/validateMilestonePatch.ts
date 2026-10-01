import { sanitizeUserText } from './sanitizeUserText';
import {
  MAX_MILESTONE_TITLE_LENGTH,
  MAX_PAYOUT_VALUE,
  MAX_PAYOUT_DECIMAL_PLACES,
  ALLOWED_CURRENCIES,
  ALLOWED_STATUSES,
} from './validateMilestone';
import type { ValidationError } from './validateLogin';
import type { Milestone } from '@/types/domain';

/**
 * @file validateMilestonePatch.ts
 *
 * Persistence boundary for milestone patches coming from the contract detail
 * page (`src/app/contracts/[id]/page.tsx`).
 *
 * The inline editor (`MilestoneRow`) already validates its own form fields,
 * but the page's `handleUpdateMilestone` is a public boundary: it accepts a
 * `Partial<Milestone>` and forwards it straight to the repository. This
 * module re-validates the patch at that boundary so invalid values never
 * reach storage — defensively covering stale rows, shared code paths,
 * programmatic callers, and corrupted state.
 *
 * Identity and concurrency-control fields (`id`, `contractId`, `version`,
 * timestamps) are **never** accepted through a patch: re-parenting a
 * milestone to another contract or rewinding its version would defeat the
 * stale-overwrite guard. Callers must route those changes through dedicated,
 * explicit repository APIs instead.
 *
 * The module is pure and side-effect-free.
 */

/**
 * Fields that must never be changed via a milestone patch. The repository's
 * `updateMilestone` merges patches wholesale, so these keys are rejected
 * outright rather than silently stripped — a silent strip would let callers
 * believe the mutation succeeded.
 */
export const FORBIDDEN_PATCH_FIELDS: readonly (keyof Milestone)[] = [
  'id',
  'contractId',
  'version',
  'createdAt',
  'updatedAt',
] as const;

/** `true` when `patch` is a plain object (not null, not an array). */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** `true` when `value` is a finite number (rejects NaN and ±Infinity). */
function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Result returned by {@link validateMilestonePatch}. */
export type MilestonePatchResult =
  | { ok: true; sanitized: Partial<Milestone> }
  | { ok: false; errors: ValidationError[] };

/**
 * Validates a milestone patch at the persistence boundary.
 *
 * Validation order is **patch shape → forbidden fields → per-field rules**,
 * so the most fundamental problems are reported before field-level detail.
 * All field errors are collected (not fail-fast) so the caller can surface
 * every problem at once.
 *
 * Per-field rules (mirroring `validateMilestoneEdit` so inline-edit and
 * boundary validation stay consistent):
 * - `title` (optional): after sanitisation must be non-empty and at most
 *   {@link MAX_MILESTONE_TITLE_LENGTH} characters (uncapped value measured —
 *   over-length input is rejected, never silently truncated).
 * - `payout` (optional): must be a finite number greater than zero, at most
 *   {@link MAX_PAYOUT_VALUE}, with at most {@link MAX_PAYOUT_DECIMAL_PLACES}
 *   decimal places.
 * - `currency` (optional): must be one of {@link ALLOWED_CURRENCIES}
 *   (case-insensitive; canonical uppercase form is emitted).
 * - `status` (optional): must be one of {@link ALLOWED_STATUSES}.
 * - `dueDate` (optional): whitespace-only is normalised to `undefined`;
 *   no format coercion is applied — the free-text value is passed through
 *   sanitised (control characters removed).
 *
 * Fields not present on the patch are left untouched by definition of the
 * partial merge, so only present fields are validated.
 *
 * @param milestoneId - Identifier of the milestone being patched (used for
 *   error reporting only).
 * @param patch - The raw, untrusted patch object.
 * @returns A {@link MilestonePatchResult}. On success `sanitized` contains a
 *   safe copy of the patch (sanitised title/dueDate, canonical currency);
 *   on failure `errors` carries `{ fieldId, message }` pairs keyed as
 *   `milestone-patch-<field>` for display or diagnostics.
 */
export function validateMilestonePatch(
  milestoneId: string,
  patch: unknown,
): MilestonePatchResult {
  const errors: ValidationError[] = [];

  if (!isPlainObject(patch)) {
    return {
      ok: false,
      errors: [
        {
          fieldId: 'milestone-patch',
          message: 'Milestone update could not be applied. Please try again.',
        },
      ],
    };
  }

  const forbidden = FORBIDDEN_PATCH_FIELDS.filter(
    (field) => Object.prototype.hasOwnProperty.call(patch, field),
  );
  if (forbidden.length > 0) {
    return {
      ok: false,
      errors: [
        {
          fieldId: 'milestone-patch',
          message: `The milestone fields ${forbidden
            .map((field) => `"${field}"`)
            .join(', ')} cannot be changed directly.`,
        },
      ],
    };
  }

  const sanitized: Partial<Milestone> = {};

  // ── title ────────────────────────────────────────────────────────────────
  if (Object.prototype.hasOwnProperty.call(patch, 'title')) {
    const raw = patch.title;
    if (typeof raw !== 'string') {
      errors.push({
        fieldId: 'milestone-patch-title',
        message: 'Title must be text.',
      });
    } else {
      const sanitizedTitle = sanitizeUserText(raw, MAX_MILESTONE_TITLE_LENGTH);
      const unbounded = sanitizeUserText(raw, Number.MAX_SAFE_INTEGER);
      if (!sanitizedTitle) {
        errors.push({
          fieldId: 'milestone-patch-title',
          message: 'Title is required',
        });
      } else if (unbounded.length > MAX_MILESTONE_TITLE_LENGTH) {
        errors.push({
          fieldId: 'milestone-patch-title',
          message: `Title must be no more than ${MAX_MILESTONE_TITLE_LENGTH} characters`,
        });
      } else {
        sanitized.title = sanitizedTitle;
      }
    }
  }

  // ── payout ───────────────────────────────────────────────────────────────
  if (Object.prototype.hasOwnProperty.call(patch, 'payout')) {
    const raw = patch.payout;
    if (!isFiniteNumber(raw)) {
      errors.push({
        fieldId: 'milestone-patch-payout',
        message: 'Payout must be a positive number',
      });
    } else if (raw <= 0) {
      errors.push({
        fieldId: 'milestone-patch-payout',
        message: 'Payout must be a positive number',
      });
    } else if (raw > MAX_PAYOUT_VALUE) {
      errors.push({
        fieldId: 'milestone-patch-payout',
        message: `Payout must be no more than ${MAX_PAYOUT_VALUE.toLocaleString()}`,
      });
    } else {
      const decimalPlaces = (String(raw).split('.')[1] ?? '').length;
      if (decimalPlaces > MAX_PAYOUT_DECIMAL_PLACES) {
        errors.push({
          fieldId: 'milestone-patch-payout',
          message: `Payout must have at most ${MAX_PAYOUT_DECIMAL_PLACES} decimal places`,
        });
      } else {
        sanitized.payout = raw;
      }
    }
  }

  // ── currency ─────────────────────────────────────────────────────────────
  if (Object.prototype.hasOwnProperty.call(patch, 'currency')) {
    const raw = patch.currency;
    if (typeof raw !== 'string' || !raw.trim()) {
      errors.push({
        fieldId: 'milestone-patch-currency',
        message: 'Currency is required',
      });
    } else {
      const normalized = raw.trim().toUpperCase();
      if (!(ALLOWED_CURRENCIES as readonly string[]).includes(normalized)) {
        errors.push({
          fieldId: 'milestone-patch-currency',
          message: `Currency must be one of: ${ALLOWED_CURRENCIES.join(', ')}`,
        });
      } else {
        sanitized.currency = normalized;
      }
    }
  }

  // ── status ───────────────────────────────────────────────────────────────
  if (Object.prototype.hasOwnProperty.call(patch, 'status')) {
    const raw = patch.status;
    if (
      typeof raw !== 'string' ||
      !(ALLOWED_STATUSES as readonly string[]).includes(raw)
    ) {
      errors.push({
        fieldId: 'milestone-patch-status',
        message: `Status must be one of: ${ALLOWED_STATUSES.join(', ')}`,
      });
    } else {
      sanitized.status = raw as Milestone['status'];
    }
  }

  // ── dueDate ──────────────────────────────────────────────────────────────
  if (Object.prototype.hasOwnProperty.call(patch, 'dueDate')) {
    const raw = patch.dueDate;
    if (raw === undefined) {
      // Explicit clearing of the due date is a valid operation.
      sanitized.dueDate = undefined;
    } else if (typeof raw !== 'string') {
      errors.push({
        fieldId: 'milestone-patch-dueDate',
        message: 'Due date must be text.',
      });
    } else {
      const trimmed = sanitizeUserText(raw, Number.MAX_SAFE_INTEGER);
      sanitized.dueDate = trimmed === '' ? undefined : trimmed;
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  if (Object.keys(sanitized).length === 0) {
    return {
      ok: false,
      errors: [
        {
          fieldId: 'milestone-patch',
          message: 'No valid milestone fields were provided to update.',
        },
      ],
    };
  }

  return { ok: true, sanitized };
}
