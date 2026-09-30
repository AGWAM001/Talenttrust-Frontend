import { render, screen, within } from '@testing-library/react';
import MilestonesBoardSkeleton from '../MilestonesBoardSkeleton';

describe('MilestonesBoardSkeleton', () => {
  it('announces one polite loading state and marks the board busy', () => {
    render(<MilestonesBoardSkeleton />);

    const board = screen.getByTestId('milestones-board-skeleton');
    expect(board).toHaveAttribute('aria-busy', 'true');
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveTextContent('Loading milestones…');
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('keeps the heading, toolbar, and list footprints in the loading DOM', () => {
    render(<MilestonesBoardSkeleton />);

    const board = screen.getByTestId('milestones-board-skeleton');
    const decorativeBlocks = within(board).getAllByRole('generic', { hidden: true });
    expect(decorativeBlocks.length).toBeGreaterThan(8);
    expect(screen.getByLabelText('Loading milestones')).toBeInTheDocument();

    const list = screen.getByLabelText('Loading milestones');
    expect(list.querySelectorAll('article')).toHaveLength(3);
    expect(list).toHaveAttribute('aria-busy', 'true');
  });

  it('hides all visual placeholders from assistive technology', () => {
    const { container } = render(<MilestonesBoardSkeleton />);

    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(1);
    expect(container.querySelector('[aria-hidden="true"] [role="status"]')).toBeNull();
  });

  it('reserves the toolbar height used by the resolved board', () => {
    const { container } = render(<MilestonesBoardSkeleton />);

    expect(container.querySelector('.min-h-\\[42px\\]')).toBeInTheDocument();
    expect(container.querySelector('.min-h-8')).toBeInTheDocument();
  });
});
