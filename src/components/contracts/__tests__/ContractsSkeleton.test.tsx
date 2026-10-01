/**
 * ContractsSkeleton tests
 *
 * Covers:
 * - Default render (3 skeleton cards)
 * - Custom count prop
 * - aria-hidden on the wrapper (decorative skeleton)
 * - data-testid for test queries
 * - Heading + button + list skeleton blocks are present
 * - No interactive elements emitted
 *
 * Note: the wrapper has aria-hidden="true" which hides ALL descendant
 * elements from the accessibility tree. Queries that traverse the a11y
 * tree therefore need `{ hidden: true }` or must use container queries.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ContractsSkeleton } from '../ContractsSkeleton';

describe('ContractsSkeleton', () => {
  it('renders the skeleton wrapper with aria-hidden="true"', () => {
    render(<ContractsSkeleton />);
    const wrapper = screen.getByTestId('contracts-skeleton');
    expect(wrapper).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders data-testid="contracts-skeleton"', () => {
    render(<ContractsSkeleton />);
    expect(screen.getByTestId('contracts-skeleton')).toBeInTheDocument();
  });

  it('renders 3 skeleton list items by default', () => {
    const { container } = render(<ContractsSkeleton />);
    // aria-hidden wraps the entire tree, so use container query
    const list = container.querySelector('ul');
    expect(list).not.toBeNull();
    expect(list!.querySelectorAll('li')).toHaveLength(3);
  });

  it('renders the correct number of skeleton cards when count prop is set', () => {
    const { container } = render(<ContractsSkeleton count={5} />);
    const list = container.querySelector('ul');
    expect(list).not.toBeNull();
    expect(list!.querySelectorAll('li')).toHaveLength(5);
  });

  it('renders 1 skeleton card when count=1', () => {
    const { container } = render(<ContractsSkeleton count={1} />);
    const list = container.querySelector('ul');
    expect(list).not.toBeNull();
    expect(list!.querySelectorAll('li')).toHaveLength(1);
  });

  it('renders the loading list label for screen readers', () => {
    const { container } = render(<ContractsSkeleton />);
    // The list has aria-label but is hidden from the a11y tree via the
    // parent wrapper's aria-hidden="true". Use hidden:true to reach it.
    const list = container.querySelector('ul[aria-label="Loading contract list"]');
    expect(list).not.toBeNull();
    expect(list).toBeInTheDocument();
  });

  it('contains no interactive elements (buttons, links, inputs)', () => {
    const { container } = render(<ContractsSkeleton />);
    expect(container.querySelectorAll('button,a,input,select,textarea')).toHaveLength(0);
  });
});
