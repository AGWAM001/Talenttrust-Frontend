import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { axe } from 'jest-axe';
import ContractDetailLoading from '../loading';

describe('ContractDetailLoading concurrency invariants', () => {
  it('exposes one busy boundary and one loading announcement', () => {
    const { container } = render(<ContractDetailLoading />);

    expect(container.querySelector('main')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Loading contract…');
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(container.querySelector('[data-loading-layout="contract-detail"]')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });

  it('keeps each concurrent boundary isolated and deterministic', () => {
    const { container } = render(
      <>
        <ContractDetailLoading />
        <ContractDetailLoading />
      </>,
    );

    const boundaries = Array.from(container.querySelectorAll('main'));
    expect(boundaries).toHaveLength(2);

    for (const boundary of boundaries) {
      expect(within(boundary).getAllByRole('status')).toHaveLength(1);
      expect(
        boundary.querySelectorAll('[data-skeleton-slot^="contract-action-"]'),
      ).toHaveLength(3);
    }

    const ids = Array.from(container.querySelectorAll('[id]'), (element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('does not accumulate stale announcements across retries or completion', () => {
    const { container, rerender, unmount } = render(<ContractDetailLoading />);

    rerender(<ContractDetailLoading />);
    rerender(<ContractDetailLoading />);
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(container.querySelectorAll('[data-loading-layout="contract-detail"]')).toHaveLength(1);

    unmount();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    const retry = render(<ContractDetailLoading />);
    expect(screen.getAllByRole('status')).toHaveLength(1);
    retry.unmount();
  });

  it('renders request-independent placeholders for invalid or boundary route ids', () => {
    const { container } = render(<ContractDetailLoading />);

    expect(container).not.toHaveTextContent('undefined');
    expect(container).not.toHaveTextContent('[object Object]');
    expect(container.querySelectorAll('article')).toHaveLength(3);
    expect(container.querySelectorAll('[data-skeleton-slot^="contract-action-"]')).toHaveLength(3);
  });

  it('has no automated accessibility violations', async () => {
    const { container } = render(<ContractDetailLoading />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
