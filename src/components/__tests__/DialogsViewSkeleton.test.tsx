import React from 'react';
import { render, screen } from '@testing-library/react';
import { DialogsViewSkeleton } from '../dialogs/DialogsViewSkeleton';

describe('DialogsViewSkeleton', () => {
  it('renders a loading skeleton correctly', () => {
    render(<DialogsViewSkeleton />);
    
    const skeleton = screen.getByTestId('dialogs-view-skeleton');
    
    // Check accessibility attributes
    expect(skeleton).toHaveAttribute('aria-hidden', 'true');
    expect(skeleton).toHaveAttribute('aria-busy', 'true');
    
    // Check if it has the pulse animation for loading state
    expect(skeleton).toHaveClass('animate-pulse');
  });
});
