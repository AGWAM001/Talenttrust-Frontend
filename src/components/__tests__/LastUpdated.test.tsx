import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { LastUpdated, LAST_UPDATED_TICK_MS } from '../LastUpdated';

const FIXED_NOW = new Date('2026-04-20T12:00:00.000Z');

describe('LastUpdated', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders "just now" for very recent timestamps', () => {
    render(<LastUpdated updatedAt="2026-04-20T12:00:00.000Z" />);

    expect(screen.getByText('Updated just now')).toBeInTheDocument();
  });

  it('renders minutes ago', () => {
    render(<LastUpdated updatedAt="2026-04-20T11:55:00.000Z" />);

    expect(screen.getByText(/Updated .*minute.* ago/)).toBeInTheDocument();
  });

  it('renders hours ago', () => {
    render(<LastUpdated updatedAt="2026-04-20T09:00:00.000Z" />);

    expect(screen.getByText(/Updated .*hour.* ago/)).toBeInTheDocument();
  });

  it('provides accessible absolute time via sr-only span', () => {
    render(<LastUpdated updatedAt="2026-04-20T12:00:00.000Z" />);

    const srOnly = screen.getByText(/Data last updated/);
    expect(srOnly).toHaveClass('sr-only');
    expect(srOnly).toHaveTextContent('Data last updated');
  });

  it('provides absolute time via title attribute on the wrapper', () => {
    const { container } = render(<LastUpdated updatedAt="2026-04-20T12:00:00.000Z" />);

    const wrapper = container.firstElementChild;
    expect(wrapper).toHaveAttribute('title');
  });

  it('does not render sr-only span for null dates', () => {
    render(<LastUpdated updatedAt={null} />);

    expect(screen.queryByText(/Data last updated/)).not.toBeInTheDocument();
  });

  it('does not render sr-only span for undefined dates', () => {
    render(<LastUpdated updatedAt={undefined} />);

    expect(screen.queryByText(/Data last updated/)).not.toBeInTheDocument();
  });

  it('renders fallback for invalid date string', () => {
    render(<LastUpdated updatedAt="not-a-date" />);

    expect(screen.getByText(/Updated/)).toBeInTheDocument();
  });

  it('re-renders periodically to refresh relative text', () => {
    render(<LastUpdated updatedAt="2026-04-20T12:00:00.000Z" />);

    expect(screen.getByText('Updated just now')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(LAST_UPDATED_TICK_MS);
    });

    expect(screen.getByText(/Updated .*minute.* ago/)).toBeInTheDocument();
  });

  it('accepts a className prop', () => {
    const { container } = render(<LastUpdated updatedAt="2026-04-20T12:00:00.000Z" className="custom-class" />);

    const wrapper = container.firstElementChild;
    expect(wrapper).toHaveClass('custom-class');
  });

  it('handles Date object input', () => {
    render(<LastUpdated updatedAt={new Date('2026-04-20T11:55:00.000Z')} />);

    expect(screen.getByText(/Updated .*minute.* ago/)).toBeInTheDocument();
  });

  it('handles numeric timestamp input', () => {
    const fiveMinutesAgo = FIXED_NOW.getTime() - 5 * 60 * 1000;
    render(<LastUpdated updatedAt={fiveMinutesAgo} />);

    expect(screen.getByText(/Updated .*minute.* ago/)).toBeInTheDocument();
  });

  it('aria-hidden is set on the visible text', () => {
    render(<LastUpdated updatedAt="2026-04-20T12:00:00.000Z" />);

    const visible = screen.getByText(/^Updated/);
    expect(visible).toHaveAttribute('aria-hidden', 'true');
  });
});