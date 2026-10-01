/**
 * @file useOnlineStatus.ts
 *
 * React hook exposing the current browser online/offline status.
 *
 * ## Behaviour
 *
 * - Reads the *initial* status from `navigator.onLine` in a hydration-safe way:
 *   during server rendering it defaults to `true` (online) and only flips to a
 *   real value once mounted on the client, avoiding hydration mismatches.
 * - Subscribes to `window`'s `online` / `offline` events.
 * - Cleans up its event listeners on unmount.
 * - Shares a single set of listeners across all mounted callers, so many
 *   consumers never duplicate event listeners.
 * - Avoids unnecessary re-renders: state only changes when the connection state
 *   actually changes.
 *
 * @returns `true` when the browser is online, `false` when offline.
 */

import { useEffect, useRef, useState } from 'react';

/** True when we're running on the client (used to defer to the real status). */
const IS_BROWSER = typeof window !== 'undefined';

/** `navigator.onLine` is undefined in some embedded/test environments; treat
 *  missing as online so we never strand the UI in a false "offline" state. */
function readInitialStatus(): boolean {
  if (!IS_BROWSER) return true;
  return typeof navigator !== 'undefined' && navigator.onLine !== undefined
    ? navigator.onLine
    : true;
}

// A single shared event subscription so multiple usages of this hook never
// register duplicate listeners on `window`.
let sharedListeners: Set<(online: boolean) => void> | null = null;

function subscribe(listener: (online: boolean) => void): () => void {
  if (sharedListeners === null) {
    sharedListeners = new Set();
    // Only the first subscriber attaches the window listeners; subsequent
    // subscribers reuse the shared set so consumers never duplicate them.
    if (IS_BROWSER) {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }
  }
  sharedListeners.add(listener);

  return () => {
    sharedListeners?.delete(listener);
    if (sharedListeners && sharedListeners.size === 0 && IS_BROWSER) {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      // Allow the next consumer to re-register the window listeners fresh.
      sharedListeners = null;
    }
  };
}

function handleOnline(): void {
  notify(true);
}

function handleOffline(): void {
  notify(false);
}

function notify(online: boolean): void {
  if (!sharedListeners) return;
  for (const listener of Array.from(sharedListeners)) {
    listener(online);
  }
}

/** Resets the shared listener state. Strictly for tests. */
export function resetOnlineStatusForTests(): void {
  if (sharedListeners) {
    sharedListeners.clear();
    if (IS_BROWSER) {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    }
  }
  sharedListeners = null;
}

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(readInitialStatus);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    // On the client, re-sync with the true connection state once mounted. This
    // catches the case where SSR rendered a default `true` but the load happened
    // offline.
    setIsOnline(readInitialStatus());

    const unsubscribe = subscribe((online) => {
      if (mountedRef.current) {
        setIsOnline(online);
      }
    });

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, []);

  return isOnline;
}
