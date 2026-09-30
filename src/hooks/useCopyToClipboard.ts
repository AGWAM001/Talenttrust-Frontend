import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseCopyToClipboardOptions {
  /** Delay in milliseconds to reset the `copied` state. Defaults to 2000ms. */
  delay?: number;
  /** Callback triggered when the copy operation succeeds. */
  onSuccess?: () => void;
  /** Callback triggered when the copy operation fails. Passed the error object or reason. */
  onError?: (error: unknown) => void;
}

/**
 * Fallback copy mechanism using a hidden `<textarea>` and
 * `document.execCommand('copy')`.
 *
 * Used when `navigator.clipboard.writeText` is unavailable — e.g. in
 * non-HTTPS contexts, older browsers, or when the browser has blocked the
 * Clipboard API permission.
 *
 * The element is:
 *   - Positioned off-screen (not `display:none`) so it can receive focus.
 *   - Marked `aria-hidden="true"` so assistive technologies ignore it.
 *   - Added and removed synchronously so no visible flash occurs.
 *
 * `document.execCommand` is deprecated but still universally supported and
 * is the only reliable synchronous fallback in mixed security contexts.
 *
 * @param text - The string to place in the system clipboard.
 * @returns `true` if the command reported success, `false` otherwise.
 *
 * @internal Not exported — use `useCopyToClipboard` instead.
 */
function execCommandFallback(text: string): boolean {
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    // Prevent the page from scrolling on iOS Safari when the element is
    // appended and focused.
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.width = '1px';
    textarea.style.height = '1px';
    textarea.style.opacity = '0';
    textarea.style.border = 'none';
    textarea.style.outline = 'none';
    textarea.setAttribute('aria-hidden', 'true');
    textarea.setAttribute('readonly', '');
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch {
    return false;
  }
}

/**
 * A custom React hook that manages copying text to the system clipboard.
 *
 * It provides:
 * - A stateful indicator (`copied`) showing whether the copy succeeded.
 * - An automatic reset timer that clears the `copied` state after a configurable delay.
 * - Proper cleanup of timers on component unmount or subsequent copy triggers.
 * - Safety guards for SSR environments and browsers without clipboard support.
 * - An `execCommand` fallback for environments where the Clipboard API is
 *   unavailable (e.g. non-HTTPS contexts, permissions denied, older browsers).
 * - Success and failure callbacks for custom event notifications (e.g., toasts).
 *
 * ## Copy strategy
 *
 * 1. **Primary — Clipboard API** (`navigator.clipboard.writeText`):
 *    Asynchronous, permission-gated, available on HTTPS + localhost.
 * 2. **Fallback — `execCommand('copy')`** (via `execCommandFallback`):
 *    Synchronous, deprecated but universally supported.  Invoked only when
 *    the primary path is unavailable or throws.
 *
 * If both paths fail, `onError` is called and `copy` resolves to `false`.
 *
 * @param options - Configuration options for the hook.
 * @returns An object containing:
 *  - `copied`: boolean indicating if the text has been successfully copied within the delay window.
 *  - `copy`: a function accepting a string to copy to the clipboard. Returns a promise resolving to `true` on success and `false` on failure.
 */
export function useCopyToClipboard(options: UseCopyToClipboardOptions = {}) {
  const { delay = 2000, onSuccess, onError } = options;
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanUp = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const copy = useCallback(async (text: string): Promise<boolean> => {
    // 1. Guard against Server-Side Rendering (SSR) environments
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      const error = new Error('Clipboard API is not available in SSR environments');
      onError?.(error);
      return false;
    }

    // 2. Clear any existing reset timer (handles rapid consecutive copy triggers)
    cleanUp();

    // 3. Primary path: modern Clipboard API
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        timeoutRef.current = setTimeout(() => {
          setCopied(false);
        }, delay);
        onSuccess?.();
        return true;
      } catch {
        // Clipboard API failed (e.g. permission denied) — fall through to
        // the execCommand fallback below instead of surfacing the error
        // immediately.  If the fallback also fails we call onError once.
      }
    }

    // 4. Fallback path: execCommand('copy')
    //    Documented as deprecated but universally supported in mixed-security
    //    contexts where the async Clipboard API is not available.
    if (typeof document !== 'undefined') {
      const success = execCommandFallback(text);
      if (success) {
        setCopied(true);
        timeoutRef.current = setTimeout(() => {
          setCopied(false);
        }, delay);
        onSuccess?.();
        return true;
      }
    }

    // 5. Both paths failed
    const error = new Error('Clipboard API is not supported in this environment');
    onError?.(error);
    return false;
  }, [delay, onSuccess, onError, cleanUp]);

  // 6. Clean up timer on unmount to prevent state updates on unmounted components
  useEffect(() => {
    return cleanUp;
  }, [cleanUp]);

  return { copied, copy };
}
