import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { DialogLastUpdated, DIALOG_LAST_UPDATED_TICK_MS } from './DialogLastUpdated';

const FIXED_NOW = new Date('2026-07-26T12:00:00.000Z');

describe('DialogLastUpdated', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows "just now" for a timestamp equal to the current time', () => {
    render(<DialogLastUpdated updatedAt={FIXED_NOW} />);
    expect(screen.getByText(/updated just now/i)).toBeInTheDocument();
  });

  it('shows minutes for a timestamp minutes in the past', () => {
    render(<DialogLastUpdated updatedAt={new Date(FIXED_NOW.getTime() - 5 * 60 * 1000)} />);
    expect(screen.getByText(/updated 5 minutes ago/i)).toBeInTheDocument();
  });

  it('shows hours for a timestamp hours in the past', () => {
    render(<DialogLastUpdated updatedAt={new Date(FIXED_NOW.getTime() - 3 * 60 * 60 * 1000)} />);
    expect(screen.getByText(/updated 3 hours ago/i)).toBeInTheDocument();
  });

  it('accepts an ISO string or epoch-ms number, not just a Date', () => {
    const { rerender } = render(<DialogLastUpdated updatedAt="2026-07-26T11:59:00.000Z" />);
    expect(screen.getByText(/updated 1 minute ago/i)).toBeInTheDocument();

    rerender(<DialogLastUpdated updatedAt={FIXED_NOW.getTime() - 2 * 60 * 1000} />);
    expect(screen.getByText(/updated 2 minutes ago/i)).toBeInTheDocument();
  });

  it('exposes an accessible absolute-time alternative via title and visually-hidden text', () => {
    render(<DialogLastUpdated updatedAt={FIXED_NOW} />);
    const paragraph = screen.getByText(/updated just now/i).closest('p');
    expect(paragraph).toHaveAttribute('title', FIXED_NOW.toLocaleString());
    expect(paragraph?.querySelector('.sr-only')).toHaveTextContent(FIXED_NOW.toLocaleString());
  });

  it('falls back gracefully for an invalid timestamp (no title, no sr-only text, still renders the fallback dash)', () => {
    render(<DialogLastUpdated updatedAt="not-a-date" />);
    const paragraph = screen.getByText(/updated/i).closest('p');
    expect(paragraph).not.toHaveAttribute('title');
    expect(paragraph?.querySelector('.sr-only')).not.toBeInTheDocument();
  });

  it('advances the displayed relative time as the clock ticks forward', () => {
    render(<DialogLastUpdated updatedAt={FIXED_NOW} />);
    expect(screen.getByText(/updated just now/i)).toBeInTheDocument();

    jest.setSystemTime(new Date(FIXED_NOW.getTime() + 90 * 1000));
    act(() => {
      jest.advanceTimersByTime(DIALOG_LAST_UPDATED_TICK_MS);
    });

    expect(screen.getByText(/updated 2 minutes ago/i)).toBeInTheDocument();
  });

  it('clears its refresh interval on unmount', () => {
    const clearSpy = jest.spyOn(global, 'clearInterval');
    const { unmount } = render(<DialogLastUpdated updatedAt={FIXED_NOW} />);
    unmount();
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });

  it('accepts an optional className for layout', () => {
    render(<DialogLastUpdated updatedAt={FIXED_NOW} className="mb-4" />);
    expect(screen.getByText(/updated just now/i).closest('p')).toHaveClass('mb-4');
  });
});


//  it('accepts an optional className for layout', () => {
//     render(<DialogLastUpdated updatedAt={FIXED_NOW} className="mb-4" />);
//     expect(screen.getByText(/updated just now/i).closest('p')).toHaveClass('mb-4');
//   });
// });