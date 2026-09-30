import React from 'react';
import { render, screen } from '@testing-library/react';
import ReputationLoading from '../loading';
import { assertNoA11yViolations } from '@/test-utils/a11y';

describe('ReputationLoading – loading skeleton', () => {
  beforeEach(() => {
    render(<ReputationLoading />);
  });

  it('renders a <main> element with aria-busy="true"', () => {
    const mainEl = document.querySelector('main');
    expect(mainEl).toBeInTheDocument();
    expect(mainEl).toHaveAttribute('aria-busy', 'true');
  });

  it('renders an sr-only status announcement for screen readers', () => {
    const statusEl = screen.getByRole('status');
    expect(statusEl).toHaveAttribute('aria-live', 'polite');
    expect(statusEl).toHaveAttribute('aria-atomic', 'true');
    expect(statusEl.classList.contains('sr-only')).toBe(true);
    expect(statusEl).toHaveTextContent('Loading reputation…');
  });

  it('renders the page heading skeleton with aria-hidden', () => {
    const headingSkeleton = document.querySelector(
      '[class*="mb-6"][class*="h-8"][class*="w-32"]'
    );
    expect(headingSkeleton).toBeInTheDocument();
    expect(headingSkeleton).toHaveAttribute('aria-hidden', 'true');
    expect(headingSkeleton).toHaveClass('animate-shimmer');
  });

  it('renders the profile card skeleton with aria-hidden', () => {
    const profileSkeleton = document.querySelector(
      '[class*="rounded-3xl"][class*="bg-white"]'
    );
    expect(profileSkeleton).toBeInTheDocument();
    expect(profileSkeleton).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders the history card skeleton with aria-hidden', () => {
    const allHidden = document.querySelectorAll('[aria-hidden="true"]');
    expect(allHidden.length).toBeGreaterThanOrEqual(2);
  });

  it('renders three metric tiles (score, level, explanation)', () => {
    const tiles = screen.getAllByText(/Reputation score|Level|Explanation/);
    expect(tiles).toHaveLength(3);
  });

  it('renders 3 history event row skeletons inside an <ol>', () => {
    const list = document.querySelector('ol');
    expect(list).toBeInTheDocument();
    const items = list?.querySelectorAll('li');
    expect(items).toHaveLength(3);
  });

  it('all shimmer elements carry motion-reduce:animate-none', () => {
    const shimmers = document.querySelectorAll('.animate-shimmer');
    expect(shimmers.length).toBeGreaterThan(0);
    shimmers.forEach((el) => {
      expect(el.classList.contains('motion-reduce:animate-none')).toBe(true);
    });
  });

  it('does NOT render EmptyState content', () => {
    expect(screen.queryByText(/No reputation yet/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Your reputation will be built/i)
    ).not.toBeInTheDocument();
  });

  it('does NOT render reputation profile content', () => {
    expect(screen.queryByText(/Privacy-friendly defaults/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Reputation history/i)).not.toBeInTheDocument();
  });

  it('does NOT render error fallback content', () => {
    expect(screen.queryByText('This section failed to load.')).not.toBeInTheDocument();
    expect(screen.queryByText('Retry')).not.toBeInTheDocument();
    expect(screen.queryByText('Go Home')).not.toBeInTheDocument();
  });

  it('does NOT render a meter role (success/partial state indicator)', () => {
    expect(document.querySelector('[role="meter"]')).toBeNull();
  });

  it('does NOT render an alert role (error state indicator)', () => {
    expect(document.querySelector('[role="alert"]')).toBeNull();
  });
});

describe('ReputationLoading – accessibility', () => {
  it('has no axe violations', async () => {
    const { container } = render(<ReputationLoading />);
    await assertNoA11yViolations(container);
  });
});
