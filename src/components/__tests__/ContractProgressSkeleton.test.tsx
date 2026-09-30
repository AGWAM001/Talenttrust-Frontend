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
 * 3. Repeated rendering — every loading region keeps its accessible name
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

    it('does not reference the live heading while that heading is absent', () => {
      render(<ContractProgressSkeleton />);
      const region = screen.getByRole('region', { name: /loading escrow progress/i });
      expect(region).not.toHaveAttribute('aria-labelledby');
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

  describe('Repeated rendering', () => {
    it('does not mount a visible heading while loading', () => {
      // The skeleton does not render a heading node — the section landmark carries
      // the same id via aria-labelledby so the live heading can swap in without
      // changing the accessible name.
      render(<ContractProgressSkeleton />);
      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });

    it('keeps repeated instances independently named and busy', () => {
      render(
        <>
          <ContractProgressSkeleton />
          <ContractProgressSkeleton />
        </>,
      );

      const regions = screen.getAllByRole('region', { name: /loading escrow progress/i });
      expect(regions).toHaveLength(2);
      regions.forEach((region) => {
        expect(region).toHaveAttribute('aria-busy', 'true');
      });
    });
  });
});
