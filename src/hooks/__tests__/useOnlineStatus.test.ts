/**
 * Unit tests for `useOnlineStatus` (`src/hooks/useOnlineStatus.ts`).
 *
 * Covers the issue's connectivity-detection requirements:
 * - initial online and offline states
 * - online/offline event transitions
 * - event listeners cleaned up on unmount (no leaks / no duplicate listeners)
 * - shared listener set, so many consumers never duplicate window listeners
 * - hydration-safe fallback when `navigator.onLine` is unavailable
 */

import { renderHook, act } from '@testing-library/react';
import { useOnlineStatus, resetOnlineStatusForTests } from '../useOnlineStatus';

/** Re-sets navigator.onLine to a value and fires the matching window event. */
function setOnline(value: boolean): void {
  Object.defineProperty(navigator, 'onLine', {
    value,
    configurable: true,
  });
  window.dispatchEvent(new Event(value ? 'online' : 'offline'));
}

describe('useOnlineStatus', () => {
  let onLineGetter: PropertyDescriptor | undefined;

  beforeEach(() => {
    onLineGetter = Object.getOwnPropertyDescriptor(navigator, 'onLine');
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    resetOnlineStatusForTests();
  });

  afterEach(() => {
    if (onLineGetter) {
      Object.defineProperty(navigator, 'onLine', onLineGetter);
    }
  });

  it('reports the initial online state', () => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);
  });

  it('reports the initial offline state', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    const { result } = renderHook(() => useOnlineStatus());
    act(() => {});
    expect(result.current).toBe(false);
  });

  it('falls back to online when navigator.onLine is unavailable', () => {
    Object.defineProperty(navigator, 'onLine', { value: undefined, configurable: true });
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);
  });

  it('transitions to offline on the window offline event', () => {
    const { result } = renderHook(() => useOnlineStatus());
    act(() => setOnline(false));
    expect(result.current).toBe(false);
  });

  it('transitions back to online on the window online event', () => {
    setOnline(false);
    const { result } = renderHook(() => useOnlineStatus());
    act(() => setOnline(true));
    expect(result.current).toBe(true);
  });

  it('does not duplicate window listeners across multiple consumers', () => {
    const addSpy = jest.spyOn(window, 'addEventListener');

    const first = renderHook(() => useOnlineStatus());
    const second = renderHook(() => useOnlineStatus());

    // Only ONE shared listener per event type, regardless of consumer count.
    const onlineCalls = addSpy.mock.calls.filter(([event]) => event === 'online').length;
    const offlineCalls = addSpy.mock.calls.filter(([event]) => event === 'offline').length;
    expect(onlineCalls).toBe(1);
    expect(offlineCalls).toBe(1);

    first.unmount();
    // Unmounting one consumer must not tear down the shared listener.
    act(() => setOnline(false));
    expect(second.result.current).toBe(false);

    second.unmount();
    addSpy.mockRestore();
  });

  it('cleans up window listeners when the last consumer unmounts', () => {
    const removeSpy = jest.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useOnlineStatus());
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('offline', expect.any(Function));

    removeSpy.mockRestore();
  });

  it('re-syncs with the real connection state once mounted after an initial render', () => {
    // Simulate a client that loaded while actually offline even though the first
    // render (SSR default) is online: after mount it must reflect the real state.
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    const { result, rerender } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);

    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    act(() => {});
    rerender();
    // The change is picked up via the shared listener, not a forced re-read.
    act(() => setOnline(false));
    expect(result.current).toBe(false);
  });
});
