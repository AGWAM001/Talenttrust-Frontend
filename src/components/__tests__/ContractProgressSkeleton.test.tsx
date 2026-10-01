/**
 * ContractProgressSkeleton.test.tsx
 *
 * Pins the loading-state *compatibility contract* of `ContractProgressSkeleton`:
 * the fixed public surface that the live `ContractProgress` component and the
 * contract detail page callers (`app/contracts/[id]/loading.tsx` and the
 * Suspense branch in `app/contracts/[id]/page.tsx`) depend on across the
 * loading → loaded transition.
 *
 * Covered behaviours
 * ──────────────────
 * 1. Accessibility — region role, busy attribute, labelling, accname fallback
 * 2. Visual state  — `animate-pulse` class is applied; `motion-reduce:animate-none`
 *                   suppresses it for reduced-motion users
 * 3. Layout contract — the skeleton heading-id matches the live component so a
 *                     loading → loaded transition does not shift ARIA wiring
 * 4. Invariants    — no heading / progressbar / interactive element is mounted;
 *                    the component is pure static markup (deterministic render)
 * 5. Regression    — re-render produces identical DOM (StrictMode/concurrent safe)
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

    it('falls back to aria-label when the aria-labelledby target is absent', () => {
      // INV-2: while loading the referenced id does not exist in the DOM, so the
      // accessible name must fall back to aria-label (accname spec). This keeps
      // the region name stable and non-empty across the loading → loaded swap.
      render(<ContractProgressSkeleton />);
      const region = screen.getByRole('region', { name: /loading escrow progress/i });
      // If accname did not fall back, getByRole(name=...) would throw above.
      expect(region.getAttribute('aria-labelledby')).toBe('contract-progress-title');
      expect(region.getAttribute('aria-label')).toBe('Loading escrow progress');
    });
  });

  describe('Visual state', () => {
    it('applies the animate-pulse utility', () => {
      render(<ContractProgressSkeleton />);
      const region = screen.getByRole('region', { name: /loading escrow progress/i });
      // Tailwind's `animate-pulse` keyframe is what gives the skeleton its shimmer.
      expect(region.className).toContain('animate-pulse');
    });

    it('applies the motion-reduce:animate-none guard for reduced motion', () => {
      render(<ContractProgressSkeleton />);
      const region = screen.getByRole('region', { name: /loading escrow progress/i });
      // House pattern (Skeleton.tsx + local sub-skeletons in loading.tsx): belt-
      // and-suspenders alongside the global prefers-reduced-motion rule.
      expect(region.className).toContain('motion-reduce:animate-none');
    });

    it('renders placeholder blocks for the heading, progress row and fund cards', () => {
      const { container } = render(<ContractProgressSkeleton />);
      // Heading block
      expect(container.querySelector('.h-7.w-40')).toBeInTheDocument();
      // Milestone count row (two inline blocks)
      expect(container.querySelector('.h-4.w-36')).toBeInTheDocument();
      expect(container.querySelector('.h-4.w-12')).toBeInTheDocument();
      // Progress bar placeholder
      expect(container.querySelector('.h-3.w-full.rounded-full')).toBeInTheDocument();
      // Paid / Outstanding cards (emerald + amber)
      expect(container.querySelector('.bg-emerald-50')).toBeInTheDocument();
      expect(container.querySelector('.bg-amber-50')).toBeInTheDocument();
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

  describe('Invariants', () => {
    it('does not mount a progressbar role (no data is ready while loading)', () => {
      render(<ContractProgressSkeleton />);
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    it('does not mount any interactive element while loading', () => {
      const { container } = render(<ContractProgressSkeleton />);
      expect(container.querySelector('a, button, input, select, textarea')).toBeNull();
    });

    it('is deterministic: re-rendering yields identical DOM (concurrent/StrictMode safe)', () => {
      const { container: first } = render(<ContractProgressSkeleton />);
      const firstHTML = first.innerHTML;
      const { container: second } = render(<ContractProgressSkeleton />);
      expect(second.innerHTML).toBe(firstHTML);
    });
  });
});
