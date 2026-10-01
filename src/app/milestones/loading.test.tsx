/**
 * Route-level loading contract tests for the milestones board.
 *
 * The App Router fallback (`src/app/milestones/loading.tsx`) and the
 * client Suspense fallback must stay on the same component so their
 * geometry and assistive-technology announcement cannot drift apart. These
 * tests lock that compatibility contract down.
 */

import { render, screen } from '@testing-library/react';

import MilestonesLoading from './loading';
import MilestonesBoardSkeleton from '@/components/milestones/MilestonesBoardSkeleton';

describe('src/app/milestones/loading', () => {
  it('exports a default route-level loading component', () => {
    expect(typeof MilestonesLoading).toBe('function');
  });

  it('renders the shared milestones board skeleton without throwing', () => {
    expect(() => render(<MilestonesLoading />)).not.toThrow();
  });

  it('preserves the compatibility contract by delegating to MilestonesBoardSkeleton', () => {
    // The route fallback must not reimplement or wrap the skeleton with
    // extra markup; it must render the same component the client Suspense
    // fallback uses. Compare the rendered output against a direct render of
    // the shared skeleton to detect drift in geometry or AR announcements.
    const { container: fallbackContainer } = render(<MilestonesLoading />);
    const { container: skeletonContainer } = render(<MilestonesBoardSkeleton />);

    expect(fallbackContainer.innerHTML).toBe(skeletonContainer.innerHTML);
  });

  it('exposes a stable accessible loading status to assistive technology', () => {
    render(<MilestonesLoading />);

    // The shared skeleton is responsible for the announcement; the route
    // fallback must not suppress or duplicate it. Assert the rendered tree
    // contains a status role with a non-empty accessible name.
    const statuses = screen.queryAllBrole('status');
    expect(statuses.length).toBeGreaterThan(0);

    for (const status of statuses) {
      const name = status.getAttribute('aria-label') ?? status.textContent ?? '';
      expect(name.trim().length).toBeGreaterThan(0);
    }
  });

  it('renders deterministically across repeated mounts', () => {
    const { container: first } = render(<MilestonesLoading />);
    const { container: second } = render(<MilestonesLoading />);

    expect(first.innerHTML).toBe(second.innerHTML);
  });
});
