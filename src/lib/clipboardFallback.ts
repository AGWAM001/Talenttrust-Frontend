/**
 * Falls back to the deprecated `document.execCommand('copy')` API when the
 * Clipboard API is not available (e.g. non-HTTPS contexts, older browsers,
 * or browsers that block `navigator.clipboard` outside a user gesture).
 * Creates an off-screen textarea, selects its value, and invokes
 * execCommand. The textarea is always removed from the DOM.
 *
 * @param text - The string to copy to the clipboard.
 * @returns `true` if the execCommand succeeded; `false` otherwise.
 */
export function execCommandFallback(text: string): boolean {
  if (typeof document === 'undefined') return false;

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.top = '-9999px';
  textarea.style.left = '-9999px';
  textarea.setAttribute('aria-hidden', 'true');
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  let success = false;
  try {
    success = document.execCommand('copy');
  } catch {
    // execCommand not supported — success remains false
  } finally {
    document.body.removeChild(textarea);
  }
  return success;
}
