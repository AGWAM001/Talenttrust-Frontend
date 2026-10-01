'use client';

import { useState, useEffect, useRef } from 'react';
import { ToastDemo } from '@/components/toast/toast-demo';
import { FormField } from '@/components/FormField';
import { ErrorSummary } from '@/components/ErrorSummary';
import { useToast } from '@/components/toast/toast-provider';
import { useFormAnnouncer } from '@/hooks/useFormAnnouncer';
import {
  MAX_EMAIL_LENGTH,
  MAX_PASSWORD_LENGTH,
  validateLogin,
} from '@/lib/validateLogin';
import {
  getRemainingCooldownMs,
  recordAttempt,
  resetThrottle,
} from '@/lib/loginThrottle';

/**
 * Validation boundaries for the sign-in form.
 *
 * Invariants enforced here:
 * 1. The form is the single source of truth for input lengths. Every change
 *    is clamped to [MIN_*, MAX_*] before being stored, so neither typing nor
 *    pasting can produce a state that the validator would reject for length.
 *    This makes the client and the validator agree on the boundaries.
 * 2. Submission is guarded by a synchronous in-flight latch so double
 *    clicks / repeated Enter keypresses cannot record multiple attempts or
 *    emit duplicate success toasts.
 * 3. The cooldown is re-read from the throttle store on every submit rather
 *    than trusting stale React state, so a concurrent tab or a storage
 *    event cannot bypass the limit.
 * 4. Only non-sensitive field identifiers and messages are logged; password
 *    values are never included in logs or announcements.
 */

/** Minimum accepted lengths - mirrored from the validator contract. */
const MIN_EMAIL_LENGTH = 1;
const MIN_PASSWORD_LENGTH = 1;

/** Maximum number of validation errors we will announce at once. */
const MAX_ANNOUNCED_ERRORS = 5;

/** Tick interval for the cooldown countdown (in ms). */
const COOLDOWN_TICK_MS = 250;

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ fieldId: string; message: string }[]>([]);
  const [cooldownRemainingMs, setCooldownRemainingMs] = useState(0);
  const cooldownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** Synchronous in-flight latch that blocks concurrent/duplicate submits. */
  const submitInFlightRef = useRef(false);
  const { showSuccess } = useToast();
  const { politeMessage, assertiveMessage, announce } = useFormAnnouncer();

  const clearCooldownInterval = () => {
    if (cooldownIntervalRef.current !== null) {
      clearInterval(cooldownIntervalRef.current);
      cooldownIntervalRef.current = null;
    }
  };

  const startCooldownCountdown = () => {
    clearCooldownInterval();
    const tick = () => {
      const remaining = getRemainingCooldownMs();
      if (remaining <= 0) {
        setCooldownRemainingMs(0);
        clearCooldownInterval();
        return;
      }
      setCooldownRemainingMs(remaining);
    };
    tick();
    cooldownIntervalRef.current = setInterval(tick, COOLDOWN_TICK_MS);
  };

  useEffect(() => {
    const remaining = getRemainingCooldownMs();
    if (remaining > 0) {
      startCooldownCountdown();
    }
    return clearCooldownInterval;
  }, []);

  /**
   * Clamp a raw input value to the accepted boundaries for a field.
   * This is the single change-path for both typing and pasting, so the
   * validator and the stored state can never disagree on length.
   */
  const clampInput = (value: string, maxLength: number) => {
    if (value.length <= maxLength) return value;
    return value.slice(0, maxLength);
  };

  const handleEmailChange = (e changeEvent: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(clampInput(e.target.value, MAX_EMAIL_LENGTH));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(clampInput(e.target.value, MAX_PASSWORD_LENGTH));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Reject duplicate / concurrent submissions synchronously, before any
    // side effect (recordAttempt, toast, announcement) is performed.
    if (submitInFlightRef.current) {
      return;
    }

    // Re-read the cooldown from the store instead of trusting stale React
    // state, so a concurrent tab cannot bypass the throttle.
    if (getRemainingCooldownMs() > 0) {
      startCooldownCountdown();
      return;
    }

    submitInFlightRef.current = true;
    try {
      recordAttempt();
      const remaining = getRemainingCooldownMs();
      if (remaining > 0) {
        startCooldownCountdown();
      }

      const newErrors = validateLogin(email, password);
      setErrors(newErrors);

      if (newErrors.length === 0) {
        resetThrottle();
        setCooldownRemainingMs(0);
        clearCooldownInterval();
        showSuccess({
          title: 'Form submitted successfully!',
        });
        announce({
          message: 'Form submitted successfully.',
          type: 'success',
        });
      } else {
        // Only log non-sensitive field identifiers and messages. Never log
        // the entered values, especially the password.
        const announcedCount = Math.min(newErrors.length, MAX_ANNOUNCED_ERRORS);
        announce({
          message: `Sign in failed. ${newErrors.length} error${newErrors.length > 1 ? 's' : ''} found. Please review the form.`,
          type: 'error',
        });
        // Keep the count bounded so a malicious payload cannot flood the
        // console or the announcer.
        if (announcedCount > 0) {
          // eslint-disable-next-line no-console
          console.info('Sign-in validation failed', {
            errorCount: newErrors.length,
            fields: newErrors.slice(0, MAX_ANNOUNCED_ERRORS).map((err) => err.fieldId),
          });
        }
      }
    } finally {
      submitInFlightRef.current = false;
    }
  };

  const getError = (fieldId: string) => errors.find((e) => e.fieldId === fieldId)?.message;
  const cooldownSecs = Math.ceil(cooldownRemainingMs / 1000);
  const isCooldown = cooldownRemainingMs > 0;

  return (
    /**
     * ACCESSIBILITY LANDMARK STRUCTURE (WCAG 2.1 AA / issue #383)
     *
     * NOTE: No <main> landmark here — the root layout (src/app/layout.tsx) already
     * provides the single <main id="main-content" tabIndex={-1}> landmark. Per WCAG 2.1 AA,
     * a page should have exactly one main landmark to avoid confusing screen reader users
     * with duplicate navigation targets. Additionally, no <h1> is rendered here; the layout
     * header provides the page title, so this component uses <h2> to maintain a correct
     * heading hierarchy (h1 → h2).
     *
     * This structure ensures that:
     * 1. Screen readers see a single, unambiguous main content region
     * 2. Heading navigation produces a logical outline (h1 first, then h2 for sections)
     * 3. The ErrorSummary component's focus management works reliably (focus can move to
     *    the alert region and screen readers announce it without landmark confusion)
     */
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#eff6ff_100%)] px-6 py-20">
      <div className="mx-auto flex min-h-[6alc(100vh-3rem)] max-w-3l flex-col items-center justify-center rounded-[2rem] border border-white/70 bg-white/80 p-10 text-center shadow[0_24px_80px_rgba(15,23,42,0.10)] blur">
        {/* Section heading (h2, not h1 — see accessibility note above) */}
        <h2 className="mb-4 text-3xl font-bold text-center text-slate-900 sm:text-5xl">
          TalentTrust
        </h2>

        <p className="max-w-xl text-center text-base text-slate-600 sm:text-lg">
          Decentralized Freelancer Escrow Protocol on Stellar
        </p>
        <p className="mt-4 max-w-lg text-center text-sm text-slate-500 sm:text-base">
          Accessible toast feedback now supports transient success and error states, including screen reader announcements for critical wallet and payout events.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 w-full max-w-md text-left" noValidate aria-label="Sign in">
          <ErrorSummary errors={errors} />

          <div className="space-y-4">
            <FormField
              label="Email"
              id="email"
              error={getError('email')}
              required
            >
              <input
                type="email"
                value={email}
                onChange={handleEmailChange}
                // Security: cap pasted/typed input at MAX_EMAIL_LENGTH so the
                // browser and the validator enforce the same ceiling. See
                // `MAX_EMAIL_LENGTH` in src/lib/validateLogin.ts.
                maxLength={MAX_EMAIL_LENGTH}
                autoComplete="email"
                aria-required="true"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
                placeholder="you@example.com"
              />
            </FormField>

            <FormField
              label="Password"
              id="password"
              error={getError('password')}
              required
            >
              <input
                type="password"
                value={password}
                onChange={handlePasswordChange}
                // Security: cap pasted/typed input at MAX_PASSWORD_LENGTH. Mirrors
                // the validator ceiling and prevents denial-of-service from
                // arbitrarily long pasted secrets.
                maxLength={MAX_PASSWORD_LENGTH}
                autoComplete="current-password"
                aria-required="true"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
                placeholder="••••••••"
              />
            </FormField>
          </div>

          <button
            type="submit"
            disabled={isCooldown}
            className="mt-6 w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 shadow-md disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCooldown ? `Wait ${cooldownSecs}s` : 'Sign In'}
          </button>

          {isCooldown && (
            <div
              aria-live="polite"
              aria-atomic="true"
              className="sr-only"
            >
              Please wait {cooldownSecs} seconds before trying to sign in again.
            </div>
          )}

          {/* Form async result live regions — screen-reader only, no visual output */}
          <div
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
            data-testid="form-announcer-polite"
          >
            {politeMessage}
          </div>
          <div
            aria-live="assertive"
            aria-atomic="true"
            className="sr-only"
            data-testid="form-announcer-assertive"
          >
            {assertiveMessage}
          </div>
        </form>

        <ToastDemo />
      </div>
    </div>
  );
}
