/**
 * @file useFormAnnouncer.test.ts
 *
 * Comprehensive tests for the `useFormAnnouncer` hook.
 *
 * Coverage targets:
 * - Success announcement populates `politeMessage` and clears `assertiveMessage`
 * - Error announcement populates `assertiveMessage` and clears `politeMessage`
 * - Default type (`'success'`) used when `type` is omitted
 * - Debounce: rapid calls within `debounceMs` are coalesced (last-write-wins)
 * - Debounce: call after the window fires immediately
 * - Debounce disabled (`debounceMs: 0`): message committed synchronously
 * - Auto-clear: messages cleared after `clearAfterMs`
 * - Auto-clear disabled (`clearAfterMs: 0`): messages persist
 * - `clearAnnouncement()`: immediately clears both messages
 * - `clearAnnouncement()` cancels pending debounce (message never committed)
 * - `clearAnnouncement()` cancels pending auto-clear timer
 * - Unmount cleanup: no state updates after unmount, no timer leaks
 * - Interleaved success then error clears the previous polite message
 * - Interleaved error then success clears the previous assertive message
 * - Custom `debounceMs` and `clearAfterMs` options are respected
 */

import { act, renderHook } from '@testing-library/react';
import { useFormAnnouncer } from '../useFormAnnouncer';

// ---------------------------------------------------------------------------
// Timer helpers
// ---------------------------------------------------------------------------

/**
 * Advance fake timers by the given ms and flush React state updates
 * inside `act` so state setters triggered by the timer are fully applied
 * before we make assertions.
 */
function advanceTimersBy(ms: number) {
  act(() => {
    jest.advanceTimersByTime(ms);
  });
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('useFormAnnouncer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // Initial state
  // -------------------------------------------------------------------------

  describe('initial state', () => {
    it('returns empty strings for both messages on mount', () => {
      const { result } = renderHook(() => useFormAnnouncer({ debounceMs: 0 }));

      expect(result.current.politeMessage).toBe('');
      expect(result.current.assertiveMessage).toBe('');
    });

    it('exposes announce and clearAnnouncement as functions', () => {
      const { result } = renderHook(() => useFormAnnouncer({ debounceMs: 0 }));

      expect(typeof result.current.announce).toBe('function');
      expect(typeof result.current.clearAnnouncement).toBe('function');
    });
  });

  // -------------------------------------------------------------------------
  // Success announcement
  // -------------------------------------------------------------------------

  describe('success announcement', () => {
    it('populates politeMessage when type is "success"', () => {
      const { result } = renderHook(() => useFormAnnouncer({ debounceMs: 0 }));

      act(() => {
        result.current.announce({ message: 'Saved!', type: 'success' });
      });

      expect(result.current.politeMessage).toBe('Saved!');
    });

    it('clears assertiveMessage when a success is announced', () => {
      const { result } = renderHook(() => useFormAnnouncer({ debounceMs: 0, clearAfterMs: 0 }));

      // First set an error so assertiveMessage has content.
      act(() => {
        result.current.announce({ message: 'Failed!', type: 'error' });
      });
      expect(result.current.assertiveMessage).toBe('Failed!');

      // A success announcement should clear the assertive message.
      act(() => {
        result.current.announce({ message: 'Success!', type: 'success' });
      });

      expect(result.current.politeMessage).toBe('Success!');
      expect(result.current.assertiveMessage).toBe('');
    });

    it('defaults to "success" type when type is omitted', () => {
      const { result } = renderHook(() => useFormAnnouncer({ debounceMs: 0 }));

      act(() => {
        result.current.announce({ message: 'Done.' });
      });

      expect(result.current.politeMessage).toBe('Done.');
      expect(result.current.assertiveMessage).toBe('');
    });
  });

  // -------------------------------------------------------------------------
  // Error announcement
  // -------------------------------------------------------------------------

  describe('error announcement', () => {
    it('populates assertiveMessage when type is "error"', () => {
      const { result } = renderHook(() => useFormAnnouncer({ debounceMs: 0 }));

      act(() => {
        result.current.announce({ message: 'Submission failed.', type: 'error' });
      });

      expect(result.current.assertiveMessage).toBe('Submission failed.');
    });

    it('clears politeMessage when an error is announced', () => {
      const { result } = renderHook(() => useFormAnnouncer({ debounceMs: 0, clearAfterMs: 0 }));

      // First set a success so politeMessage has content.
      act(() => {
        result.current.announce({ message: 'Saved!', type: 'success' });
      });
      expect(result.current.politeMessage).toBe('Saved!');

      // An error announcement should clear the polite message.
      act(() => {
        result.current.announce({ message: 'Failed!', type: 'error' });
      });

      expect(result.current.assertiveMessage).toBe('Failed!');
      expect(result.current.politeMessage).toBe('');
    });
  });

  // -------------------------------------------------------------------------
  // Debounce behaviour
  // -------------------------------------------------------------------------

  describe('debounce behaviour', () => {
    it('does not commit the message before debounceMs elapses', () => {
      const { result } = renderHook(() => useFormAnnouncer({ debounceMs: 300 }));

      act(() => {
        result.current.announce({ message: 'Pending…', type: 'success' });
      });

      // Message should not be set yet.
      expect(result.current.politeMessage).toBe('');

      // Advance past the debounce window.
      advanceTimersBy(300);

      expect(result.current.politeMessage).toBe('Pending…');
    });

    it('coalesces rapid calls — only the last message is committed', () => {
      const { result } = renderHook(() => useFormAnnouncer({ debounceMs: 300 }));

      act(() => {
        result.current.announce({ message: 'First call', type: 'success' });
        result.current.announce({ message: 'Second call', type: 'success' });
        result.current.announce({ message: 'Third call', type: 'success' });
      });

      // Nothing committed yet.
      expect(result.current.politeMessage).toBe('');

      advanceTimersBy(300);

      // Only the last message should appear.
      expect(result.current.politeMessage).toBe('Third call');
    });

    it('coalesces calls even when a new one arrives mid-window', () => {
      const { result } = renderHook(() => useFormAnnouncer({ debounceMs: 300 }));

      act(() => {
        result.current.announce({ message: 'Early call', type: 'success' });
      });

      // 150 ms in — still within the debounce window.
      advanceTimersBy(150);
      expect(result.current.politeMessage).toBe('');

      // Replace with a new call, resetting the window.
      act(() => {
        result.current.announce({ message: 'Late call', type: 'success' });
      });

      // Advance another 150 ms — only 150 ms since the late call.
      advanceTimersBy(150);
      expect(result.current.politeMessage).toBe('');

      // Now advance the remaining 150 ms to complete the late window.
      advanceTimersBy(150);
      expect(result.current.politeMessage).toBe('Late call');
    });

    it('allows a new announcement immediately after debounce fires', () => {
      const { result } = renderHook(() => useFormAnnouncer({ debounceMs: 300, clearAfterMs: 0 }));

      act(() => {
        result.current.announce({ message: 'First', type: 'success' });
      });
      advanceTimersBy(300);
      expect(result.current.politeMessage).toBe('First');

      act(() => {
        result.current.announce({ message: 'Second', type: 'success' });
      });
      advanceTimersBy(300);
      expect(result.current.politeMessage).toBe('Second');
    });

    it('can switch type between debounced calls — last type wins', () => {
      const { result } = renderHook(() => useFormAnnouncer({ debounceMs: 300 }));

      act(() => {
        result.current.announce({ message: 'Success message', type: 'success' });
        result.current.announce({ message: 'Error message', type: 'error' });
      });

      advanceTimersBy(300);

      expect(result.current.assertiveMessage).toBe('Error message');
      expect(result.current.politeMessage).toBe('');
    });

    it('commits immediately when debounceMs is 0', () => {
      const { result } = renderHook(() => useFormAnnouncer({ debounceMs: 0 }));

      act(() => {
        result.current.announce({ message: 'Instant!', type: 'success' });
      });

      // No timer advance needed.
      expect(result.current.politeMessage).toBe('Instant!');
    });
  });

  // -------------------------------------------------------------------------
  // Auto-clear behaviour
  // -------------------------------------------------------------------------

  describe('auto-clear behaviour', () => {
    it('clears politeMessage after clearAfterMs', () => {
      const { result } = renderHook(() =>
        useFormAnnouncer({ debounceMs: 0, clearAfterMs: 5000 }),
      );

      act(() => {
        result.current.announce({ message: 'Will clear', type: 'success' });
      });
      expect(result.current.politeMessage).toBe('Will clear');

      advanceTimersBy(5000);
      expect(result.current.politeMessage).toBe('');
    });

    it('clears assertiveMessage after clearAfterMs', () => {
      const { result } = renderHook(() =>
        useFormAnnouncer({ debounceMs: 0, clearAfterMs: 5000 }),
      );

      act(() => {
        result.current.announce({ message: 'Error will clear', type: 'error' });
      });
      expect(result.current.assertiveMessage).toBe('Error will clear');

      advanceTimersBy(5000);
      expect(result.current.assertiveMessage).toBe('');
    });

    it('does not clear before clearAfterMs has elapsed', () => {
      const { result } = renderHook(() =>
        useFormAnnouncer({ debounceMs: 0, clearAfterMs: 5000 }),
      );

      act(() => {
        result.current.announce({ message: 'Still here', type: 'success' });
      });

      advanceTimersBy(4999);
      expect(result.current.politeMessage).toBe('Still here');
    });

    it('does not schedule a clear timer when clearAfterMs is 0', () => {
      const { result } = renderHook(() =>
        useFormAnnouncer({ debounceMs: 0, clearAfterMs: 0 }),
      );

      act(() => {
        result.current.announce({ message: 'Permanent', type: 'success' });
      });

      // Advance a very long time — message should remain.
      advanceTimersBy(60_000);
      expect(result.current.politeMessage).toBe('Permanent');
    });

    it('uses the default clearAfterMs of 5000 ms', () => {
      // Default options — debounceMs defaults to 300, clearAfterMs to 5000.
      const { result } = renderHook(() => useFormAnnouncer({ debounceMs: 0 }));

      act(() => {
        result.current.announce({ message: 'Default clear', type: 'success' });
      });

      advanceTimersBy(4999);
      expect(result.current.politeMessage).toBe('Default clear');

      advanceTimersBy(1);
      expect(result.current.politeMessage).toBe('');
    });

    it('resets the clear timer when a new announcement arrives', () => {
      const { result } = renderHook(() =>
        useFormAnnouncer({ debounceMs: 0, clearAfterMs: 5000 }),
      );

      act(() => {
        result.current.announce({ message: 'First', type: 'success' });
      });

      // Advance most of the clear window.
      advanceTimersBy(4000);
      expect(result.current.politeMessage).toBe('First');

      // New announcement resets the clear timer.
      act(() => {
        result.current.announce({ message: 'Second', type: 'success' });
      });
      expect(result.current.politeMessage).toBe('Second');

      // The old timer (1 s left) should NOT have fired.
      advanceTimersBy(1000);
      expect(result.current.politeMessage).toBe('Second');

      // The new timer (5 s from 'Second') should clear it.
      advanceTimersBy(4000);
      expect(result.current.politeMessage).toBe('');
    });
  });

  // -------------------------------------------------------------------------
  // clearAnnouncement()
  // -------------------------------------------------------------------------

  describe('clearAnnouncement()', () => {
    it('immediately clears politeMessage', () => {
      const { result } = renderHook(() =>
        useFormAnnouncer({ debounceMs: 0, clearAfterMs: 0 }),
      );

      act(() => {
        result.current.announce({ message: 'Visible', type: 'success' });
      });
      expect(result.current.politeMessage).toBe('Visible');

      act(() => {
        result.current.clearAnnouncement();
      });
      expect(result.current.politeMessage).toBe('');
    });

    it('immediately clears assertiveMessage', () => {
      const { result } = renderHook(() =>
        useFormAnnouncer({ debounceMs: 0, clearAfterMs: 0 }),
      );

      act(() => {
        result.current.announce({ message: 'Error visible', type: 'error' });
      });
      expect(result.current.assertiveMessage).toBe('Error visible');

      act(() => {
        result.current.clearAnnouncement();
      });
      expect(result.current.assertiveMessage).toBe('');
    });

    it('cancels a pending debounced announcement so no message is committed', () => {
      const { result } = renderHook(() => useFormAnnouncer({ debounceMs: 300 }));

      act(() => {
        result.current.announce({ message: 'Should not appear', type: 'success' });
      });

      // Clear before debounce fires.
      act(() => {
        result.current.clearAnnouncement();
      });

      // Advance past debounce window — message must not commit.
      advanceTimersBy(400);

      expect(result.current.politeMessage).toBe('');
    });

    it('cancels the pending auto-clear timer so a fresh announcement can stay', () => {
      const { result } = renderHook(() =>
        useFormAnnouncer({ debounceMs: 0, clearAfterMs: 5000 }),
      );

      act(() => {
        result.current.announce({ message: 'Shown', type: 'success' });
      });

      // Manually clear and re-announce (simulates a retry scenario).
      act(() => {
        result.current.clearAnnouncement();
        result.current.announce({ message: 'Retry', type: 'success' });
      });

      expect(result.current.politeMessage).toBe('Retry');

      // The original clear timer should not fire.
      advanceTimersBy(4999);
      expect(result.current.politeMessage).toBe('Retry');

      // The new clear timer fires after 5 s from 'Retry'.
      advanceTimersBy(1);
      expect(result.current.politeMessage).toBe('');
    });

    it('is idempotent — calling it multiple times does not throw', () => {
      const { result } = renderHook(() => useFormAnnouncer({ debounceMs: 0 }));

      expect(() => {
        act(() => {
          result.current.clearAnnouncement();
          result.current.clearAnnouncement();
        });
      }).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // Unmount cleanup
  // -------------------------------------------------------------------------

  describe('unmount cleanup', () => {
    it('clears debounce timer on unmount — no state update after unmount', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const { result, unmount } = renderHook(() => useFormAnnouncer({ debounceMs: 300 }));

      act(() => {
        result.current.announce({ message: 'Queued', type: 'success' });
      });

      // Unmount before the debounce fires.
      unmount();

      // Advance past debounce — should not cause a "setState on unmounted component" warning.
      advanceTimersBy(400);

      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("Can't perform a React state update on an unmounted component"),
      );

      consoleSpy.mockRestore();
    });

    it('clears auto-clear timer on unmount', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const { result, unmount } = renderHook(() =>
        useFormAnnouncer({ debounceMs: 0, clearAfterMs: 5000 }),
      );

      act(() => {
        result.current.announce({ message: 'Announced', type: 'success' });
      });

      // Unmount before the clear timer fires.
      unmount();

      // Advance past clear window — no errors expected.
      advanceTimersBy(6000);

      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("Can't perform a React state update on an unmounted component"),
      );

      consoleSpy.mockRestore();
    });
  });

  // -------------------------------------------------------------------------
  // Custom options
  // -------------------------------------------------------------------------

  describe('custom options', () => {
    it('respects a custom debounceMs of 100', () => {
      const { result } = renderHook(() => useFormAnnouncer({ debounceMs: 100 }));

      act(() => {
        result.current.announce({ message: 'Fast!', type: 'success' });
      });

      advanceTimersBy(99);
      expect(result.current.politeMessage).toBe('');

      advanceTimersBy(1);
      expect(result.current.politeMessage).toBe('Fast!');
    });

    it('respects a custom clearAfterMs of 2000', () => {
      const { result } = renderHook(() =>
        useFormAnnouncer({ debounceMs: 0, clearAfterMs: 2000 }),
      );

      act(() => {
        result.current.announce({ message: 'Short window', type: 'success' });
      });

      advanceTimersBy(1999);
      expect(result.current.politeMessage).toBe('Short window');

      advanceTimersBy(1);
      expect(result.current.politeMessage).toBe('');
    });

    it('uses default debounceMs of 300 when no options are provided', () => {
      const { result } = renderHook(() => useFormAnnouncer());

      act(() => {
        result.current.announce({ message: 'Default debounce', type: 'success' });
      });

      advanceTimersBy(299);
      expect(result.current.politeMessage).toBe('');

      advanceTimersBy(1);
      expect(result.current.politeMessage).toBe('Default debounce');
    });
  });

  // -------------------------------------------------------------------------
  // Interleaved success / error
  // -------------------------------------------------------------------------

  describe('interleaved success and error announcements', () => {
    it('replaces politeMessage with assertiveMessage when switching from success to error', () => {
      const { result } = renderHook(() =>
        useFormAnnouncer({ debounceMs: 0, clearAfterMs: 0 }),
      );

      act(() => {
        result.current.announce({ message: 'Saved.', type: 'success' });
      });
      expect(result.current.politeMessage).toBe('Saved.');
      expect(result.current.assertiveMessage).toBe('');

      act(() => {
        result.current.announce({ message: 'Failed.', type: 'error' });
      });
      expect(result.current.assertiveMessage).toBe('Failed.');
      expect(result.current.politeMessage).toBe('');
    });

    it('replaces assertiveMessage with politeMessage when switching from error to success', () => {
      const { result } = renderHook(() =>
        useFormAnnouncer({ debounceMs: 0, clearAfterMs: 0 }),
      );

      act(() => {
        result.current.announce({ message: 'Error occurred.', type: 'error' });
      });
      expect(result.current.assertiveMessage).toBe('Error occurred.');
      expect(result.current.politeMessage).toBe('');

      act(() => {
        result.current.announce({ message: 'Recovered!', type: 'success' });
      });
      expect(result.current.politeMessage).toBe('Recovered!');
      expect(result.current.assertiveMessage).toBe('');
    });
  });

  // -------------------------------------------------------------------------
  // Multiple hook instances (isolation)
  // -------------------------------------------------------------------------

  describe('multiple hook instances', () => {
    it('each instance maintains independent state', () => {
      const { result: a } = renderHook(() =>
        useFormAnnouncer({ debounceMs: 0, clearAfterMs: 0 }),
      );
      const { result: b } = renderHook(() =>
        useFormAnnouncer({ debounceMs: 0, clearAfterMs: 0 }),
      );

      act(() => {
        a.current.announce({ message: 'Instance A', type: 'success' });
      });

      expect(a.current.politeMessage).toBe('Instance A');
      expect(b.current.politeMessage).toBe('');
    });
  });

  // -------------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------------

  describe('edge cases', () => {
    it('handles empty message string gracefully', () => {
      const { result } = renderHook(() => useFormAnnouncer({ debounceMs: 0 }));

      act(() => {
        result.current.announce({ message: '', type: 'success' });
      });

      expect(result.current.politeMessage).toBe('');
    });

    it('handles a very long message string', () => {
      const { result } = renderHook(() => useFormAnnouncer({ debounceMs: 0 }));
      const longMessage = 'a'.repeat(10_000);

      act(() => {
        result.current.announce({ message: longMessage, type: 'success' });
      });

      expect(result.current.politeMessage).toBe(longMessage);
    });

    it('calling announce after clearAnnouncement still works', () => {
      const { result } = renderHook(() =>
        useFormAnnouncer({ debounceMs: 0, clearAfterMs: 0 }),
      );

      act(() => {
        result.current.announce({ message: 'First', type: 'success' });
      });
      act(() => {
        result.current.clearAnnouncement();
      });
      act(() => {
        result.current.announce({ message: 'Second', type: 'success' });
      });

      expect(result.current.politeMessage).toBe('Second');
    });

    it('rapid error-then-success within debounce commits only success', () => {
      const { result } = renderHook(() => useFormAnnouncer({ debounceMs: 300 }));

      act(() => {
        result.current.announce({ message: 'Error first', type: 'error' });
        result.current.announce({ message: 'Success last', type: 'success' });
      });

      advanceTimersBy(300);

      expect(result.current.politeMessage).toBe('Success last');
      expect(result.current.assertiveMessage).toBe('');
    });
  });
});
