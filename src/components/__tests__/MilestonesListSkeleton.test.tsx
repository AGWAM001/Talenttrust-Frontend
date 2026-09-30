import React from 'react';
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import { MilestonesListSkeleton } from '../MilestonesListSkeleton';

describe('MilestonesListSkeleton structural/snapshot tests', () => {
  it('matches the structural snapshot for the loading state', () => {
    const { container } = render(<MilestonesListSkeleton />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders exactly three placeholder milestone cards', () => {
    const { container } = render(<MilestonesListSkeleton />);
    expect(container.querySelectorAll('article')).toHaveLength(3);
  });

  it('marks the section as busy for assistive technology while loading', () => {
    const { container } = render(<MilestonesListSkeleton />);
    const section = container.querySelector('section');
    expect(section).toHaveAttribute('aria-busy', 'true');
    expect(section).toHaveAttribute('aria-label', 'Loading milestones');
  });

  it('passes axe accessibility checks in the loading state', async () => {
    const { container } = render(<MilestonesListSkeleton />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('contains expected decorative loading structure elements', () => {
    const { container } = render(<MilestonesListSkeleton />);
    const section = container.querySelector('section');
    expect(section).toBeInTheDocument();
    expect(section?.classList.contains('animate-pulse')).toBe(true);
  });
});
