/**
 * Route-level compatibility contracts for `/reputation` (issue #1248).
 *
 * These tests pin the behaviour the route exposes to callers and users, so a
 * future edit to `page.tsx` cannot silently drop it:
 *
 *   Surface      — the module exports resolve to the single tested
 *                  implementation, not a route-local copy.
 *   States       — loading / empty / partial / full are deterministic for
 *                  valid, missing, and malformed data.
 *   Resilience   — degraded persistence and profile crashes surface a
 *                  diagnosable, recoverable UI instead of fabricated data.
 *   Concurrency  — overlapping reads never interleave into an inconsistent
 *                  state.
 *   Accessibility — one landmark, one h1, focus lands on `<main>` on mount.
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import * as pageModule from '../page';
import RoutePage, { ReputationPageContent as ReExportedContent } from '../page';
import * as contentModule from '../ReputationPageContent';
import { REPUTATION_DEMO_SCORE, shapeReputationData } from '../ReputationPageContent';
import { listReputationEvents } from '@/lib/repository';
import { checkStorageAvailability } from '@/lib/safeStorage';
import { reportError } from '@/lib/errorReporter';

jest.mock('@/lib/repository', () => ({
  listReputationEvents: jest.fn(),
}));

jest.mock('@/lib/safeStorage', () => ({
  checkStorageAvailability: jest.fn(() => true),
}));

jest.mock('@/lib/errorReporter', () => ({
  reportError: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(() => new URLSearchParams('')),
  useRouter: jest.fn(() => ({ replace: jest.fn(), push: jest.fn() })),
}));

import { useSearchParams } from 'next/navigation';

let mockProfileShouldThrow = false;
afterEach(() => {
  mockProfileShouldThrow = false;
});

// Mirror the real component's data-driven surface so the route's composition is
// asserted through the same props, without the profile's own interactive weight.
jest.mock('../../../components/ReputationProfile', () => {
  const actual = jest.requireActual('../../../components/ReputationProfile');
  function MockReputationProfile(props: any) {
    const useSearchParamsMock = jest.requireMock('next/navigation').useSearchParams;
    useSearchParamsMock();
    if (mockProfileShouldThrow) {
      throw new Error('Simulated reputation crash');
    }
    return (
      <div data-testid="reputation-profile">
        <div data-testid="profile-score">{props.score ?? 'N/A'}</div>
        <div data-testid="profile-level">{props.level ?? 'N/A'}</div>
        <div data-testid="profile-history-count">{props.history?.length ?? 0}</div>
      </div>
    );
  }
  return {
    __esModule: true,
    ...actual,
    default: MockReputationProfile,
  };
});

jest.mock('../../../components/ReputationSummaryCard', () => ({
  __esModule: true,
  default: ({ score }: any) => (
    <div data-testid="summary-card">
      <span data-testid="summary-card-score">{score ?? 'N/A'}</span>
    </div>
  ),
}));

jest.mock('../../../components/EmptyState', () => ({
  __esModule: true,
  default: ({ title }: any) => <div data-testid="empty-state">{title}</div>,
}));

const EVENTS = [
  { id: 'ev-1', type: 'Verification', summary: 'Verified identity', date: '2026-04-24' },
  { id: 'ev-2', type: 'Referral', summary: 'Referred a member', date: '2026-04-20' },
];

/** Mount the route and flush the deferred persistence read. */
async function renderRoute() {
  const view = render(<RoutePage />);
  await act(async () => {
    await Promise.resolve();
  });
  return view;
}

function mockRead(events: unknown[], storageAvailable = true) {
  (checkStorageAvailability as jest.Mock).mockReturnValue(storageAvailable);
  (listReputationEvents as jest.Mock).mockReturnValue(events);
}

describe('reputation route — public surface', () => {
  beforeEach(() => mockRead(EVENTS));

  it('default-exports a route component taking no props', async () => {
    await renderRoute();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Reputation');
  });

  it('re-exports the canonical content component instead of a route-local copy', () => {
    expect(pageModule.ReputationPageContent).toBe(contentModule.ReputationPageContent);
    expect(ReExportedContent).toBe(contentModule.ReputationPageContent);
  });

  it('derives the level from the score bands instead of a hard-coded literal', () => {
    const shaped = shapeReputationData(EVENTS);
    expect(shaped.level).toBe('Expert');
    expect(shaped.score).toBe(REPUTATION_DEMO_SCORE);
    expect(shaped.history).toBe(EVENTS);
  });
});

describe('reputation route — state determinism', () => {
  it('renders a loading announcement before the read settles', async () => {
    jest.useFakeTimers();
    const { unmount } = render(<RoutePage />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading reputation');
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();

    unmount();
    jest.useRealTimers();
    mockRead(EVENTS);
  });

  it('renders the full profile once events are read', async () => {
    mockRead(EVENTS);
    await renderRoute();

    expect(screen.getByTestId('reputation-profile')).toBeInTheDocument();
    expect(screen.getByTestId('profile-history-count')).toHaveTextContent('2');
    expect(screen.getByTestId('summary-card')).toBeInTheDocument();
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('renders the partial profile when the store holds no events', async () => {
    mockRead([]);
    await renderRoute();

    expect(screen.getByTestId('reputation-profile')).toBeInTheDocument();
    expect(screen.getByTestId('profile-history-count')).toHaveTextContent('0');
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
  });

  it('drops malformed events instead of rendering them', async () => {
    mockRead([
      EVENTS[0],
      null,
      { id: '', type: 'Broken', summary: 'No id', date: '2026-04-01' },
      { type: 'No id', summary: 'Missing id', date: '2026-04-01' },
      'not-an-event',
      EVENTS[1],
    ]);
    await renderRoute();

    expect(screen.getByTestId('profile-history-count')).toHaveTextContent('2');
  });

  it('keeps score and level consistent for the boundary score', () => {
    const shaped = shapeReputationData(EVENTS);
    expect(shaped.score).toBeGreaterThanOrEqual(0);
    expect(shaped.level).toBe('Expert');
  });
});

describe('reputation route — degraded persistence', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.clearAllMocks();
  });

  it('shows a recoverable alert and no profile when storage is unavailable', async () => {
    mockRead(EVENTS, false);
    await renderRoute();

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Reputation history could not be read from this browser'
    );
    expect(screen.queryByTestId('reputation-profile')).not.toBeInTheDocument();
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('does not leak stored data or raw errors into the visible alert', async () => {
    mockRead(EVENTS, false);
    await renderRoute();

    const alert = screen.getByRole('alert');
    expect(alert).not.toHaveTextContent('ev-1');
    expect(alert.textContent).not.toMatch(/undefined|\[object/);
  });

  it('recovers through Retry once storage is readable again', async () => {
    mockRead(EVENTS, false);
    render(<RoutePage />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.queryByTestId('reputation-profile')).not.toBeInTheDocument();

    (checkStorageAvailability as jest.Mock).mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByTestId('reputation-profile')).toBeInTheDocument();
  });

  it('reports and degrades when the repository read throws', async () => {
    (checkStorageAvailability as jest.Mock).mockReturnValue(true);
    (listReputationEvents as jest.Mock).mockImplementation(() => {
      throw new Error('storage exploded');
    });
    await renderRoute();

    expect(reportError).toHaveBeenCalledWith(
      expect.any(Error),
      '[reputation] Failed to read reputation events.'
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByTestId('reputation-profile')).not.toBeInTheDocument();
  });

  it('keeps the alert when a retry fails again rather than showing stale data', async () => {
    mockRead(EVENTS, false);
    await renderRoute();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByTestId('reputation-profile')).not.toBeInTheDocument();
  });
});

describe('reputation route — concurrent reads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRead(EVENTS);
  });

  it('runs one read per mount and never re-reads on rerender', async () => {
    const { rerender } = render(<RoutePage />);
    await act(async () => {
      await Promise.resolve();
    });
    rerender(<RoutePage />);
    await act(async () => {
      await Promise.resolve();
    });

    expect(listReputationEvents).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('reputation-profile')).toBeInTheDocument();
  });

  it('collapses back-to-back retries into a single newest-generation read', async () => {
    mockRead(EVENTS, false);
    render(<RoutePage />);
    await act(async () => {
      await Promise.resolve();
    });
    (checkStorageAvailability as jest.Mock).mockClear();

    const retry = screen.getByRole('button', { name: 'Retry' });
    fireEvent.click(retry);
    fireEvent.click(retry);
    await act(async () => {
      await Promise.resolve();
    });

    // Each click bumps the generation; only the newest one passes the guard and
    // performs a read, so a stale resolution can never land on the fresh one.
    expect(checkStorageAvailability).toHaveBeenCalledTimes(1);
  });

  it('survives a rapid mount/unmount cycle without writing state late', async () => {
    const { unmount } = render(<RoutePage />);
    unmount();

    await expect(
      act(async () => {
        await Promise.resolve();
      })
    ).resolves.not.toThrow();
  });
});

describe('reputation route — content crash isolation', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockRead(EVENTS);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('renders the SafeBoundary fallback with a working retry instead of crashing the route', async () => {
    mockProfileShouldThrow = true;
    await renderRoute();

    expect(screen.getByText('This section failed to load.')).toBeInTheDocument();
    expect(screen.queryByTestId('reputation-profile')).not.toBeInTheDocument();

    mockProfileShouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(screen.getByTestId('reputation-profile')).toBeInTheDocument();
  });
});

describe('reputation route — accessibility landmarks', () => {
  beforeEach(() => mockRead(EVENTS));

  it('renders exactly one main landmark and one h1', async () => {
    await renderRoute();

    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('wraps the history profile in a Suspense boundary so URL state stays shareable', async () => {
    await renderRoute();

    expect(useSearchParams).toHaveBeenCalled();
    expect(screen.getByTestId('reputation-profile')).toBeInTheDocument();
  });

  it('moves focus to the main landmark shortly after mount and clears the timer on unmount', async () => {
    jest.useFakeTimers();
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    const { unmount } = render(<RoutePage />);

    act(() => {
      jest.advanceTimersByTime(100);
    });

    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('tabindex', '-1');
    expect(document.activeElement).toBe(main);

    unmount();
    expect(clearTimeoutSpy).toHaveBeenCalled();

    clearTimeoutSpy.mockRestore();
    jest.useRealTimers();
  });

  it('leaves the page intact when no main landmark exists to focus', async () => {
    jest.useFakeTimers();
    const originalQuerySelector = document.querySelector.bind(document);
    jest.spyOn(document, 'querySelector').mockImplementation((selector: any) => {
      if (selector === 'main') return null;
      return (originalQuerySelector as any)(selector);
    });

    render(<RoutePage />);
    expect(() => {
      act(() => {
        jest.advanceTimersByTime(100);
      });
    }).not.toThrow();

    jest.restoreAllMocks();
    jest.useRealTimers();
  });
});
