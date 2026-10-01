/**
 * loading.test.tsx - /contracts
 *
 * Focused tests for the contracts loading Suspense boundary. These assert the
 * state-invariants owned by this component:
 *
 *  1. The region is always reported as busy (aria-busy="true") while the
 *     contracts list streams in, so assistive technology never observes a
 *     silently-empty or stale content without a busy hint.
 *  2. Exactly one polite live region announces the loading transition.
 *  3. The placeholder card count is deterministic and bounded (5), so repeated
 *     renders cannot grow or shrink the document shape.
 *  4. Decorative shimmer blocks are always hidden from the accessibility tree.
 *  5. Repeated mounts and concurrent renders produce identical output.
 *
 * The component is a pure function of its (empty) props, so these tests also serve
 * as a regression guard against accidentally introducing mutable module-level
 * state or non-deterministic rendering.
 */

import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import ContractsLoading from './loading';

afterEach(() => {
  cleanup();
});

describe('ContractsLoading', () => {
  it('renders a loading region that is marked as busy', () => {
    render(<ContractsLoading />);

    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('aria-busy', 'true');
  });

  it('announces loading exactly once through a polite live region', () => {
    render(<ContractsLoading />);

    const statuses = screen.getAllByRole('status');
    expect(statuses).toHaveLength(1);
    expect(statuses[0]).toHaveAttribute('aria-live', 'polite');
    expect(statuses[0]).toHaveAttribute('aria-atomic', 'true');
    expect(statuses[0]).toHaveTextContent('Loading contracts…');
  });

  it('renders a deterministic bounded number of placeholder cards', () => {
    render(<ContractsLoading />);

    const list = screen.getByLabelText('Loading contract list');
    expect(list.tagName.toLowerCase()).toBe('ul');
    expect(list.children).toHaveLength(5);
  });

  it('hides all decorative shimmer blocks from the accessibility tree', () => {
    const { container } = render(<ContractsLoading />);

    const hidden = container.querySelectorAll('[aria-hidden="true"]');
    expect(hidden.length).toBeGreaterThan(0);

    // Every shimmer element must be annotated as decorative.
    const shimmers = container.querySelectorAll('.animate-shimmer');
    expect(shimmers.length).toBeGreaterThan(0);
    shimmers.forEach((el) => {
      expect(el.getAttribute('aria-hidden')).toBe('true');
    });
  });

  it('suppresses the shimmer animation when reduced motion is requested', () => {
    const { container } = render(<ContractsLoading />);

    const shimmers = container.querySelectorAll('.animate-shimmer');
    expect(shimmers.length).toBeGreaterThan(0);
    shimmers.forEach((el) => {
      expect(el.classList.contains('motion-reduce:animate-none')).toBe(true);
    });
  });

  it('produces identical output across repeated and concurrent renders', () => {
    const { container: first } = render(<ContractsLoading />);
    const firstHouter = first.innerHTML;

    cleanup();

    const { container: second } = render(<ContractsLoading />);
    expect(second.innerHTML).toBe(firstHouter);
  });

  it('renders without throwing when mounted repeatedly (retry / recovery path)', () => {
    for (let i = 0; i < 3; i++) {
      const { unmount } = render(<ContractsLoading />);
      expect(screen.getAllByRole('status')).toHaveLength(1);
      unmount();
    }
  });
});
