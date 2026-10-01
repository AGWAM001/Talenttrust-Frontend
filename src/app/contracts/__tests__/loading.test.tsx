import React from 'react';
import { render, screen } from '@testing-library/react';
import ContractsLoading from '../loading';

describe('ContractsLoading - Concurrency and Determinism Invariants', () => {
  it('is idempotent and can be rendered multiple times without state leakage', () => {
    const { unmount } = render(<ContractsLoading />);
    expect(screen.getAllByRole('status')).toHaveLength(1);
    unmount();

    // Render again
    const { container } = render(<ContractsLoading />);
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(container).toBeInTheDocument();
  });

  it('handles concurrent identical renders (duplicate work) gracefully', () => {
    // In React, concurrent renders of pure components should produce independent, identical output
    // without interference. We simulate this by rendering multiple instances in the same tree.
    render(
      <>
        <div data-testid="instance-1">
          <ContractsLoading />
        </div>
        <div data-testid="instance-2">
          <ContractsLoading />
        </div>
      </>
    );

    const instances1 = screen.getAllByTestId('instance-1');
    const instances2 = screen.getAllByTestId('instance-2');

    expect(instances1).toHaveLength(1);
    expect(instances2).toHaveLength(1);

    // Each instance should have exactly 5 skeleton items
    const lists = screen.getAllByRole('list', { name: 'Loading contract list' });
    expect(lists).toHaveLength(2);
    expect(lists[0].querySelectorAll('li')).toHaveLength(5);
    expect(lists[1].querySelectorAll('li')).toHaveLength(5);
  });

  it('renders a deterministic number of skeleton items regardless of timing boundaries', () => {
    render(<ContractsLoading />);
    
    const list = screen.getByRole('list', { name: 'Loading contract list' });
    expect(list.querySelectorAll('li')).toHaveLength(5);
  });
  
  it('does not produce stale or inconsistent results on rapid remounts', () => {
    const { unmount, rerender } = render(<ContractsLoading />);
    
    // Rapid remount sequence
    unmount();
    rerender(<ContractsLoading />);
    unmount();
    rerender(<ContractsLoading />);
    
    const list = screen.getByRole('list', { name: 'Loading contract list' });
    expect(list.querySelectorAll('li')).toHaveLength(5);
    expect(screen.getByRole('status', { name: 'Loading contracts…' })).toBeInTheDocument();
  });
});
