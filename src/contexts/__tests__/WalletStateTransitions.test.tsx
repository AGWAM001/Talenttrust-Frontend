/**
 * Comprehensive wallet state transition tests
 *
 * Tests cover:
 * - State mutual exclusivity (isConnecting + address, error + isConnecting)
 * - Full state transition sequences (idle→loading→success, idle→loading→error)
 * - Error recovery paths
 * - State determinism and predictability
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ToastProvider } from '@/components/toast/toast-provider';
import { PreferencesProvider } from '@/lib/preferences';

// Must mock safeStorage to prevent cross-test address rehydration
jest.mock('@/lib/safeStorage', () => ({
  getItem: jest.fn().mockReturnValue(null),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const { WalletProvider, useWallet, MOCKED_STELLAR_ADDRESS } = jest.requireActual('../WalletContext');

function WalletStateMonitor() {
  const { address, isConnecting, error, connect, disconnect } = useWallet();
  return (
    <div>
      <div data-testid="address">{address || 'null'}</div>
      <div data-testid="is-connecting">{String(isConnecting)}</div>
      <div data-testid="error">{error || 'null'}</div>
      <button data-testid="connect-btn" onClick={connect}>Connect</button>
      <button data-testid="disconnect-btn" onClick={disconnect}>Disconnect</button>
    </div>
  );
}

const renderWithProviders = (idleTimeout = 0) => {
  return render(
    <PreferencesProvider>
      <ToastProvider>
        <WalletProvider idleTimeout={idleTimeout}>
          <WalletStateMonitor />
        </WalletProvider>
      </ToastProvider>
    </PreferencesProvider>
  );
};

describe('WalletContext — State Transitions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('State mutual exclusivity', () => {
    it('when isConnecting=true, address remains null until success', async () => {
      renderWithProviders();

      await act(async () => {
        screen.getByTestId('connect-btn').click();
      });

      // During loading phase
      expect(screen.getByTestId('is-connecting')).toHaveTextContent('true');
      expect(screen.getByTestId('address')).toHaveTextContent('null');
      expect(screen.getByTestId('error')).toHaveTextContent('null');

      // Advance halfway through connection
      await act(async () => {
        jest.advanceTimersByTime(500);
      });

      // Still loading, address still null
      expect(screen.getByTestId('is-connecting')).toHaveTextContent('true');
      expect(screen.getByTestId('address')).toHaveTextContent('null');

      // Complete connection
      await act(async () => {
        jest.advanceTimersByTime(500);
      });

      // Success state: isConnecting=false, address set, error=null
      expect(screen.getByTestId('is-connecting')).toHaveTextContent('false');
      expect(screen.getByTestId('address')).toHaveTextContent(MOCKED_STELLAR_ADDRESS);
      expect(screen.getByTestId('error')).toHaveTextContent('null');
    });

    it('address and isConnecting are never both true simultaneously', async () => {
      renderWithProviders();

      // Initial state: address=null, isConnecting=false
      expect(screen.getByTestId('address')).toHaveTextContent('null');
      expect(screen.getByTestId('is-connecting')).toHaveTextContent('false');

      // Start connecting: isConnecting=true, address still null
      await act(async () => {
        screen.getByTestId('connect-btn').click();
      });

      expect(screen.getByTestId('is-connecting')).toHaveTextContent('true');
      expect(screen.getByTestId('address')).toHaveTextContent('null');

      // Complete: address set, isConnecting=false (never both true)
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      expect(screen.getByTestId('is-connecting')).toHaveTextContent('false');
      expect(screen.getByTestId('address')).toHaveTextContent(MOCKED_STELLAR_ADDRESS);
    });

    it('only one of [idle, loading, success, error] states is active at a time', async () => {
      renderWithProviders();

      // Idle: address=null, isConnecting=false, error=null
      expect(screen.getByTestId('address')).toHaveTextContent('null');
      expect(screen.getByTestId('is-connecting')).toHaveTextContent('false');
      expect(screen.getByTestId('error')).toHaveTextContent('null');

      // Start connection
      await act(async () => {
        screen.getByTestId('connect-btn').click();
      });

      // Loading: address=null, isConnecting=true, error=null
      expect(screen.getByTestId('address')).toHaveTextContent('null');
      expect(screen.getByTestId('is-connecting')).toHaveTextContent('true');
      expect(screen.getByTestId('error')).toHaveTextContent('null');

      // Complete connection
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      // Success: address set, isConnecting=false, error=null
      expect(screen.getByTestId('address')).toHaveTextContent(MOCKED_STELLAR_ADDRESS);
      expect(screen.getByTestId('is-connecting')).toHaveTextContent('false');
      expect(screen.getByTestId('error')).toHaveTextContent('null');
    });
  });

  describe('Full state transition sequences', () => {
    it('idle → loading → success', async () => {
      renderWithProviders();

      const snapshots: Array<{ address: string; isConnecting: string; error: string }> = [];

      const snap = () => {
        snapshots.push({
          address: screen.getByTestId('address').textContent || '',
          isConnecting: screen.getByTestId('is-connecting').textContent || '',
          error: screen.getByTestId('error').textContent || '',
        });
      };

      // Snapshot 1: idle
      snap();
      expect(snapshots[0]).toEqual({ address: 'null', isConnecting: 'false', error: 'null' });

      // Trigger connect
      await act(async () => {
        screen.getByTestId('connect-btn').click();
      });

      // Snapshot 2: loading
      snap();
      expect(snapshots[1]).toEqual({ address: 'null', isConnecting: 'true', error: 'null' });

      // Complete
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      // Snapshot 3: success
      snap();
      expect(snapshots[2]).toEqual({
        address: MOCKED_STELLAR_ADDRESS,
        isConnecting: 'false',
        error: 'null',
      });
    });

    it('success → disconnect → idle', async () => {
      renderWithProviders();

      // Reach success
      await act(async () => {
        screen.getByTestId('connect-btn').click();
      });
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      expect(screen.getByTestId('address')).toHaveTextContent(MOCKED_STELLAR_ADDRESS);

      // Disconnect
      await act(async () => {
        screen.getByTestId('disconnect-btn').click();
      });

      // Back to idle
      expect(screen.getByTestId('address')).toHaveTextContent('null');
      expect(screen.getByTestId('is-connecting')).toHaveTextContent('false');
      expect(screen.getByTestId('error')).toHaveTextContent('null');
    });

    it('error → connect again clears error and can succeed', async () => {
      renderWithProviders();

      // First connect fails by mocking the Promise to reject
      const origPromise = globalThis.Promise;
      let callCount = 0;
      const FailPromise = new Proxy(origPromise, {
        construct(Target, args: any[]) {
          callCount++;
          if (callCount === 1) {
            return new Target((_resolve: unknown, reject: (e: Error) => void) => {
              reject(new Error('Mock failure'));
            });
          }
          return new Target(...args);
        },
      });
      globalThis.Promise = FailPromise as unknown as PromiseConstructor;

      await act(async () => {
        screen.getByTestId('connect-btn').click();
      });

      globalThis.Promise = origPromise;

      // Should be in error state
      expect(screen.getByTestId('error')).toHaveTextContent('Failed to connect wallet');
      expect(screen.getByTestId('is-connecting')).toHaveTextContent('false');
      expect(screen.getByTestId('address')).toHaveTextContent('null');

      // Second connect should clear the error immediately
      await act(async () => {
        screen.getByTestId('connect-btn').click();
      });

      expect(screen.getByTestId('error')).toHaveTextContent('null');
      expect(screen.getByTestId('is-connecting')).toHaveTextContent('true');

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      // Now in success state
      expect(screen.getByTestId('address')).toHaveTextContent(MOCKED_STELLAR_ADDRESS);
      expect(screen.getByTestId('is-connecting')).toHaveTextContent('false');
      expect(screen.getByTestId('error')).toHaveTextContent('null');
    });
  });

  describe('Edge cases and error recovery', () => {
    it('multiple connect/disconnect cycles maintain consistent state', async () => {
      renderWithProviders();

      for (let i = 0; i < 3; i++) {
        // Connect
        await act(async () => {
          screen.getByTestId('connect-btn').click();
        });

        await act(async () => {
          jest.advanceTimersByTime(1000);
        });

        expect(screen.getByTestId('address')).toHaveTextContent(MOCKED_STELLAR_ADDRESS);
        expect(screen.getByTestId('is-connecting')).toHaveTextContent('false');
        expect(screen.getByTestId('error')).toHaveTextContent('null');

        // Disconnect
        await act(async () => {
          screen.getByTestId('disconnect-btn').click();
        });

        expect(screen.getByTestId('address')).toHaveTextContent('null');
        expect(screen.getByTestId('is-connecting')).toHaveTextContent('false');
        expect(screen.getByTestId('error')).toHaveTextContent('null');
      }
    });

    it('isConnecting is always false after promise settles (success case)', async () => {
      renderWithProviders();

      await act(async () => {
        screen.getByTestId('connect-btn').click();
      });

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      expect(screen.getByTestId('is-connecting')).toHaveTextContent('false');
    });

    it('error field is cleared at start of next connect() call', async () => {
      renderWithProviders();

      // Cause an error via Promise rejection
      const origPromise = globalThis.Promise;
      let callCount = 0;
      const FailPromise = new Proxy(origPromise, {
        construct(Target, args: any[]) {
          callCount++;
          if (callCount === 1) {
            return new Target((_resolve: unknown, reject: (e: Error) => void) => {
              reject(new Error('Mock failure'));
            });
          }
          return new Target(...args);
        },
      });
      globalThis.Promise = FailPromise as unknown as PromiseConstructor;

      await act(async () => {
        screen.getByTestId('connect-btn').click();
      });

      globalThis.Promise = origPromise;

      // Verify error is set
      expect(screen.getByTestId('error')).toHaveTextContent('Failed to connect wallet');

      // Start a new connect — error should clear immediately
      await act(async () => {
        screen.getByTestId('connect-btn').click();
      });

      expect(screen.getByTestId('error')).toHaveTextContent('null');
    });

    it('disconnect in idle state is a no-op (all fields remain null/false)', async () => {
      renderWithProviders();

      await act(async () => {
        screen.getByTestId('disconnect-btn').click();
      });

      expect(screen.getByTestId('address')).toHaveTextContent('null');
      expect(screen.getByTestId('is-connecting')).toHaveTextContent('false');
      expect(screen.getByTestId('error')).toHaveTextContent('null');
    });

    it('maintains success state across renders', async () => {
      renderWithProviders();

      await act(async () => {
        screen.getByTestId('connect-btn').click();
      });

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      const addressBefore = screen.getByTestId('address').textContent;
      expect(addressBefore).toBe(MOCKED_STELLAR_ADDRESS);

      // State should be stable after render
      const addressAfter = screen.getByTestId('address').textContent;
      expect(addressAfter).toBe(addressBefore);
    });
  });

  describe('Announcer state coordination', () => {
    it('announcer updates reflect connection state changes (success)', async () => {
      renderWithProviders();

      const announcer = screen.getByTestId('wallet-announcer');
      expect(announcer).toHaveTextContent('');

      // Connect
      await act(async () => {
        screen.getByTestId('connect-btn').click();
      });

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      // Wait for debounced announcement (150ms debounce)
      await act(async () => {
        jest.advanceTimersByTime(200);
      });

      expect(announcer).toHaveTextContent('Wallet connected');
      expect(screen.getByTestId('address')).toHaveTextContent(MOCKED_STELLAR_ADDRESS);
    });

    it('announcer updates on error state', async () => {
      renderWithProviders();

      // Cause an error via Promise rejection
      const origPromise = globalThis.Promise;
      let callCount = 0;
      const FailPromise = new Proxy(origPromise, {
        construct(Target, args: any[]) {
          callCount++;
          if (callCount === 1) {
            return new Target((_resolve: unknown, reject: (e: Error) => void) => {
              reject(new Error('Mock failure'));
            });
          }
          return new Target(...args);
        },
      });
      globalThis.Promise = FailPromise as unknown as PromiseConstructor;

      await act(async () => {
        screen.getByTestId('connect-btn').click();
      });

      globalThis.Promise = origPromise;

      // Wait for debounced announcement (150ms debounce)
      await act(async () => {
        jest.advanceTimersByTime(200);
      });

      expect(screen.getByTestId('wallet-announcer')).toHaveTextContent('Wallet connection failed');
      expect(screen.getByTestId('error')).toHaveTextContent('Failed to connect wallet');
    });

    it('error state and error announcer are consistent', async () => {
      renderWithProviders();

      // Cause an error via Promise rejection
      const origPromise = globalThis.Promise;
      let callCount = 0;
      const FailPromise = new Proxy(origPromise, {
        construct(Target, args: any[]) {
          callCount++;
          if (callCount === 1) {
            return new Target((_resolve: unknown, reject: (e: Error) => void) => {
              reject(new Error('Mock failure'));
            });
          }
          return new Target(...args);
        },
      });
      globalThis.Promise = FailPromise as unknown as PromiseConstructor;

      await act(async () => {
        screen.getByTestId('connect-btn').click();
      });

      globalThis.Promise = origPromise;

      // When error occurs:
      // - error state set
      // - isConnecting reset to false
      // - address remains null
      expect(screen.getByTestId('error')).toHaveTextContent('Failed to connect wallet');
      expect(screen.getByTestId('is-connecting')).toHaveTextContent('false');
      expect(screen.getByTestId('address')).toHaveTextContent('null');
    });
  });
});
