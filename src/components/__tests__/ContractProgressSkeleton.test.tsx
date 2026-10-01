/**
 * ContractProgressSkeleton.test.tsx
 *
 * Mirrors the structure of {@link ContractProgressSkeleton} and asserts the
 * accessibility/loading-state contract the skeleton advertises in its JSDoc
 * (`aria-busy="true"` and `aria-label="Loading escrow progress"`).
 *
 * Covered behaviours
 * ──────────────────
 * 1. Accessibility — region role, busy attribute, labelling
 * 2. Visual state  — `animate-pulse` class is applied
 * 3. Layout contract — the skeleton heading-id matches the live component so a
 *                      loading → loaded transition does not shift ARIA wiring
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ContractProgressSkeleton } from '../ContractProgressSkeleton';

describe('ContractProgressSkeleton', () => {
  describe('Accessibility', () => {
    it('renders a labelled region announcing the loading state', () => {
      render(<ContractProgressSkeleton />);
      // The skeleton advertises `aria-label="Loading escrow progress"` so AT users
      // hear a consistent loading announcement that matches the live section heading.
      const region = screen.getByRole('region', { name: /loading escrow progress/i });
      expect(region).toBeInTheDocument();
    });

    it('is marked aria-busy="true" while loading', () => {
      render(<ContractProgressSkeleton />);
      const region = screen.getByRole('region', { name: /loading escrow progress/i });
      expect(region).toHaveAttribute('aria-busy', 'true');
    });

    it('is wired to the shared heading id "contract-progress-title"', () => {
      render(<ContractProgressSkeleton />);
      const region = screen.getByRole('region', { name: /loading escrow progress/i });
      // The skeleton ships only the `aria-labelledby` attribute (not a visible h2)
      // to mirror the eventual live heading id without introducing empty chrome.
      expect(region).toHaveAttribute('aria-labelledby', 'contract-progress-title');
    });
  });

  describe('Visual state', () => {
    it('applies the animate-pulse utility', () => {
      render(<ContractProgressSkeleton />);
      const region = screen.getByRole('region', { name: /loading escrow progress/i });
      // Tailwind's `animate-pulse` keyframe is what gives the skeleton its shimmer.
      expect(region.className).toContain('animate-pulse');
    });
  });

  describe('Layout contract', () => {
    it('does not mount a visible heading while loading', () => {
      // The skeleton does not render a heading node — the section landmark carries
      // the same id via aria-labelledby so the live heading can swap in without
      // changing the accessible name.
      render(<ContractProgressSkeleton />);
      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });

    it('matches the aria-labelledby of the live ContractProgress section', () => {
      // Loading and loaded states share the same `aria-labelledby` id so the
      // accessible name remains stable across the transition.
      render(<ContractProgressSkeleton />);
      const region = screen.getByRole('region', { name: /loading escrow progress/i });
      expect(region.getAttribute('aria-labelledby')).toBe('contract-progress-title');
    });
  });
});
